import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async () => {
  try {
    const store = getStore(
      process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN
        ? { name: 'threads_tokens', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN }
        : { name: 'threads_tokens' }
    )
    const listed = await store.list({ prefix: 'threads:' })
    for (const b of listed.blobs || []) {
      try { await store.delete(b.key) } catch {}
    }
    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        // 清除前端提示 cookie
        'Set-Cookie': 'threads_linked=0; Path=/; Max-Age=0; SameSite=Lax; Secure; HttpOnly',
      },
      body: JSON.stringify({ ok: true, removed: listed.blobs?.length || 0 })
    }
  } catch (e) {
    return { statusCode: 500, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: false, error: String(e) }) }
  }
}


