import type { Handler } from '@netlify/functions'
import { monitorAndRestoreAuth } from './_tokenStore'

// 模擬的資料結構（實際應該從資料庫或儲存中取得）
type TrackedPost = {
  id: string
  content: string
  scheduledAt: string
  ownerEmail: string
  status: string
  platform: string
}

export const handler: Handler = async (event) => {
  // 驗證請求來源（防止濫用）
  const authHeader = event.headers.authorization
  const schedulerSecret = process.env.SCHEDULER_SECRET || 'default-secret'
  
  if (authHeader !== `Bearer ${schedulerSecret}`) {
    console.log('未授權的排程檢查請求')
    return { 
      statusCode: 401, 
      body: JSON.stringify({ error: 'Unauthorized' }),
      headers: { 'Content-Type': 'application/json' }
    }
  }
  
  console.log('開始檢查排程貼文...')
  const now = new Date()
  
  try {
    // 從資料庫或儲存中取得所有排程貼文
    // 這裡暫時使用模擬資料，實際應該從真實儲存中讀取
    const scheduledPosts = await getScheduledPosts()
    
    console.log(`找到 ${scheduledPosts.length} 篇排程貼文`)
    
    let processedCount = 0
    let successCount = 0
    let failedCount = 0
    
    for (const post of scheduledPosts) {
      if (new Date(post.scheduledAt) <= now) {
        processedCount++
        console.log(`處理排程貼文: ${post.id}`)
        
        const result = await processScheduledPost(post)
        
        if (result.success) {
          successCount++
          console.log(`排程貼文發佈成功: ${post.id}`)
        } else {
          failedCount++
          console.error(`排程貼文發佈失敗: ${post.id}, 錯誤: ${result.error}`)
        }
      }
    }
    
    const summary = {
      processed: processedCount,
      success: successCount,
      failed: failedCount,
      timestamp: now.toISOString()
    }
    
    console.log('排程檢查完成:', summary)
    
    return { 
      statusCode: 200, 
      body: JSON.stringify(summary),
      headers: { 'Content-Type': 'application/json' }
    }
    
  } catch (error) {
    console.error('排程檢查執行失敗:', error)
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: { 'Content-Type': 'application/json' }
    }
  }
}

async function getScheduledPosts(): Promise<TrackedPost[]> {
  // 這裡應該從真實的資料儲存中讀取
  // 暫時返回空陣列，實際應該實現資料讀取邏輯
  console.log('讀取排程貼文...')
  
  // TODO: 實現從資料庫或儲存中讀取排程貼文的邏輯
  // 例如：從 Netlify Blobs、資料庫或其他儲存中讀取
  
  return []
}

async function processScheduledPost(post: TrackedPost): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`開始處理排程貼文: ${post.id}`)
    
    // 1. 檢查授權狀態
    const authStatus = await checkThreadsAuthorization(post.ownerEmail)
    
    if (!authStatus.isValid) {
      const errorMsg = 'Threads 授權已過期，請重新連結'
      console.log(`授權檢查失敗: ${errorMsg}`)
      
      // 標記為失敗並通知使用者
      await markPostAsFailed(post.id, errorMsg)
      await sendReauthNotification(post.ownerEmail, post.id)
      
      return { success: false, error: errorMsg }
    }
    
    // 2. 執行發佈
    const result = await publishToThreads(post.content, authStatus.token)
    
    if (result.success) {
      await markPostAsPublished(post.id, result.postId, result.permalink)
      return { success: true }
    } else {
      await markPostAsFailed(post.id, result.error)
      return { success: false, error: result.error }
    }
    
  } catch (error) {
    const errorMsg = `系統錯誤: ${String(error)}`
    console.error(`排程貼文處理失敗: ${post.id}`, error)
    
    await markPostAsFailed(post.id, errorMsg)
    return { success: false, error: errorMsg }
  }
}

async function checkThreadsAuthorization(ownerEmail: string): Promise<{ isValid: boolean; token?: string }> {
  try {
    // 使用新的授權監控函數
    const isValid = await monitorAndRestoreAuth(ownerEmail)
    
    if (isValid) {
      // 取得有效的 token
      const { getTokenForUser } = await import('./_tokenStore')
      const token = await getTokenForUser(ownerEmail)
      
      return {
        isValid: true,
        token: token?.data?.access_token
      }
    }
    
    return { isValid: false }
  } catch (error) {
    console.error('授權檢查失敗:', error)
    return { isValid: false }
  }
}

async function publishToThreads(content: string, accessToken: string): Promise<{ success: boolean; postId?: string; permalink?: string; error?: string }> {
  try {
    console.log('開始發佈到 Threads...')
    
    const response = await fetch('https://graph.threads.net/v1.0/me/threads', {
      method: 'POST',
      headers: { 
        'content-type': 'application/x-www-form-urlencoded', 
        'user-agent': 'limiautopost/1.0' 
      },
      body: new URLSearchParams({ 
        media_type: 'TEXT', 
        text: content, 
        access_token: accessToken 
      }).toString(),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      return { 
        success: false, 
        error: `Threads 發佈失敗: ${response.status} ${errorText}` 
      }
    }
    
    const data = await response.json() as { id?: string }
    const postId = data.id
    
    if (!postId) {
      return { 
        success: false, 
        error: 'Threads 發佈成功但未返回貼文 ID' 
      }
    }
    
    // 嘗試取得 permalink
    let permalink: string | undefined
    try {
      const infoResponse = await fetch(
        `https://graph.threads.net/v1.0/${encodeURIComponent(postId)}?fields=permalink,permalink_url,link,url&access_token=${encodeURIComponent(accessToken)}`
      )
      
      if (infoResponse.ok) {
        const infoData = await infoResponse.json() as any
        permalink = infoData.permalink || infoData.permalink_url || infoData.link || infoData.url
      }
    } catch (error) {
      console.warn('無法取得 permalink:', error)
    }
    
    return { 
      success: true, 
      postId, 
      permalink 
    }
    
  } catch (error) {
    return { 
      success: false, 
      error: `發佈異常: ${String(error)}` 
    }
  }
}

// 這些函數需要根據實際的資料儲存方式來實現
async function markPostAsFailed(postId: string, error: string): Promise<void> {
  console.log(`標記貼文為失敗: ${postId}, 錯誤: ${error}`)
  // TODO: 實現標記邏輯
}

async function markPostAsPublished(postId: string, threadsPostId: string, permalink?: string): Promise<void> {
  console.log(`標記貼文為已發佈: ${postId}, Threads ID: ${threadsPostId}`)
  // TODO: 實現標記邏輯
}

async function sendReauthNotification(ownerEmail: string, postId: string): Promise<void> {
  console.log(`發送重新授權通知: ${ownerEmail}, 貼文: ${postId}`)
  // TODO: 實現通知邏輯
}
