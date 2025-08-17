import type { Handler } from '@netlify/functions'
import { getLatestToken } from './_tokenStore'

// GET /.netlify/functions/threads-insights?id={threads_post_id}
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' }
  const id = event.queryStringParameters?.id
  const diag = event.queryStringParameters?.diag === '1'
  if (!id) return { statusCode: 400, body: 'Missing id' }
  try {
    const latest = await getLatestToken()
    if (!latest) return { statusCode: 401, body: 'Not linked' }
    const data = latest.data as { access_token?: string }
    if (!data?.access_token) return { statusCode: 401, body: 'Missing access token' }

    const accessToken = data.access_token

    const fetchJson = async (url: string) => {
      const r = await fetch(url, { headers: { 'user-agent': 'limiautopost/insights' } })
      const j = await r.json().catch(()=> ({}))
      return { r, j }
    }

    const attempts: Array<{ edge: string; status?: number; count?: number; error?: any; mode?: 'summary' | 'manual' }> = []
    const getEdgeCount = async (edgeCandidates: string[]): Promise<number | null> => {
      for (const edge of edgeCandidates) {
        const url = `https://graph.threads.net/v1.0/${encodeURIComponent(id)}/${edge}?limit=1&summary=total_count&access_token=${encodeURIComponent(accessToken)}`
        const { r, j } = await fetchJson(url)
        // token 過期
        if (!r.ok) {
          const code = j?.error?.code
          if (code === 190) {
            return Promise.reject({ tokenExpired: true, detail: j?.error })
          }
          // 試下一個 edge 名稱
          attempts.push({ edge, status: r.status, error: j?.error || j, mode: 'summary' })
          continue
        }
        const count = Number(j?.summary?.total_count ?? j?.summary?.count ?? 0)
        attempts.push({ edge, status: r.status, count, mode: 'summary' })
        if (!isNaN(count) && count > 0) return count
        // 若 summary 得到 0，嘗試手動分頁累計
        try {
          let total = 0
          let next: string | null = `https://graph.threads.net/v1.0/${encodeURIComponent(id)}/${edge}?limit=100&access_token=${encodeURIComponent(accessToken)}`
          let guard = 0
          while (next && guard < 50) {
            guard++
            const { r: r2, j: j2 } = await fetchJson(next)
            if (!r2.ok) { attempts.push({ edge, status: r2.status, error: j2?.error || j2, mode: 'manual' }); break }
            const arr = Array.isArray(j2?.data) ? j2.data : []
            total += arr.length
            attempts.push({ edge, status: r2.status, count: arr.length, mode: 'manual' })
            next = j2?.paging?.next || null
          }
          return total
        } catch {}
      }
      return null
    }

    let likes = 0, comments = 0, shares = 0
    try {
      const lc = await getEdgeCount(['likes'])
      if (lc !== null) likes = lc
      const cc = await getEdgeCount(['replies','comments'])
      if (cc !== null) comments = cc
      const sc = await getEdgeCount(['reposts','reshares','re-shares'])
      if (sc !== null) shares = sc
    } catch (err: any) {
      if (err?.tokenExpired) {
        return {
          statusCode: 401,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'TOKEN_EXPIRED', detail: err.detail })
        }
      }
      return {
        statusCode: 502,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'UPSTREAM_ERROR', detail: err })
      }
    }

    const onlyUnsupported = attempts.length > 0 && attempts.every(a => !a.count && (a.status === 500) && (a.error?.code === 100 || a.error?.code === 10))
    if (onlyUnsupported) {
      return { statusCode: 501, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'NOT_SUPPORTED', detail: attempts }) }
    }
    const payload: any = { ok: true, id, likes, comments, shares }
    if (diag) payload.attempts = attempts
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }
  } catch (e) {
    return { statusCode: 500, body: String(e) }
  }
}


