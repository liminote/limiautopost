import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  try {
    const body = (() => {
      try { return JSON.parse(event.body || '{}') as { text?: string } } catch { return {} }
    })()
    const text = (body.text || '').trim()
    if (!text) return { statusCode: 400, body: 'Missing text' }

    const store = getStore(
      process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN
        ? { name: 'threads_tokens', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN }
        : { name: 'threads_tokens' }
    )
    const listed = await store.list({ prefix: 'threads:' })
    if (!listed?.blobs?.length) return { statusCode: 401, body: 'Not linked' }
    const key = listed.blobs[0].key
    const data = await store.get(key, { type: 'json' }) as { access_token?: string; user_id?: string } | null
    if (!data?.access_token) return { statusCode: 401, body: 'Missing access token' }

    // Minimal publish call. Threads Graph API expects x-www-form-urlencoded
    const resp = await fetch('https://graph.threads.net/v1.0/me/threads', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text, access_token: data.access_token }).toString(),
    })
    if (!resp.ok) {
      const txt = await resp.text()
      return { statusCode: 502, body: `Threads publish failed: ${resp.status} ${txt}` }
    }
    const j = await resp.json() as { id?: string }
    let permalink: string | undefined
    // 嘗試查詢貼文資訊以取得連結（欄位名稱以盡最大可能覆蓋）
    if (j.id && data.access_token) {
      try {
        const info = await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(j.id)}?fields=permalink,permalink_url,link,url&access_token=${encodeURIComponent(data.access_token)}`)
        if (info.ok) {
          const d = await info.json() as any
          permalink = d.permalink || d.permalink_url || d.link || d.url
        }
      } catch {}
    }
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, id: j.id, permalink }) }
  } catch (e) {
    return { statusCode: 500, body: String(e) }
  }
}


