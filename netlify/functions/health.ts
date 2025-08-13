import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async () => {
  const env = {
    appId: !!process.env.THREADS_APP_ID,
    appSecret: !!process.env.THREADS_APP_SECRET,
    redirectUrl: !!process.env.THREADS_REDIRECT_URL,
  }
  let blobsWriteable = false
  let blobsError: string | undefined
  try {
    const store = getStore(
      process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN
        ? { name: 'threads_tokens', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN }
        : { name: 'threads_tokens' }
    )
    const key = 'health:ping'
    await store.set(key, JSON.stringify({ ts: new Date().toISOString() }))
    blobsWriteable = true
  } catch (e) {
    blobsError = String(e)
  }
  const ok = env.appId && env.appSecret && env.redirectUrl && blobsWriteable
  return {
    statusCode: ok ? 200 : 503,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok, env, blobsWriteable, blobsError })
  }
}


