import type { Handler } from '@netlify/functions'

const APP_ID = process.env.THREADS_APP_ID || ''
const REDIRECT = process.env.THREADS_REDIRECT_URL || ''
// Authorize 應導到 www.threads.net，非 graph 網域
const AUTH_HOST = 'https://www.threads.net'

export const handler: Handler = async (event) => {
  console.log('[OAuth Start] 開始處理 OAuth 啟動:', {
    path: event.path,
    queryParams: event.queryStringParameters,
    headers: event.headers
  })
  
  if (!APP_ID || !REDIRECT) {
    console.error('[OAuth Start] 缺少環境變數:', { 
      hasAppId: !!APP_ID, 
      hasRedirect: !!REDIRECT,
      appIdLength: APP_ID.length,
      redirectLength: REDIRECT.length
    })
    return { statusCode: 500, body: 'Missing THREADS_APP_ID or THREADS_REDIRECT_URL' }
  }
  
  console.log('[OAuth Start] 環境變數檢查通過:', { 
    appIdLength: APP_ID.length, 
    redirectUrl: REDIRECT 
  })
  
  // 從 query 參數取得使用者資訊
  const userEmail = event.queryStringParameters?.user || ''
  const state = userEmail 
    ? `user:${userEmail}:${Math.random().toString(36).slice(2)}`
    : Math.random().toString(36).slice(2)
  
  console.log('[OAuth Start] 生成 state 參數:', { userEmail, state })
    
  const url = `${AUTH_HOST}/oauth/authorize?client_id=${encodeURIComponent(APP_ID)}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&scope=threads_basic,threads_content_publish&state=${encodeURIComponent(state)}`
  
  console.log('[OAuth Start] 準備重定向到 Threads:', { 
    authHost: AUTH_HOST,
    redirectUrl: url 
  })
  
  return { statusCode: 302, headers: { Location: url }, body: '' }
}


