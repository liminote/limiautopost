import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { pruneOldTokens } from './_tokenStore'

const APP_ID = process.env.THREADS_APP_ID || ''
const APP_SECRET = process.env.THREADS_APP_SECRET || ''
const REDIRECT = process.env.THREADS_REDIRECT_URL || ''
const AUTH_HOST = 'https://graph.threads.net'

export const handler: Handler = async (event) => {
  const code = event.queryStringParameters?.code
  if (!code) return { statusCode: 400, body: 'Missing code' }
  try {
    const res = await fetch(`${AUTH_HOST}/oauth/access_token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: APP_ID, client_secret: APP_SECRET, redirect_uri: REDIRECT, grant_type: 'authorization_code', code }).toString()
    })
    const data = await res.json()
    let username: string | undefined
    try {
      if (data?.access_token) {
        const me = await fetch(`https://graph.threads.net/v1.0/me?fields=username&access_token=${encodeURIComponent(data.access_token)}`)
        if (me.ok) {
          const j = await me.json() as { username?: string }
          username = j.username
        }
      }
    } catch {}
    // 儲存 token（prototype：以 threads user_id 當 key）
    try {
      const store = getStore(
        process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN
          ? { name: 'threads_tokens', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN }
          : { name: 'threads_tokens' }
      )
      const key = `threads:${data.user_id}`
      await store.set(key, JSON.stringify({ ...data, username, savedAt: new Date().toISOString() }))
      // 清掉舊 token（僅保留最新一筆）
      try { await pruneOldTokens(1) } catch {}
    } catch {}
    // 設置 cookie 作為前端快速檢查（7 天）
    const cookie = `threads_linked=1; Path=/; Max-Age=${7*24*60*60}; SameSite=Lax; Secure; HttpOnly`
    // 導回「使用者設定」頁顯示成功（避免導去管理者設定）
    return { statusCode: 302, headers: { Location: '/settings?threads=linked', 'Set-Cookie': cookie }, body: '' }
  } catch (e) {
    return { statusCode: 500, body: String(e) }
  }
}


