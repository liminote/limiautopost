import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { saveTokenForUser } from './_tokenStore'

const APP_ID = process.env.THREADS_APP_ID || ''
const APP_SECRET = process.env.THREADS_APP_SECRET || ''
const REDIRECT = process.env.THREADS_REDIRECT_URL || ''
const AUTH_HOST = 'https://graph.threads.net'

export const handler: Handler = async (event) => {
  console.log('[OAuth Callback] 開始處理回調:', {
    path: event.path,
    queryParams: event.queryStringParameters,
    headers: event.headers
  })
  
  const code = event.queryStringParameters?.code
  const state = event.queryStringParameters?.state
  
  if (!code) {
    console.error('[OAuth Callback] 缺少 code 參數')
    return { statusCode: 400, body: 'Missing code' }
  }
  
  console.log('[OAuth Callback] 收到參數:', { code: !!code, state })
  
  // 從 state 參數解析使用者資訊（如果有的話）
  let appUserEmail: string | undefined
  try {
    if (state && state.includes('user:')) {
      // 修復：正確解析 state 格式 "user:email:random"
      const parts = state.split('user:')
      if (parts.length > 1) {
        const userPart = parts[1]
        // 移除隨機數部分，只保留郵箱
        const emailPart = userPart.split(':')[0]
        if (emailPart && emailPart.includes('@')) {
          appUserEmail = emailPart
          console.log('[OAuth Callback] 從 state 解析到用戶郵箱:', appUserEmail)
        }
      }
    }
  } catch (error) {
    console.error('[OAuth Callback] 解析 state 參數失敗:', error)
  }
  
  console.log('[OAuth Callback] 處理參數完成:', { appUserEmail })
  
  try {
    console.log('[OAuth Callback] 開始交換 access token...')
    const res = await fetch(`${AUTH_HOST}/oauth/access_token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: APP_ID, client_secret: APP_SECRET, redirect_uri: REDIRECT, grant_type: 'authorization_code', code }).toString()
    })
    
    console.log('[OAuth Callback] Token 交換響應:', { status: res.status, ok: res.ok })
    
    const data = await res.json()
    console.log('[OAuth Callback] Token 響應數據:', { hasAccessToken: !!data?.access_token, userId: data?.user_id })
    
    let username: string | undefined
    try {
      if (data?.access_token) {
        console.log('[OAuth Callback] 開始獲取用戶信息...')
        const me = await fetch(`https://graph.threads.net/v1.0/me?fields=username&access_token=${encodeURIComponent(data.access_token)}`)
        if (me.ok) {
          const j = await me.json() as { username?: string }
          username = j.username
          console.log('[OAuth Callback] 獲取到用戶名:', username)
        } else {
          console.warn('[OAuth Callback] 獲取用戶信息失敗:', me.status)
        }
      }
    } catch (error) {
      console.error('[OAuth Callback] 獲取用戶信息時出錯:', error)
    }
    
    // 儲存 token（修復：使用使用者隔離的儲存方式）
    try {
      if (appUserEmail) {
        // 使用新的使用者隔離儲存方式
        const tokenData = { ...data, username, savedAt: new Date().toISOString() }
        console.log('[OAuth Callback] 儲存用戶 token:', { appUserEmail, username, userId: data.user_id })
        await saveTokenForUser(appUserEmail, tokenData)
        console.log('[OAuth Callback] 用戶 token 儲存成功')
      } else {
        // 向後相容：舊的儲存方式
        console.log('[OAuth Callback] 使用舊的儲存方式（無用戶郵箱）')
        const store = getStore(
          process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN
            ? { name: 'threads_tokens', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN }
            : { name: 'threads_tokens' }
        )
        const key = `threads:${data.user_id}`
        await store.set(key, JSON.stringify({ ...data, username, savedAt: new Date().toISOString() }))
        console.log('[OAuth Callback] 舊方式 token 儲存成功')
      }
    } catch (error) {
      console.error('[OAuth Callback] Token 儲存失敗:', error)
    }
    
    // 設置 cookie 作為前端快速檢查（7 天，加入使用者識別）
    const cookieValue = appUserEmail 
      ? `threads_linked_${appUserEmail.replace(/[^a-zA-Z0-9]/g, '_')}=1`
      : 'threads_linked=1'
    const cookie = `${cookieValue}; Path=/; Max-Age=${7*24*60*60}; SameSite=Lax; Secure; HttpOnly`
    
    // 導回追蹤列表頁面，讓用戶可以直接發佈貼文
    const redirectUrl = appUserEmail 
      ? `/tracking?threads=linked&user=${encodeURIComponent(appUserEmail)}`
      : '/tracking?threads=linked'
    
    console.log('[OAuth Callback] 準備重定向到:', redirectUrl)
      
    return { statusCode: 302, headers: { Location: redirectUrl, 'Set-Cookie': cookie }, body: '' }
  } catch (e) {
    console.error('[OAuth Callback] 處理過程中出錯:', e)
    return { statusCode: 500, body: String(e) }
  }
}



