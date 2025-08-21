const { Handler } = require('@netlify/functions')

// 使用內存存儲作為備用方案
let memoryStorage = {}

// 默認模板數據 - 只提供空白模板位置，不填充內容
const DEFAULT_TEMPLATES = {
  'template-1': {
    id: 'template-1',
    title: '',
    features: '',
    prompt: '',
    platform: 'threads',
    updatedAt: new Date().toISOString()
  },
  'template-2': {
    id: 'template-2',
    title: '',
    features: '',
    prompt: '',
    platform: 'threads',
    updatedAt: new Date().toISOString()
  },
  'template-3': {
    id: 'template-3',
    title: '',
    features: '',
    prompt: '',
    platform: 'threads',
    updatedAt: new Date().toISOString()
  },
  'template-4': {
    id: 'template-4',
    title: '',
    features: '',
    prompt: '',
    platform: 'threads',
    updatedAt: new Date().toISOString()
  }
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

// 從 Blobs 讀取模板
const readFromBlobs = async () => {
  try {
    const { getStore } = require('@netlify/blobs')
    const store = getStore('system-templates')
    const existing = await store.get('templates', { type: 'json' })
    
    if (existing && Object.keys(existing).length > 0) {
      memoryStorage = { ...existing }
      return existing
    }
    return null
  } catch (error) {
    console.warn('Blobs 讀取失敗:', error.message)
    return null
  }
}

// 保存到 Blobs
const saveToBlobs = async (templates) => {
  try {
    const { getStore } = require('@netlify/blobs')
    const store = getStore('system-templates')
    await store.set('templates', templates)
    memoryStorage = { ...templates }
    return true
  } catch (error) {
    console.warn('Blobs 保存失敗:', error.message)
    return false
  }
}

// 獲取模板數據（優先級：Blobs > 內存，補充缺失的模板位置）
const getTemplates = async () => {
  // 1. 嘗試從 Blobs 讀取
  const blobsData = await readFromBlobs()
  if (blobsData) {
    // 補充缺失的模板位置
    return ensureAllTemplatesExist(blobsData)
  }
  
  // 2. 檢查內存存儲
  if (Object.keys(memoryStorage).length > 0) {
    // 補充缺失的模板位置
    return ensureAllTemplatesExist(memoryStorage)
  }
  
  // 3. 返回 4 個空白模板位置
  return DEFAULT_TEMPLATES
}

// 確保所有 4 個模板位置都存在
const ensureAllTemplatesExist = (existingTemplates) => {
  const result = { ...existingTemplates }
  
  // 檢查並補充缺失的模板
  for (let i = 1; i <= 4; i++) {
    const templateId = `template-${i}`
    if (!result[templateId]) {
      result[templateId] = {
        id: templateId,
        title: '',
        features: '',
        prompt: '',
        platform: 'threads',
        updatedAt: new Date().toISOString()
      }
    }
  }
  
  return result
}

exports.handler = async (event) => {
  // 處理 OPTIONS 請求
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, '', {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    })
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
      const { cardId, platform, templateTitle, templateFeatures, prompt } = JSON.parse(event.body || '{}')
      
      if (!cardId) {
        return createResponse(400, { error: 'Missing cardId' })
      }
      
      // 構建更新的模板
      const updatedTemplate = {
        id: cardId,
        title: templateTitle || '',
        features: templateFeatures || '',
        prompt: prompt || '',
        platform: platform || 'threads',
        updatedAt: new Date().toISOString()
      }
      
      // 讀取現有數據並更新
      const existing = await getTemplates()
      const updatedTemplates = {
        ...existing,
        [cardId]: updatedTemplate
      }
      
      // 嘗試保存到 Blobs，失敗則使用內存
      const blobsSuccess = await saveToBlobs(updatedTemplates)
      if (!blobsSuccess) {
        memoryStorage = { ...updatedTemplates }
      }
      
      return createResponse(200, {
        success: true,
        message: 'Template updated successfully',
        blobs: blobsSuccess,
        template: updatedTemplate
      })
      
    } catch (error) {
      console.error('更新模板失敗:', error)
      return createResponse(500, { error: 'Internal server error' })
    }
  }
  
  // 不支持的 HTTP 方法
  return createResponse(405, { error: 'Method not allowed' })
}

