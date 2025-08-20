const { Handler } = require('@netlify/functions')
const { getStore } = require('@netlify/blobs')

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // 使用 getStore 來讀取 Netlify Blobs
    const store = getStore('system-templates')
    
    // 從 Netlify Blobs 讀取模板資料
    let templates = {}
    try {
      const existing = await store.get('templates', { type: 'json' })
      if (existing) {
        templates = existing
        console.log(`成功讀取 ${Object.keys(templates).length} 個模板`)
      } else {
        console.log('沒有找到保存的模板資料')
      }
    } catch (error) {
      console.log('沒有現有的模板資料')
    }

    return {
      statusCode: 200,
      body: JSON.stringify(templates)
    }
  } catch (error) {
    console.error('Error getting system templates:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
