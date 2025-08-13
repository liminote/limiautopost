// Minimal OAuth shim: start + callback storing tokens in Netlify Blobs (prototype)
import type { Handler } from '@netlify/functions'

const APP_ID = process.env.THREADS_APP_ID || ''
const APP_SECRET = process.env.THREADS_APP_SECRET || ''
const REDIRECT = process.env.THREADS_REDIRECT_URL || ''

const authHost = 'https://graph.threads.net'

export const handler: Handler = async (event) => {
  try {
    if (event.path?.endsWith('/start')) {
      const state = Math.random().toString(36).slice(2)
      const url = `${authHost}/oauth/authorize?client_id=${encodeURIComponent(APP_ID)}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&scope=threads_basic,threads_content_publish&state=${state}`
      return { statusCode: 302, headers: { Location: url }, body: '' }
    }
    if (event.path?.endsWith('/callback')) {
      const code = new URLSearchParams(event.queryStringParameters as any).get('code')
      if (!code) return { statusCode: 400, body: 'Missing code' }
      // Exchange token (placeholder: real endpoint/params per Threads docs)
      const tokenRes = await fetch(`${authHost}/oauth/access_token`, {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: APP_ID, client_secret: APP_SECRET, redirect_uri: REDIRECT, grant_type: 'authorization_code', code }).toString()
      })
      const tok = await tokenRes.json()
      // TODO: store tok securely (Netlify Blobs or KV). For prototype, echo minimal status
      return { statusCode: 200, body: JSON.stringify({ ok: true, received: Object.keys(tok) }) }
    }
    return { statusCode: 404, body: 'Not found' }
  } catch (e) {
    return { statusCode: 500, body: String(e) }
  }
}


