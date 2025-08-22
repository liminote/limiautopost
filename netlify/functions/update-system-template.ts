const { Handler } = require('@netlify/functions')
const { getStore } = require('@netlify/blobs')

// 獲取 Blobs store
const store = getStore('system-templates')

// 內存緩存（提升性能）
let memoryCache = null

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

// 從 Blobs 讀取數據
const readFromBlobs = async () => {
  try {
    const data = await store.get('templates')
    if (data) {
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('從 Blobs 讀取失敗:', error)
  }
  return null
}

// 保存數據到 Blobs
const saveToBlobs = async (data) => {
  try {
    await store.set('templates', JSON.stringify(data))
    return true
  } catch (error) {
    console.error('保存到 Blobs 失敗:', error)
    return false
  }
}

// 獲取模板數據（優先使用緩存，備用 Blobs）
const getTemplates = async () => {
  // 1. 檢查內存緩存
  if (memoryCache) {
    return memoryCache
  }
  
  // 2. 從 Blobs 讀取
  const blobData = await readFromBlobs()
  if (blobData && Object.keys(blobData).length > 0) {
    memoryCache = blobData
    return blobData
  }
  
  // 3. 返回默認模板
  return DEFAULT_TEMPLATES
}

// 保存模板數據（同時更新緩存和 Blobs）
const saveTemplates = async (templates) => {
  // 更新內存緩存
  memoryCache = { ...templates }
  
  // 保存到 Blobs
  return await saveToBlobs(templates)
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
    memoryCache = null
    try {
      await store.delete('templates')
    } catch (error) {
      console.error('刪除 Blobs 失敗:', error)
    }
    return createResponse(200, { success: true, message: '數據清理完成' })
  }
  
  // GET 方法：讀取模板
  if (event.httpMethod === 'GET') {
    try {
      const templates = await getTemplates()
      return createResponse(200, templates)
    } catch (error) {
      console.error('讀取模板失敗:', error)
      return createResponse(500, { error: 'Internal server error' })
    }
  }
  
  // POST 方法：更新模板
  if (event.httpMethod === 'POST') {
    try {
      const { cardId, platform, title, features, prompt } = JSON.parse(event.body || '{}')
      
      if (!cardId) {
        return createResponse(400, { error: 'Missing cardId' })
      }
      
      // 讀取現有數據
      const existing = await getTemplates()
      
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
      
      // 保存數據
      const saveSuccess = await saveTemplates(updatedTemplates)
      
      return createResponse(200, {
        success: true,
        message: 'Template updated successfully',
        template: updatedTemplates[cardId],
        saved: saveSuccess
      })
      
    } catch (error) {
      console.error('更新模板失敗:', error)
      return createResponse(500, { error: 'Internal server error' })
    }
  }
  
  // 不支持的 HTTP 方法
  return createResponse(405, { error: 'Method not allowed' })
}

