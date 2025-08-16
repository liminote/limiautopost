import type { Handler } from '@netlify/functions'
import { getLatestToken } from './_tokenStore'

export const handler: Handler = async () => {
  try {
    const latest = await getLatestToken()
    if (!latest) return { statusCode: 401, body: 'Not linked' }
    const data = latest.data as { access_token?: string }
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


