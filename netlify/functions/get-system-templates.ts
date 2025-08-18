import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    console.log('📖 讀取系統模板...')
    
    const store = getStore('system-templates')
    
    // 從 Netlify Blobs 讀取模板資料
    let templates = {}
    try {
      const existing = await store.get('templates', { type: 'json' })
      if (existing) {
        templates = existing
        console.log(`✅ 成功讀取 ${Object.keys(templates).length} 個模板`)
      } else {
        console.log('ℹ️ 沒有找到保存的模板資料')
      }
    } catch (error) {
      console.log('沒有現有的模板資料')
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(templates),
      headers: {
        'Content-Type': 'application/json'
      }
    }
  } catch (error) {
    console.error('❌ 讀取系統模板時發生錯誤:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: '讀取失敗',
        details: String(error)
      })
    }
  }
}
