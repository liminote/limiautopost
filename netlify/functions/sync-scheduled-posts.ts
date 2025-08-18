import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { posts } = JSON.parse(event.body || '{}') as { posts: TrackedPost[] }
    
    if (!posts || !Array.isArray(posts)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid posts data' })
      }
    }

    console.log(`🔄 開始同步 ${posts.length} 個排程貼文`)
    
    const store = getStore('scheduled-posts')
    
    // 清除舊的排程貼文
    const { blobs } = await store.list()
    for (const blob of blobs) {
      if (blob.key && blob.key.includes('scheduled-')) {
        await store.delete(blob.key)
      }
    }
    
    // 儲存新的排程貼文
    const scheduledPosts = posts.filter(post => post.status === 'scheduled')
    
    if (scheduledPosts.length > 0) {
      await store.set('scheduled-posts', JSON.stringify(scheduledPosts))
      console.log(`✅ 同步完成: ${scheduledPosts.length} 個排程貼文`)
    } else {
      console.log('ℹ️ 沒有排程貼文需要同步')
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '同步完成',
        synced: scheduledPosts.length
      })
    }
  } catch (error) {
    console.error('❌ 同步排程貼文時發生錯誤:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: '同步失敗',
        details: String(error)
      })
    }
  }
}
