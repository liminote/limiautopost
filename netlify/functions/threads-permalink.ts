import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async (event) => {
  try {
    const id = event.queryStringParameters?.id
    if (!id) return { statusCode: 400, body: 'Missing id' }

    const store = getStore(
      process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN
        ? { name: 'threads_tokens', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN }
        : { name: 'threads_tokens' }
    )
    const listed = await store.list({ prefix: 'threads:' })
    if (!listed?.blobs?.length) return { statusCode: 401, body: 'Not linked' }
    const key = listed.blobs[0].key
    const data = await store.get(key, { type: 'json' }) as { access_token?: string; username?: string } | null
    if (!data?.access_token) return { statusCode: 401, body: 'Missing access token' }

    let permalink: string | undefined
    try {
      const r = await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(id)}?fields=permalink,permalink_url,link,url&access_token=${encodeURIComponent(data.access_token)}`)
      if (r.ok) {
        const j = await r.json() as any
        permalink = j.permalink || j.permalink_url || j.link || j.url
      }
    } catch {}

    if (!permalink) {
      if ((data as any)?.username) permalink = `https://www.threads.net/@${(data as any).username}/post/${id}`
      else permalink = `https://www.threads.net/t/${id}`
    }

    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, permalink }) }
  } catch (e) {
    return { statusCode: 500, body: String(e) }
  }
}


