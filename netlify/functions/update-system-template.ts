const { Handler } = require('@netlify/functions')

// 使用內存存儲作為備用方案（在 Netlify Functions 中會重置，但至少能處理單次請求）
let memoryStorage = {}

exports.handler = async (event) => {
  // 支持 GET 和 POST 方法
  if (event.httpMethod === 'GET') {
    // GET 方法：讀取模板數據
    try {
      console.log('🔍 嘗試讀取系統模板...')
      
      // 優先嘗試 Netlify Blobs
      try {
        const { getStore } = require('@netlify/blobs')
        const store = getStore('system-templates')
        
        const existing = await store.get('templates', { type: 'json' })
        if (existing && Object.keys(existing).length > 0) {
          console.log('✅ 從 Netlify Blobs 讀取到模板:', Object.keys(existing))
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify(existing)
          }
        }
      } catch (blobsError) {
        console.log('⚠️ Netlify Blobs 不可用，嘗試內存存儲:', blobsError.message)
      }
      
      // 回退到內存存儲
      if (Object.keys(memoryStorage).length > 0) {
        console.log('✅ 從內存存儲讀取到模板:', Object.keys(memoryStorage))
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          body: JSON.stringify(memoryStorage)
        }
      }
      
      console.log('ℹ️ 沒有找到任何模板數據')
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({})
      }
      
    } catch (error) {
      console.error('❌ 讀取模板失敗:', error)
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }
  
  if (event.httpMethod === 'POST') {
    // POST 方法：更新模板數據
    try {
      const { cardId, platform, templateTitle, templateFeatures, prompt, updatedAt } = JSON.parse(event.body || '{}')
      
      console.log('💾 收到模板更新請求:', { cardId, platform, templateTitle, templateFeatures, prompt })
      
      if (!cardId || !platform || !templateTitle || !templateFeatures || !prompt) {
        console.warn('⚠️ 缺少必要字段')
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          body: JSON.stringify({ error: 'Missing required fields' })
        }
      }

      // 優先嘗試 Netlify Blobs
      try {
        const { getStore } = require('@netlify/blobs')
        const store = getStore('system-templates')
        
        // 讀取現有的模板資料
        let existingTemplates = {}
        try {
          const existing = await store.get('templates', { type: 'json' })
          if (existing) {
            existingTemplates = existing
          }
        } catch (error) {
          console.log('ℹ️ 沒有現有的模板資料，創建新的')
        }
        
        // 更新指定模板
        existingTemplates[cardId] = {
          platform,
          templateTitle,
          templateFeatures,
          prompt,
          updatedAt
        }
        
        // 儲存到 Netlify Blobs
        await store.set('templates', JSON.stringify(existingTemplates))
        
        console.log('✅ 模板已保存到 Netlify Blobs')
        
        // 同時更新內存存儲作為備用
        memoryStorage = { ...existingTemplates }
        
      } catch (blobsError) {
        console.warn('⚠️ Netlify Blobs 不可用，使用內存存儲:', blobsError.message)
        
        // 備用方案：使用內存存儲
        memoryStorage[cardId] = {
          platform,
          templateTitle,
          templateFeatures,
          prompt,
          updatedAt
        }
        
        console.log('✅ 模板已保存到內存存儲')
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'System template updated successfully',
          templateId: cardId,
          storage: Object.keys(memoryStorage).length > 0 ? 'memory' : 'blobs'
        })
      }
    } catch (error) {
      console.error('❌ 更新模板失敗:', error)
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }

  // 不支持的 HTTP 方法
  return {
    statusCode: 405,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({ error: 'Method not allowed' })
  }
}
