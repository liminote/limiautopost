import type { Handler } from '@netlify/functions'

const APP_ID = process.env.THREADS_APP_ID || ''
const REDIRECT = process.env.THREADS_REDIRECT_URL || ''
const AUTH_HOST = 'https://graph.threads.net'

export const handler: Handler = async () => {
  if (!APP_ID || !REDIRECT) {
    return { statusCode: 500, body: 'Missing THREADS_APP_ID or THREADS_REDIRECT_URL' }
  }
  const state = Math.random().toString(36).slice(2)
  const url = `${AUTH_HOST}/oauth/authorize?client_id=${encodeURIComponent(APP_ID)}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&scope=threads_basic,threads_content_publish&state=${state}`
  return { statusCode: 302, headers: { Location: url }, body: '' }
}


