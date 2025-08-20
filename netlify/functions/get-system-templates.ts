const { Handler } = require('@netlify/functions')

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // 嘗試使用 Netlify Blobs（如果可用）
    try {
      const { getStore } = require('@netlify/blobs')
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
      
    } catch (blobsError) {
      console.warn('Netlify Blobs 不可用，使用備用方案:', blobsError.message)
      
      // 備用方案：返回成功狀態，讓前端知道使用 localStorage
      return {
        statusCode: 200,
        body: JSON.stringify({}),
        fallback: 'Using localStorage as backup storage'
      }
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
