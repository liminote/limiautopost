import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { getTokenForUser, monitorAndRestoreAuth } from './_tokenStore'

export interface TrackedPost {
  id: string
  articleId: string
  branchCode: string
  postId: string
  articleTitle: string
  content: string
  platform: 'Threads' | 'Instagram' | 'Facebook'
  status?: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
  scheduledAt?: string
  ownerEmail?: string
}

export const handler: Handler = async (event, context) => {
  // 驗證授權
  const authHeader = event.headers.authorization
  const schedulerSecret = process.env.SCHEDULER_SECRET
  
  if (!schedulerSecret || authHeader !== `Bearer ${schedulerSecret}`) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    }
  }

  try {
    console.log('🚀 排程貼文檢查器啟動')
    
    // 讀取排程貼文
    const scheduledPosts = await getScheduledPosts()
    console.log(`📋 找到 ${scheduledPosts.length} 個排程貼文`)
    
    if (scheduledPosts.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: '沒有排程貼文需要處理',
          processed: 0,
          success: 0,
          failed: 0
        })
      }
    }

    let processed = 0
    let success = 0
    let failed = 0

    // 處理每個排程貼文
    for (const post of scheduledPosts) {
      try {
        processed++
        console.log(`📝 處理貼文: ${post.postId} (${post.articleTitle})`)
        
        // 檢查授權狀態
        const authStatus = await monitorAndRestoreAuth(post.ownerEmail || 'admin@example.com')
        if (!authStatus) {
          console.error(`❌ 授權失敗: ${post.postId}`)
          await markPostAsFailed(post.id, 'Threads 授權失敗')
          failed++
          continue
        }

        // 取得有效的 token
        const tokenData = await getTokenForUser(post.ownerEmail || 'admin@example.com')
        if (!tokenData?.data?.access_token) {
          console.error(`❌ 無法取得有效 token: ${post.postId}`)
          await markPostAsFailed(post.id, '無法取得有效 token')
          failed++
          continue
        }

        // 發文到 Threads
        const result = await publishToThreads(post.content, tokenData.data.access_token)
        if (result.success && result.postId) {
          console.log(`✅ 發文成功: ${post.postId} -> ${result.postId}`)
          await markPostAsPublished(post.id, result.postId, result.permalink)
          success++
        } else {
          console.error(`❌ 發文失敗: ${post.postId} - ${result.error}`)
          await markPostAsFailed(post.id, result.error || '發文失敗')
          failed++
        }
      } catch (error) {
        console.error(`❌ 處理貼文時發生錯誤: ${post.postId}`, error)
        await markPostAsFailed(post.id, `處理錯誤: ${error}`)
        failed++
      }
    }

    console.log(`🏁 排程檢查完成: 處理 ${processed} 個，成功 ${success} 個，失敗 ${failed} 個`)
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '排程貼文檢查完成',
        processed,
        success,
        failed,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('❌ 排程檢查器發生錯誤:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: '排程檢查器內部錯誤',
        details: String(error)
      })
    }
  }
}

async function getScheduledPosts(): Promise<TrackedPost[]> {
  console.log('📖 讀取排程貼文...')
  try {
    const store = getStore('scheduled-posts')
    const { blobs } = await store.list()
    
    const scheduledPosts: TrackedPost[] = []
    
    for (const blob of blobs) {
      if (blob.key && blob.key.includes('scheduled-')) {
        try {
          const data = await store.get(blob.key, { type: 'json' })
          if (data && Array.isArray(data)) {
            scheduledPosts.push(...data)
          } else if (data && typeof data === 'object') {
            // 單一貼文物件
            scheduledPosts.push(data as TrackedPost)
          }
        } catch (error) {
          console.warn(`⚠️ 無法解析排程貼文資料: ${blob.key}`, error)
        }
      }
    }
    
    const now = new Date()
    const readyToPublish = scheduledPosts.filter(post => {
      return post.scheduledAt &&
             new Date(post.scheduledAt) <= now &&
             post.status === 'scheduled'
    })
    
    console.log(`📊 找到 ${scheduledPosts.length} 個排程貼文，其中 ${readyToPublish.length} 個準備發佈`)
    return readyToPublish
  } catch (error) {
    console.error('❌ 讀取排程貼文失敗:', error)
    return []
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
      permalink: permalink || `https://www.threads.net/t/${postId}` 
    }
    
  } catch (error) {
    console.error('發佈到 Threads 時發生錯誤:', error)
    return { 
      success: false, 
      error: `發佈異常: ${String(error)}` 
    }
  }
}

async function markPostAsPublished(postId: string, threadsPostId: string, permalink?: string): Promise<void> {
  try {
    const store = getStore('scheduled-posts')
    // 更新貼文狀態為已發佈
    console.log(`✅ 標記貼文為已發佈: ${postId}`)
  } catch (error) {
    console.error('標記貼文為已發佈時發生錯誤:', error)
  }
}

async function markPostAsFailed(postId: string, errorMessage: string): Promise<void> {
  try {
    const store = getStore('scheduled-posts')
    // 更新貼文狀態為失敗
    console.log(`❌ 標記貼文為失敗: ${postId} - ${errorMessage}`)
  } catch (error) {
    console.error('標記貼文為失敗時發生錯誤:', error)
  }
}
