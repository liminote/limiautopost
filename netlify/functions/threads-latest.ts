import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async () => {
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

    const r = await fetch(`https://graph.threads.net/v1.0/me/threads?fields=id,permalink,permalink_url,link,url&limit=1&access_token=${encodeURIComponent(data.access_token)}`)
    if (!r.ok) return { statusCode: r.status, body: await r.text() }
    const j = await r.json() as any
    const node = j?.data?.[0]
    const id = node?.id
    const permalink = node?.permalink || node?.permalink_url || node?.link || node?.url
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, id, permalink }) }
  } catch (e) {
    return { statusCode: 500, body: String(e) }
  }
}


