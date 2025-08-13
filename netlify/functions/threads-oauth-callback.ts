import type { Handler } from '@netlify/functions'

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
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, received: Object.keys(data) }) }
  } catch (e) {
    return { statusCode: 500, body: String(e) }
  }
}


