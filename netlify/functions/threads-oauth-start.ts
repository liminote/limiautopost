import type { Handler } from '@netlify/functions'

const APP_ID = process.env.THREADS_APP_ID || ''
const REDIRECT = process.env.THREADS_REDIRECT_URL || ''
// Authorize 應導到 www.threads.net，非 graph 網域
const AUTH_HOST = 'https://www.threads.net'

export const handler: Handler = async (event) => {
  if (!APP_ID || !REDIRECT) {
    return { statusCode: 500, body: 'Missing THREADS_APP_ID or THREADS_REDIRECT_URL' }
  }
  
  // 從 query 參數取得使用者資訊
  const userEmail = event.queryStringParameters?.user || ''
  const state = userEmail 
    ? `user:${userEmail}:${Math.random().toString(36).slice(2)}`
    : Math.random().toString(36).slice(2)
    
  const url = `${AUTH_HOST}/oauth/authorize?client_id=${encodeURIComponent(APP_ID)}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&scope=threads_basic,threads_content_publish&state=${encodeURIComponent(state)}`
  return { statusCode: 302, headers: { Location: url }, body: '' }
}


