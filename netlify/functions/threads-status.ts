import type { Handler } from '@netlify/functions'
import { getLatestToken } from './_tokenStore'

export const handler: Handler = async () => {
  let reasonCode: string | undefined
  let username: string | undefined
  let status: 'not_configured' | 'ready' | 'linked' | 'link_failed' = 'ready'
  let tokenSavedAt: string | undefined
  const envOk = !!(process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET && process.env.THREADS_REDIRECT_URL)
  if (!envOk) status = 'not_configured'
  try {
    const latest = await getLatestToken()
    const has = !!latest
    if (!has) {
      status = envOk ? 'ready' : 'not_configured'
    } else {
      const data = latest!.data as { access_token?: string; username?: string; user_id?: string; savedAt?: string } | null
      tokenSavedAt = data?.savedAt
      if (data?.access_token) {
        // 先嘗試 /me
        let ok = false
        try {
          const resp = await fetch(`https://graph.threads.net/v1.0/me?fields=username&access_token=${encodeURIComponent(data.access_token)}`)
          if (resp.ok) {
            const j = await resp.json() as { username?: string }
            username = j.username
            status = 'linked'; ok = true
          }
        } catch {}
        // 後援：用 user_id 明確查詢
        if (!ok && data?.user_id) {
          try {
            const resp2 = await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(String(data.user_id))}?fields=username&access_token=${encodeURIComponent(data.access_token)}`)
            if (resp2.ok) {
              const j2 = await resp2.json() as { username?: string }
              username = j2.username
              status = 'linked'; ok = true
            }
          } catch {}
        }
        // 再後援：使用回呼時已儲存的 username
        if (!ok && data?.username) {
          username = data.username
          status = 'linked'; ok = true
        }
        // 最後：有 token 但查詢失敗，仍視為 linked（提示原因），避免 UI 阻塞
        if (!ok) { status = 'linked'; reasonCode = 'me_fetch_failed' }
      } else {
        status = 'link_failed'; reasonCode = 'missing_token'
      }
    }
  } catch (e) {
    status = 'link_failed'; reasonCode = 'store_error'
  }
  return { statusCode: 200, headers: { 'content-type': 'application/json', 'Cache-Control': 'no-store, no-cache, must-revalidate' }, body: JSON.stringify({ status, username, reasonCode, tokenSavedAt }) }
}


