import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async () => {
  try {
    const store = getStore({ name: 'threads_tokens' })
    const key = 'debug:ping'
    const payload = { ok: true, ts: new Date().toISOString() }
    await store.set(key, JSON.stringify(payload))
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wrote: key, payload }) }
  } catch (e) {
    return { statusCode: 500, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: String(e) }) }
  }
}


