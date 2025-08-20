const { Handler } = require('@netlify/functions')
const { getStore } = require('@netlify/blobs')

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

    // 使用 getStore 來儲存到 Netlify Blobs
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

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'System template updated successfully' 
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
