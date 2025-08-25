import type { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  const envOk = !!(process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET && process.env.THREADS_REDIRECT_URL)
  
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        threads: {
          appId: !!process.env.THREADS_APP_ID,
          appSecret: !!process.env.THREADS_APP_SECRET,
          redirectUrl: !!process.env.THREADS_REDIRECT_URL,
          allConfigured: envOk
        }
      },
      oauth: {
        startUrl: `/.netlify/functions/threads-oauth-start?user=test@example.com`,
        callbackUrl: process.env.THREADS_REDIRECT_URL || 'NOT_SET',
        authHost: 'https://www.threads.net'
      }
    })
  }
}


