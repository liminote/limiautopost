import { Handler } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

export interface SystemTemplateUpdate {
  cardId: string
  platform: 'threads' | 'instagram' | 'facebook' | 'general'
  templateTitle: string
  templateFeatures: string
  prompt: string
  updatedAt: string
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const templateData = JSON.parse(event.body || '{}') as SystemTemplateUpdate
    
    if (!templateData.cardId || !templateData.platform || !templateData.templateTitle) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    console.log(`🔄 更新系統模板: ${templateData.cardId}`)
    
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
    existingTemplates[templateData.cardId] = {
      platform: templateData.platform,
      templateTitle: templateData.templateTitle,
      templateFeatures: templateData.templateFeatures,
      prompt: templateData.prompt,
      updatedAt: templateData.updatedAt
    }
    
    // 儲存到 Netlify Blobs
    await store.set('templates', JSON.stringify(existingTemplates))
    
    console.log(`✅ 系統模板更新成功: ${templateData.cardId}`)
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '模板更新成功',
        cardId: templateData.cardId
      })
    }
  } catch (error) {
    console.error('❌ 更新系統模板時發生錯誤:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: '更新失敗',
        details: String(error)
      })
    }
  }
}
