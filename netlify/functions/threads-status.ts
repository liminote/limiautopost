import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async () => {
  let reasonCode: string | undefined
  let username: string | undefined
  let status: 'not_configured' | 'ready' | 'linked' | 'link_failed' = 'ready'
  const envOk = !!(process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET && process.env.THREADS_REDIRECT_URL)
  if (!envOk) status = 'not_configured'
  try {
    const store = getStore(
      process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN
        ? { name: 'threads_tokens', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN }
        : { name: 'threads_tokens' }
    )
    const listed = await store.list({ prefix: 'threads:' })
    const has = (listed?.blobs?.length || 0) > 0
    if (!has) {
      status = envOk ? 'ready' : 'not_configured'
    } else {
      const key = listed!.blobs![0].key
      const data = await store.get(key, { type: 'json' }) as { access_token?: string; username?: string } | null
      if (data?.access_token) {
        const resp = await fetch(`https://graph.threads.net/v1.0/me?fields=username&access_token=${encodeURIComponent(data.access_token)}`)
        if (resp.ok) {
          const j = await resp.json() as { username?: string }
          username = j.username
          status = 'linked'
        } else {
          // 後援：使用之前回呼時已儲存的 username
          if (data?.username) { username = data.username; status = 'linked' }
          else { status = 'link_failed'; reasonCode = 'me_fetch_failed' }
        }
      } else {
        status = 'link_failed'; reasonCode = 'missing_token'
      }
    }
  } catch (e) {
    status = 'link_failed'; reasonCode = 'store_error'
  }
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, username, reasonCode }) }
}


