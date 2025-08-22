const { Handler } = require('@netlify/functions')

// 簡化的內存存儲
let memoryStorage = {}

// 默認空白模板
const DEFAULT_TEMPLATES = {
  'template-1': { id: 'template-1', title: '', features: '', prompt: '', platform: 'threads', updatedAt: new Date().toISOString() },
  'template-2': { id: 'template-2', title: '', features: '', prompt: '', platform: 'threads', updatedAt: new Date().toISOString() },
  'template-3': { id: 'template-3', title: '', features: '', prompt: '', platform: 'threads', updatedAt: new Date().toISOString() },
  'template-4': { id: 'template-4', title: '', features: '', prompt: '', platform: 'threads', updatedAt: new Date().toISOString() }
}

// 統一的響應格式
const createResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers
  },
  body: JSON.stringify(body)
})

// 獲取模板數據
const getTemplates = () => {
  // 如果內存中有數據，返回內存數據
  if (Object.keys(memoryStorage).length > 0) {
    return memoryStorage
  }
  
  // 否則返回默認空白模板
  return DEFAULT_TEMPLATES
}

// 保存模板數據
const saveTemplates = (templates) => {
  memoryStorage = { ...templates }
  return true
}

exports.handler = async (event) => {
  // 處理 OPTIONS 請求
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, '', {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE'
    })
  }
  
  // DELETE 方法：清理數據
  if (event.httpMethod === 'DELETE') {
    memoryStorage = {}
    return createResponse(200, { success: true, message: '數據清理完成' })
  }
  
  // GET 方法：讀取模板
  if (event.httpMethod === 'GET') {
    const templates = getTemplates()
    return createResponse(200, templates)
  }
  
  // POST 方法：更新模板
  if (event.httpMethod === 'POST') {
    try {
      const { cardId, platform, title, features, prompt } = JSON.parse(event.body || '{}')
      
      if (!cardId) {
        return createResponse(400, { error: 'Missing cardId' })
      }
      
      // 讀取現有數據
      const existing = getTemplates()
      
      // 更新指定模板
      const updatedTemplates = {
        ...existing,
        [cardId]: {
          id: cardId,
          title: title || '',
          features: features || '',
          prompt: prompt || '',
          platform: platform || 'threads',
          updatedAt: new Date().toISOString()
        }
      }
      
      // 保存到內存
      saveTemplates(updatedTemplates)
      
      return createResponse(200, {
        success: true,
        message: 'Template updated successfully',
        template: updatedTemplates[cardId]
      })
      
    } catch (error) {
      console.error('更新模板失敗:', error)
      return createResponse(500, { error: 'Internal server error' })
    }
  }
  
  // 不支持的 HTTP 方法
  return createResponse(405, { error: 'Method not allowed' })
}

