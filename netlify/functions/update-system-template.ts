const { Handler } = require('@netlify/functions')
const fs = require('fs')
const path = require('path')

// 使用 Netlify Functions 的持久化路徑
const STORAGE_FILE = '/tmp/system-templates.json'

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

// 從文件讀取數據
const readFromFile = () => {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('讀取文件失敗:', error)
  }
  return null
}

// 保存數據到文件
const saveToFile = (data) => {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('保存文件失敗:', error)
    return false
  }
}

// 獲取模板數據（優先使用緩存，備用文件系統）
const getTemplates = () => {
  // 1. 檢查內存緩存
  if (memoryCache) {
    return memoryCache
  }
  
  // 2. 從文件讀取
  const fileData = readFromFile()
  if (fileData && Object.keys(fileData).length > 0) {
    memoryCache = fileData
    return fileData
  }
  
  // 3. 返回默認模板
  return DEFAULT_TEMPLATES
}

// 保存模板數據（同時更新緩存和文件）
const saveTemplates = (templates) => {
  // 更新內存緩存
  memoryCache = { ...templates }
  
  // 保存到文件
  return saveToFile(templates)
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
      if (fs.existsSync(STORAGE_FILE)) {
        fs.unlinkSync(STORAGE_FILE)
      }
    } catch (error) {
      console.error('刪除文件失敗:', error)
    }
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
      
      // 保存數據
      const saveSuccess = saveTemplates(updatedTemplates)
      
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

