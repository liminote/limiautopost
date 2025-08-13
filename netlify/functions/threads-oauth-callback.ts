import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

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
    // 儲存 token（prototype：以 threads user_id 當 key）
    try {
      const store = getStore({ name: 'threads_tokens' })
      const key = `threads:${data.user_id}`
      await store.set(key, JSON.stringify({ ...data, savedAt: new Date().toISOString() }))
    } catch {}
    // 設置 cookie 作為前端快速檢查（7 天）
    const cookie = `threads_linked=1; Path=/; Max-Age=${7*24*60*60}; SameSite=Lax; Secure; HttpOnly`
    // 導回設定頁顯示成功
    return { statusCode: 302, headers: { Location: '/admin/settings?threads=linked', 'Set-Cookie': cookie }, body: '' }
  } catch (e) {
    return { statusCode: 500, body: String(e) }
  }
}


