import { getStore } from '@netlify/blobs'

export type TokenData = {
  access_token: string
  refresh_token?: string  // 新增：refresh token
  user_id?: string | number
  username?: string
  expires_in?: number
  token_type?: string
  savedAt?: string
  expiresAt?: string      // 新增：計算出的過期時間
  // 新增：關聯到哪個應用程式使用者
  app_user_email?: string
}

export async function getTokenStore() {
  return getStore(
    process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN
      ? { name: 'threads_tokens', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN }
      : { name: 'threads_tokens' }
  )
}

// 修復：根據應用程式使用者取得對應的 Threads token
export async function getTokenForUser(appUserEmail: string): Promise<{ key: string; data: TokenData } | null> {
  const store = await getTokenStore()
  const listed = await store.list({ prefix: `threads:user:${appUserEmail}:` })
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

// 保留舊函數以維持向後相容性，但標記為過時
export async function getLatestToken(): Promise<{ key: string; data: TokenData } | null> {
  console.warn('getLatestToken() is deprecated. Use getTokenForUser() instead.')
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

// 新增：儲存特定使用者的 token
export async function saveTokenForUser(appUserEmail: string, tokenData: TokenData): Promise<void> {
  const store = await getTokenStore()
  
  // 計算過期時間（如果有 expires_in）
  let expiresAt = tokenData.expiresAt
  if (tokenData.expires_in && !expiresAt) {
    const expiresDate = new Date(Date.now() + (tokenData.expires_in * 1000))
    expiresAt = expiresDate.toISOString()
  }
  
  const enhancedTokenData = {
    ...tokenData,
    expiresAt,
    savedAt: new Date().toISOString()
  }
  
  const key = `threads:user:${appUserEmail}:${tokenData.user_id}`
  const dataWithUser = { ...enhancedTokenData, app_user_email: appUserEmail }
  await store.set(key, JSON.stringify(dataWithUser))
}

// 新增：刪除特定使用者的 token
export async function deleteTokenForUser(appUserEmail: string): Promise<boolean> {
  const store = await getTokenStore()
  const listed = await store.list({ prefix: `threads:user:${appUserEmail}:` })
  const blobs = listed?.blobs || []
  
  let deleted = 0
  for (const b of blobs) {
    try {
      await store.delete(b.key)
      deleted++
    } catch {}
  }
  
  return deleted > 0
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

// 新增：檢查 token 是否即將過期
export async function isTokenExpiringSoon(appUserEmail: string, bufferMinutes: number = 60): Promise<boolean> {
  const token = await getTokenForUser(appUserEmail)
  if (!token?.data?.expiresAt) return false
  
  const now = new Date()
  const expiresAt = new Date(token.data.expiresAt)
  const bufferMs = bufferMinutes * 60 * 1000
  
  return now.getTime() + bufferMs > expiresAt.getTime()
}

// 新增：使用 refresh_token 自動刷新
export async function refreshAccessToken(appUserEmail: string): Promise<boolean> {
  const token = await getTokenForUser(appUserEmail)
  if (!token?.data?.refresh_token) {
    console.log(`用戶 ${appUserEmail} 沒有 refresh_token`)
    return false
  }
  
  try {
    console.log(`嘗試刷新用戶 ${appUserEmail} 的 access_token...`)
    
    const response = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.data.refresh_token,
        client_id: process.env.THREADS_APP_ID!,
        client_secret: process.env.THREADS_APP_SECRET!
      })
    })
    
    if (response.ok) {
      const newTokenData = await response.json()
      console.log(`用戶 ${appUserEmail} 的 token 刷新成功`)
      
      // 儲存新的 token
      await saveTokenForUser(appUserEmail, newTokenData)
      return true
    } else {
      const errorText = await response.text()
      console.error(`Token 刷新失敗，HTTP ${response.status}: ${errorText}`)
    }
  } catch (error) {
    console.error('Token 刷新異常:', error)
  }
  
  return false
}

// 新增：監控並嘗試恢復授權狀態
export async function monitorAndRestoreAuth(appUserEmail: string): Promise<boolean> {
  const token = await getTokenForUser(appUserEmail)
  
  if (!token) {
    console.log(`用戶 ${appUserEmail} 沒有 Threads 授權`)
    return false
  }
  
  const now = new Date()
  const expiresAt = new Date(token.data.expiresAt || '0')
  
  // 如果沒有過期時間，假設 token 有效
  if (!token.data.expiresAt) {
    console.log(`用戶 ${appUserEmail} 的 token 沒有過期時間，假設有效`)
    return true
  }
  
  // 如果 token 即將過期（提前 1 小時檢查）
  if (now.getTime() + (60 * 60 * 1000) > expiresAt.getTime()) {
    console.log(`用戶 ${appUserEmail} 的 token 即將過期，嘗試刷新...`)
    
    // 嘗試使用 refresh_token 刷新
    const refreshed = await refreshAccessToken(appUserEmail)
    
    if (refreshed) {
      console.log(`用戶 ${appUserEmail} 的 token 刷新成功`)
      return true
    } else {
      console.log(`用戶 ${appUserEmail} 的 token 刷新失敗，需要重新授權`)
      return false
    }
  }
  
  return true
}


