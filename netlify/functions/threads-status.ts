import type { Handler } from '@netlify/functions'
import { getTokenForUser, getLatestToken } from './_tokenStore'

export const handler: Handler = async (event) => {
  let reasonCode: string | undefined
  let username: string | undefined
  let status: 'not_configured' | 'ready' | 'linked' | 'link_failed' = 'ready'
  let tokenSavedAt: string | undefined
  
  // 從 query 參數或 cookie 取得使用者資訊
  const userEmail = event.queryStringParameters?.user || ''
  const cookieLinked = userEmail 
    ? (event.headers?.cookie || '').includes(`threads_linked_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}=1`)
    : (event.headers?.cookie || '').includes('threads_linked=1')
    
  const envOk = !!(process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET && process.env.THREADS_REDIRECT_URL)
  if (!envOk) status = 'not_configured'
  
  try {
    let latest: { key: string; data: any } | null = null
    
    if (userEmail) {
      // 使用新的使用者隔離方式
      console.log('檢查用戶 Threads 狀態:', userEmail)
      latest = await getTokenForUser(userEmail)
      console.log('用戶 token 查詢結果:', { hasToken: !!latest, key: latest?.key })
    } else {
      // 向後相容：舊的全域方式
      console.log('使用舊的全域方式檢查狀態')
      latest = await getLatestToken()
    }
    
    const has = !!latest
    if (!has) {
      status = envOk ? 'ready' : 'not_configured'
      console.log('無 token，狀態設為:', status)
    } else {
      const data = latest!.data as { access_token?: string; username?: string; user_id?: string; savedAt?: string } | null
      tokenSavedAt = data?.savedAt
      console.log('Token 數據:', { hasAccessToken: !!data?.access_token, hasUsername: !!data?.username, userId: data?.user_id })
      
      if (data?.access_token) {
        // 先嘗試 /me
        let ok = false
        try {
          console.log('嘗試 /me 端點取得 username...')
          const resp = await fetch(`https://graph.threads.net/v1.0/me?fields=username&access_token=${encodeURIComponent(data.access_token)}`)
          if (resp.ok) {
            const j = await resp.json() as { username?: string }
            username = j.username
            status = 'linked'; ok = true
            console.log('/me 端點成功，username:', username)
          } else {
            console.log('/me 端點失敗，狀態碼:', resp.status)
          }
        } catch (error) {
          console.log('/me 端點異常:', error)
        }
        
        // 後援：用 user_id 明確查詢
        if (!ok && data?.user_id) {
          try {
            console.log('嘗試用 user_id 查詢 username...')
            const resp2 = await fetch(`https://graph.threads.net/v1.0/${encodeURIComponent(String(data.user_id))}?fields=username&access_token=${encodeURIComponent(data.access_token)}`)
            if (resp2.ok) {
              const j2 = await resp2.json() as { username?: string }
              username = j2.username
              status = 'linked'; ok = true
              console.log('user_id 查詢成功，username:', username)
            } else {
              console.log('user_id 查詢失敗，狀態碼:', resp2.status)
            }
          } catch (error) {
            console.log('user_id 查詢異常:', error)
          }
        }
        
        // 再後援：使用回呼時已儲存的 username
        if (!ok && data?.username) {
          username = data.username
          status = 'linked'; ok = true
          console.log('使用已儲存的 username:', username)
        }
        
        // 最後：有 token 但查詢失敗，仍視為 linked（提示原因），避免 UI 阻塞
        if (!ok) { 
          status = 'linked'; 
          reasonCode = 'me_fetch_failed'
          console.log('所有查詢方式都失敗，設為 linked 但無 username')
        }
      } else {
        status = 'link_failed'; reasonCode = 'missing_token'
        console.log('缺少 access_token')
      }
    }
  } catch (e) {
    status = 'link_failed'; reasonCode = 'store_error'
    console.error('狀態檢查異常:', e)
  }
  
  // 若沒有 token 但剛授權完（cookie 還在），仍視為 linked，避免 UI 假性斷開
  if ((status === 'ready' || status === 'link_failed') && cookieLinked) status = 'linked'
  
  const result = { status, username, reasonCode, tokenSavedAt, userEmail }
  console.log('最終狀態檢查結果:', result)
  
  return { 
    statusCode: 200, 
    headers: { 
      'content-type': 'application/json', 
      'Cache-Control': 'no-store, no-cache, must-revalidate' 
    }, 
    body: JSON.stringify(result) 
  }
}


