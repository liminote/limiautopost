import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { saveTokenForUser } from './_tokenStore'

const APP_ID = process.env.THREADS_APP_ID || ''
const APP_SECRET = process.env.THREADS_APP_SECRET || ''
const REDIRECT = process.env.THREADS_REDIRECT_URL || ''
const AUTH_HOST = 'https://graph.threads.net'

export const handler: Handler = async (event) => {
  const code = event.queryStringParameters?.code
  const state = event.queryStringParameters?.state // 新增：使用 state 參數傳遞使用者資訊
  
  if (!code) return { statusCode: 400, body: 'Missing code' }
  
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
          console.log('從 state 解析到用戶郵箱:', appUserEmail)
        }
      }
    }
  } catch (error) {
    console.error('解析 state 參數失敗:', error)
  }
  
  console.log('OAuth 回調處理:', { code: !!code, state, appUserEmail })
  
  try {
    // 1. 交換 access token
    const res = await fetch(`${AUTH_HOST}/oauth/access_token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 
        client_id: APP_ID, 
        client_secret: APP_SECRET, 
        redirect_uri: REDIRECT, 
        grant_type: 'authorization_code', 
        code 
      }).toString()
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('OAuth token 交換失敗:', res.status, errorText)
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'OAuth token exchange failed', 
          details: errorText 
        })
      }
    }
    
    const data = await res.json()
    console.log('OAuth token 交換成功，收到數據:', Object.keys(data))
    
    // 2. 驗證 token 並獲取用戶信息
    let username: string | undefined
    let userId: string | undefined
    
    try {
      if (data?.access_token) {
        // 使用 /me 端點驗證 token 並獲取用戶信息
        const me = await fetch(`${AUTH_HOST}/v1.0/me?fields=id,username&access_token=${encodeURIComponent(data.access_token)}`)
        
        if (me.ok) {
          const userInfo = await me.json() as { id?: string; username?: string }
          username = userInfo.username
          userId = userInfo.id
          console.log('用戶信息獲取成功:', { username, userId })
        } else {
          const errorText = await me.text()
          console.error('獲取用戶信息失敗:', me.status, errorText)
        }
      }
    } catch (error) {
      console.error('驗證 token 時發生錯誤:', error)
    }
    
    // 3. 儲存 token（使用使用者隔離的儲存方式）
    try {
      if (appUserEmail) {
        // 計算 token 過期時間（如果沒有提供，假設 60 天後過期）
        const expiresAt = data.expires_in 
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
        
        const tokenData = { 
          ...data, 
          username, 
          user_id: userId,
          expiresAt,
          savedAt: new Date().toISOString() 
        }
        
        console.log('儲存用戶 token:', { 
          appUserEmail, 
          username, 
          userId, 
          expiresAt,
          hasRefreshToken: !!data.refresh_token 
        })
        
        await saveTokenForUser(appUserEmail, tokenData)
        console.log('用戶 token 儲存成功')
        
        // 4. 設置 cookie 作為前端快速檢查
        const cookieValue = `threads_linked_${appUserEmail.replace(/[^a-zA-Z0-9]/g, '_')}=1`
        const cookie = `${cookieValue}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`
        
        // 5. 重定向到成功頁面
        return {
          statusCode: 302,
          headers: {
            'Location': `/?threads=linked&user=${encodeURIComponent(appUserEmail)}&username=${encodeURIComponent(username || '')}`,
            'Set-Cookie': cookie
          },
          body: ''
        }
      } else {
        console.error('無法識別用戶郵箱，無法保存 token')
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'User email not identified', 
            details: 'Cannot save token without user email' 
          })
        }
      }
    } catch (error) {
      console.error('Token 儲存失敗:', error)
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Token storage failed', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }
    
  } catch (error) {
    console.error('OAuth 回調處理失敗:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'OAuth callback processing failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }
}


