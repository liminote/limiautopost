import { getStore } from '@netlify/blobs'

export type TokenData = {
  access_token?: string
  user_id?: string | number
  username?: string
  expires_in?: number
  token_type?: string
  savedAt?: string
}

export async function getTokenStore() {
  return getStore(
    process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN
      ? { name: 'threads_tokens', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN }
      : { name: 'threads_tokens' }
  )
}

export async function getLatestToken(): Promise<{ key: string; data: TokenData } | null> {
  const store = await getTokenStore()
  const listed = await store.list({ prefix: 'threads:' })
  const blobs = listed?.blobs || []
  if (!blobs.length) return null
  const items: Array<{ key: string; data: TokenData; ts: number }> = []
  for (const b of blobs) {
    try {
      const data = await store.get(b.key, { type: 'json' }) as TokenData | null
      if (!data) continue
      const ts = Date.parse(data.savedAt || b.uploadedAt || '') || 0
      items.push({ key: b.key, data, ts })
    } catch {}
  }
  if (!items.length) return null
  items.sort((a,b)=> b.ts - a.ts)
  return { key: items[0].key, data: items[0].data }
}

export async function pruneOldTokens(keep: number = 1): Promise<number> {
  const store = await getTokenStore()
  const listed = await store.list({ prefix: 'threads:' })
  const blobs = listed?.blobs || []
  if (blobs.length <= keep) return 0
  // 依 savedAt 或 uploadedAt 排序
  const items: Array<{ key: string; ts: number }> = []
  for (const b of blobs) {
    try {
      const data = await store.get(b.key, { type: 'json' }) as TokenData | null
      const ts = Date.parse(data?.savedAt || b.uploadedAt || '') || 0
      items.push({ key: b.key, ts })
    } catch {
      items.push({ key: b.key, ts: 0 })
    }
  }
  items.sort((a,b)=> b.ts - a.ts)
  let removed = 0
  for (const it of items.slice(keep)) {
    try { await store.delete(it.key); removed++ } catch {}
  }
  return removed
}


