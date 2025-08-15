import type { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  try {
    const body = (() => {
      try { return JSON.parse(event.body || '{}') as { text?: string } } catch { return {} }
    })()
    const text = (body.text || '').trim()
    if (!text) return { statusCode: 400, body: 'Missing text' }

    const store = getStore(
      process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN
        ? { name: 'threads_tokens', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN }
        : { name: 'threads_tokens' }
    )
    const listed = await store.list({ prefix: 'threads:' })
    if (!listed?.blobs?.length) return { statusCode: 401, body: 'Not linked' }
    const key = listed.blobs[0].key
    const data = await store.get(key, { type: 'json' }) as { access_token?: string; user_id?: string } | null
    if (!data?.access_token) return { statusCode: 401, body: 'Missing access token' }

    // Minimal publish call. Threads Graph API expects x-www-form-urlencoded
    const resp = await fetch('https://graph.threads.net/v1.0/me/threads', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      // Threads 需要指定 media_type，文字貼文用 TEXT
      body: new URLSearchParams({ media_type: 'TEXT', text, access_token: data.access_token }).toString(),
    })
    if (!resp.ok) {
      const txt = await resp.text()
      return { statusCode: 502, body: `Threads publish failed: ${resp.status} ${txt}` }
    }
    const j = await resp.json() as { id?: string }
    let postId: string | undefined = j.id
    // 有些平台需要「先建置容器再 publish」。嘗試補 publish 流程。
    if (postId && data.access_token) {
      try {
        const pub1 = await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(postId)}/publish`, {
          method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ access_token: data.access_token }).toString()
        })
        if (pub1.ok) {
          const p = await pub1.json() as { id?: string }
          if (p?.id) postId = p.id
        } else {
          // 後援：以 creation_id 方式 publish（類似 IG Graph API）
          const pub2 = await fetch('https://graph.threads.net/v1.0/me/threads_publish', {
            method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ creation_id: postId, access_token: data.access_token }).toString()
          })
          if (pub2.ok) {
            const p2 = await pub2.json() as { id?: string }
            if (p2?.id) postId = p2.id
          }
        }
      } catch {}
    }

    let permalink: string | undefined
    let confirmed = false
    if (postId && data.access_token) {
      try {
        const info = await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(postId)}?fields=permalink,permalink_url,link,url&access_token=${encodeURIComponent(data.access_token)}`)
        if (info.ok) {
          const d = await info.json() as any
          permalink = d.permalink || d.permalink_url || d.link || d.url
          confirmed = true
        }
      } catch {}
    }
    // 若 API 無法直接給 permalink，嘗試以已存的 username 推導（備援）
    if (!confirmed && postId) {
      // 次要驗證：讀最新一篇，若與 postId 相符則視為已上架
      try {
        const latest = await fetch(`https://graph.threads.net/v1.0/me/threads?fields=id,permalink,permalink_url,link,url&limit=1&access_token=${encodeURIComponent(data.access_token)}`)
        if (latest.ok) {
          const lj = await latest.json() as any
          const node = lj?.data?.[0]
          if (node?.id && String(node.id) === String(postId)) {
            permalink = node.permalink || node.permalink_url || node.link || node.url || permalink
            confirmed = true
          }
        }
      } catch {}
    }

    if (!permalink && postId) {
      try {
        const store = getStore(
          process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN
            ? { name: 'threads_tokens', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN }
            : { name: 'threads_tokens' }
        )
        const listed = await store.list({ prefix: 'threads:' })
        const key = listed?.blobs?.[0]?.key
        if (key) {
          const tok = await store.get(key, { type: 'json' }) as { username?: string } | null
          if (tok?.username) {
            permalink = `https://www.threads.net/@${tok.username}/post/${postId}`
          } else {
            permalink = `https://www.threads.net/t/${postId}`
          }
        }
      } catch {}
    }

    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, id: postId, permalink, confirmed }) }
  } catch (e) {
    return { statusCode: 500, body: String(e) }
  }
}


