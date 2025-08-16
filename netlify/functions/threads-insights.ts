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

    const fields = [
      'like_count',
      'comments_count',
      'reply_count',
      'repost_count',
      'reshare_count',
      'save_count',
    ].join(',')

    const resp = await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(id)}?fields=${fields}&access_token=${encodeURIComponent(data.access_token)}`)
    const j = await resp.json().catch(()=> ({})) as any
    if (!resp.ok) {
      const code = j?.error?.code
      if (code === 190) {
        return {
          statusCode: 401,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'TOKEN_EXPIRED', detail: j?.error })
        }
      }
      return {
        statusCode: 502,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'UPSTREAM_ERROR', status: resp.status, detail: j })
      }
    }

    const likes = Number(j.like_count ?? j.likes ?? 0)
    const comments = Number(j.comments_count ?? j.reply_count ?? j.replies_count ?? 0)
    const shares = Number(j.repost_count ?? j.reshare_count ?? j.reposts_count ?? 0)
    const saves = Number(j.save_count ?? j.saves_count ?? 0)

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, id, likes, comments, shares, saves })
    }
  } catch (e) {
    return { statusCode: 500, body: String(e) }
  }
}


