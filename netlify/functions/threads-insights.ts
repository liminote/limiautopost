import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

// GET /.netlify/functions/threads-insights?id={threads_post_id}
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' }
  const id = event.queryStringParameters?.id
  if (!id) return { statusCode: 400, body: 'Missing id' }
  try {
    const store = getStore(
      process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN
        ? { name: 'threads_tokens', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN }
        : { name: 'threads_tokens' }
    )
    const listed = await store.list({ prefix: 'threads:' })
    if (!listed?.blobs?.length) return { statusCode: 401, body: 'Not linked' }
    const key = listed.blobs[0].key
    const data = await store.get(key, { type: 'json' }) as { access_token?: string } | null
    if (!data?.access_token) return { statusCode: 401, body: 'Missing access token' }

    const accessToken = data.access_token

    const fetchJson = async (url: string) => {
      const r = await fetch(url, { headers: { 'user-agent': 'limiautopost/insights' } })
      const j = await r.json().catch(()=> ({}))
      return { r, j }
    }

    const getEdgeCount = async (edgeCandidates: string[]): Promise<number | null> => {
      for (const edge of edgeCandidates) {
        const url = `https://graph.threads.net/v1.0/${encodeURIComponent(id)}/${edge}?limit=0&summary=true&access_token=${encodeURIComponent(accessToken)}`
        const { r, j } = await fetchJson(url)
        // token 過期
        if (!r.ok) {
          const code = j?.error?.code
          if (code === 190) {
            return Promise.reject({ tokenExpired: true, detail: j?.error })
          }
          // 試下一個 edge 名稱
          continue
        }
        const count = Number(j?.summary?.total_count ?? 0)
        return isNaN(count) ? 0 : count
      }
      return null
    }

    let likes = 0, comments = 0, shares = 0, saves = 0
    try {
      const lc = await getEdgeCount(['likes'])
      if (lc !== null) likes = lc
      const cc = await getEdgeCount(['replies','comments'])
      if (cc !== null) comments = cc
      const sc = await getEdgeCount(['reposts','reshares','re-shares'])
      if (sc !== null) shares = sc
      const svc = await getEdgeCount(['saves','bookmarks'])
      if (svc !== null) saves = svc
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

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, id, likes, comments, shares, saves })
    }
  } catch (e) {
    return { statusCode: 500, body: String(e) }
  }
}


