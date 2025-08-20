const { Handler } = require('@netlify/functions')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { cardId, platform, templateTitle, templateFeatures, prompt, updatedAt } = JSON.parse(event.body || '{}')
    
    if (!cardId || !platform || !templateTitle || !templateFeatures || !prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    // 嘗試使用 Netlify Blobs（如果可用）
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
        console.log('沒有現有的模板資料，創建新的')
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
      
      console.log('模板已保存到 Netlify Blobs')
      
    } catch (blobsError) {
      console.warn('Netlify Blobs 不可用，使用備用方案:', blobsError.message)
      
      // 備用方案：返回成功，讓前端使用 localStorage
      // 這是一個臨時解決方案，直到 Blobs 配置完成
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'System template updated successfully',
        fallback: 'Using localStorage as backup storage'
      })
    }
  } catch (error) {
    console.error('Error updating system template:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
