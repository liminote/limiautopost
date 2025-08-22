const { Handler } = require('@netlify/functions')

// 使用內存存儲作為主要存儲方案（在函數調用間保持數據）
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

// 從內存讀取（主要存儲方案）
const readFromMemory = () => {
  try {
    console.log('🔍 從內存讀取...')
    
    if (Object.keys(memoryStorage).length > 0) {
      console.log('✅ 從內存讀取成功:', memoryStorage)
      return memoryStorage
    } else {
      console.log('ℹ️ 內存中沒有數據')
      return null
    }
    
  } catch (error) {
    console.error('❌ 內存讀取失敗:', error)
    return null
  }
}

// 保存到內存（主要存儲方案）
const saveToMemory = (templates) => {
  try {
    console.log('🔍 保存到內存...')
    
    memoryStorage = { ...templates }
    console.log('✅ 保存到內存成功')
    return true
    
  } catch (error) {
    console.error('❌ 內存保存失敗:', error)
    return false
  }
}

// 從文件系統讀取（備用存儲方案）
const readFromFileSystem = async () => {
  try {
    console.log('🔍 從文件系統讀取（備用方案）...')
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join('/tmp', 'system-templates.json')
    
    console.log('🔍 檢查文件路徑:', filePath)
    
    if (fs.existsSync(filePath)) {
      console.log('✅ 文件存在，開始讀取...')
      const data = fs.readFileSync(filePath, 'utf8')
      console.log('🔍 讀取到的原始數據:', data)
      
      const parsed = JSON.parse(data)
      console.log('✅ 文件解析成功:', parsed)
      
      console.log('📁 從文件系統讀取成功（備用）:', parsed)
      return parsed
    } else {
      console.log('ℹ️ 文件不存在:', filePath)
      return null
    }
  } catch (error) {
    console.error('❌ 文件系統讀取失敗:', error)
    console.error('❌ 錯誤詳情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return null
  }
}

// 保存到文件系統（備用存儲方案）
const saveToFileSystem = async (templates) => {
  try {
    console.log('🔍 保存到文件系統（備用方案）...')
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join('/tmp', 'system-templates.json')
    
    console.log('🔍 文件路徑:', filePath)
    console.log('🔍 準備保存的數據:', templates)
    
    const jsonData = JSON.stringify(templates, null, 2)
    console.log('🔍 JSON 字符串長度:', jsonData.length)
    
    fs.writeFileSync(filePath, jsonData)
    console.log('✅ 文件寫入成功（備用）')
    
    // 驗證寫入是否成功
    if (fs.existsSync(filePath)) {
      const fileSize = fs.statSync(filePath).size
      console.log('✅ 文件驗證成功，大小:', fileSize, 'bytes')
      return true
    } else {
      console.error('❌ 文件寫入後不存在')
      return false
    }
  } catch (error) {
    console.error('❌ 文件系統保存失敗:', error)
    console.error('❌ 錯誤詳情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return false
  }
}

// 獲取模板數據（優先使用內存，備用文件系統）
const getTemplates = async () => {
  console.log('🔍 開始獲取模板數據...')
  
  // 1. 從內存讀取（主要存儲）
  console.log('🔍 嘗試從內存讀取...')
  const memoryData = readFromMemory()
  if (memoryData) {
    console.log('✅ 從內存讀取成功（主要數據）')
    return ensureAllTemplatesExist(memoryData)
  }
  
  // 2. 從文件系統讀取（備用存儲）
  console.log('🔍 嘗試從文件系統讀取（備用）...')
  const fileData = await readFromFileSystem()
  if (fileData) {
    console.log('✅ 從文件系統讀取成功（備用數據）')
    // 將文件數據同步到內存
    saveToMemory(fileData)
    return ensureAllTemplatesExist(fileData)
  }
  
  // 3. 返回 4 個空白模板位置
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE'
    })
  }
  
  // DELETE 方法：強制清理舊數據
  if (event.httpMethod === 'DELETE') {
    try {
      console.log('🧹 開始強制清理舊數據...')
      
      // 清理文件系統
      try {
        const fs = require('fs')
        const path = require('path')
        const filePath = path.join('/tmp', 'system-templates.json')
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
          console.log('✅ 文件系統數據清理成功')
        }
      } catch (error) {
        console.warn('⚠️ 文件系統清理失敗:', error.message)
      }
      
      // 清理內存
      memoryStorage = {}
      console.log('✅ 內存數據清理成功')
      
      return createResponse(200, {
        success: true,
        message: '舊數據清理完成',
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('清理舊數據失敗:', error)
      return createResponse(500, { error: '清理失敗' })
    }
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
      let memorySuccess = false
      let fileSuccess = false
      
      // 1. 保存到內存（主要存儲）
      memorySuccess = saveToMemory(updatedTemplates)
      
      // 2. 保存到文件系統（備用存儲）
      fileSuccess = await saveToFileSystem(updatedTemplates)
      
      return createResponse(200, {
        success: true,
        message: 'Template updated successfully',
        memory: memorySuccess,
        fileSystem: fileSuccess,
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

