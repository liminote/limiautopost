import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async (event) => {
  try {
    const store = getStore(
      process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN
        ? { name: 'threads_tokens', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN }
        : { name: 'threads_tokens' }
    )
    // 粗略檢查：只要有任何以 threads: 為前綴的 token 即視為已連結
    const listed = await store.list({ prefix: 'threads:' })
    const linked = (listed?.blobs?.length || 0) > 0
    // 也允許從 cookie 判斷（授權剛結束時）
    const cookieLinked = (event.headers?.cookie || '').includes('threads_linked=1')
    let username: string | undefined
    try {
      if (linked) {
        const first = listed!.blobs![0]
        const key = first.key
        // 以 JSON 方式讀取（避免 ArrayBuffer 需手動轉型）
        const data = await store.get(key, { type: 'json' }) as { user_id?: string; access_token?: string } | null
        if (data?.user_id && data?.access_token) {
          const resp = await fetch(`https://graph.threads.net/v1.0/${data.user_id}?fields=username&access_token=${encodeURIComponent(data.access_token)}`)
          if (resp.ok) {
            const j = await resp.json() as { username?: string }
            username = j.username
          }
        }
      }
    } catch {}
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ linked: linked || cookieLinked, count: listed?.blobs?.length || 0, username }) }
  } catch (e) {
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ linked: false }) }
  }
}


