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
    
    console.log('🔍 Blobs 讀取結果:', existing)
    console.log('🔍 existing 類型:', typeof existing)
    console.log('🔍 existing 是否為 null:', existing === null)
    console.log('🔍 existing 是否為 undefined:', existing === undefined)
    
    if (existing !== null && existing !== undefined) {
      console.log('✅ Blobs 讀取成功，數據:', existing)
      memoryStorage = { ...existing }
      return existing
    } else {
      console.log('ℹ️ Blobs 中沒有數據')
      return null
    }
  } catch (error) {
    console.warn('⚠️ Blobs 讀取失敗:', error.message)
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
    console.log('✅ Blobs 保存成功')
    return true
  } catch (error) {
    console.warn('⚠️ Blobs 保存失敗:', error.message)
    // 即使 Blobs 失敗，也要保存到內存
    memoryStorage = { ...templates }
    return false
  }
}

// 從文件系統讀取（備用方案）
const readFromFileSystem = async () => {
  try {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join('/tmp', 'system-templates.json')
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(data)
      console.log('📁 從文件系統讀取成功:', parsed)
      return parsed
    }
  } catch (error) {
    console.warn('⚠️ 文件系統讀取失敗:', error.message)
  }
  return null
}

// 保存到文件系統（備用方案）
const saveToFileSystem = async (templates) => {
  try {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join('/tmp', 'system-templates.json')
    
    fs.writeFileSync(filePath, JSON.stringify(templates, null, 2))
    console.log('📁 保存到文件系統成功')
    return true
  } catch (error) {
    console.warn('⚠️ 文件系統保存失敗:', error.message)
    return false
  }
}

// 獲取模板數據（優先級：Blobs > 文件系統 > 內存，補充缺失的模板位置）
const getTemplates = async () => {
  // 1. 嘗試從 Blobs 讀取
  const blobsData = await readFromBlobs()
  if (blobsData) {
    console.log('✅ 從 Blobs 讀取成功')
    return ensureAllTemplatesExist(blobsData)
  }
  
  // 2. 嘗試從文件系統讀取
  const fileData = await readFromFileSystem()
  if (fileData) {
    console.log('✅ 從文件系統讀取成功')
    return ensureAllTemplatesExist(fileData)
  }
  
  // 3. 檢查內存存儲
  if (Object.keys(memoryStorage).length > 0) {
    console.log('✅ 從內存讀取成功')
    return ensureAllTemplatesExist(memoryStorage)
  }
  
  // 4. 返回 4 個空白模板位置
  console.log('ℹ️ 使用預設空白模板')
  return DEFAULT_TEMPLATES
}

// 確保所有 4 個模板位置都存在，但不覆蓋已有內容
const ensureAllTemplatesExist = (existingTemplates) => {
  const result = { ...existingTemplates }
  
  // 檢查並補充缺失的模板
  for (let i = 1; i <= 4; i++) {
    const templateId = `template-${i}`
    if (!result[templateId]) {
      // 只創建真正缺失的模板
      result[templateId] = {
        id: templateId,
        title: '',
        features: '',
        prompt: '',
        platform: 'threads',
        updatedAt: new Date().toISOString()
      }
    }
    // 如果模板已存在，保留其所有內容，不做任何修改
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
      const { cardId, platform, title, features, prompt } = JSON.parse(event.body || '{}')
      
      if (!cardId) {
        return createResponse(400, { error: 'Missing cardId' })
      }
      
      // 構建更新的模板 - 統一使用 title/features/prompt 格式
      const updatedTemplate = {
        id: cardId,
        title: title || '',           // 使用 title
        features: features || '',     // 使用 features
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
      
      // 多層保存策略，確保數據不丟失
      let blobsSuccess = false
      let fileSuccess = false
      
      // 1. 嘗試保存到 Blobs
      blobsSuccess = await saveToBlobs(updatedTemplates)
      
      // 2. 即使 Blobs 失敗，也要保存到文件系統
      if (!blobsSuccess) {
        fileSuccess = await saveToFileSystem(updatedTemplates)
      }
      
      // 3. 最後保存到內存（作為最後備用）
      memoryStorage = { ...updatedTemplates }
      
      return createResponse(200, {
        success: true,
        message: 'Template updated successfully',
        blobs: blobsSuccess,
        fileSystem: fileSuccess,
        memory: true,
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

