import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async (event) => {
  try {
    const store = getStore({ name: 'threads_tokens' })
    // 粗略檢查：只要有任何以 threads: 為前綴的 token 即視為已連結
    const listed = await store.list({ prefix: 'threads:' })
    const linked = (listed?.blobs?.length || 0) > 0
    // 也允許從 cookie 判斷（授權剛結束時）
    const cookieLinked = (event.headers?.cookie || '').includes('threads_linked=1')
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ linked: linked || cookieLinked, count: listed?.blobs?.length || 0 }) }
  } catch (e) {
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ linked: false }) }
  }
}


