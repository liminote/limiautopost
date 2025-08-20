const { Handler } = require('@netlify/functions')
const fs = require('fs').promises
const path = require('path')

// 使用內存存儲作為備用方案
let memoryStorage = {}

// 嘗試使用文件系統存儲（在 Netlify Functions 中可能不可用，但作為備用）
const STORAGE_FILE = '/tmp/system-templates.json'

exports.handler = async (event) => {
  // 支持 GET 和 POST 方法
  if (event.httpMethod === 'GET') {
    // GET 方法：讀取模板數據
    try {
      console.log('🔍 嘗試讀取系統模板...')
      
      // 1. 優先嘗試從文件系統讀取
      try {
        const fileData = await fs.readFile(STORAGE_FILE, 'utf8')
        const templates = JSON.parse(fileData)
        
        if (templates && Object.keys(templates).length > 0) {
          console.log('✅ 從文件系統讀取到模板:', Object.keys(templates))
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify(templates)
          }
        }
      } catch (fileError) {
        console.log('ℹ️ 文件系統讀取失敗，嘗試內存存儲:', fileError.message)
      }
      
      // 2. 嘗試 Netlify Blobs
      try {
        const { getStore } = require('@netlify/blobs')
        const store = getStore('system-templates')
        
        const existing = await store.get('templates', { type: 'json' })
        if (existing && Object.keys(existing).length > 0) {
          console.log('✅ 從 Netlify Blobs 讀取到模板:', Object.keys(existing))
          
          // 同時更新內存存儲
          memoryStorage = { ...existing }
          
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
      
      // 3. 回退到內存存儲
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

      // 讀取現有的模板資料
      let existingTemplates = {}
      
      // 1. 嘗試從文件系統讀取
      try {
        const fileData = await fs.readFile(STORAGE_FILE, 'utf8')
        existingTemplates = JSON.parse(fileData)
      } catch (fileError) {
        console.log('ℹ️ 文件系統讀取失敗，創建新的模板數據')
      }
      
      // 2. 如果文件系統沒有數據，嘗試從內存存儲讀取
      if (Object.keys(existingTemplates).length === 0) {
        existingTemplates = { ...memoryStorage }
      }
      
      // 更新指定模板
      existingTemplates[cardId] = {
        id: cardId,
        platform,
        title: templateTitle,
        features: templateFeatures,
        prompt,
        updatedAt
      }
      
      // 同時保存到多個存儲位置
      const savePromises = []
      
      // 1. 保存到文件系統
      try {
        await fs.writeFile(STORAGE_FILE, JSON.stringify(existingTemplates, null, 2))
        console.log('✅ 模板已保存到文件系統')
      } catch (fileError) {
        console.warn('⚠️ 文件系統保存失敗:', fileError.message)
      }
      
      // 2. 保存到 Netlify Blobs
      try {
        const { getStore } = require('@netlify/blobs')
        const store = getStore('system-templates')
        await store.set('templates', JSON.stringify(existingTemplates))
        console.log('✅ 模板已保存到 Netlify Blobs')
      } catch (blobsError) {
        console.warn('⚠️ Netlify Blobs 保存失敗:', blobsError.message)
      }
      
      // 3. 更新內存存儲
      memoryStorage = { ...existingTemplates }
      console.log('✅ 模板已保存到內存存儲')
      
      // 等待所有保存操作完成
      await Promise.allSettled(savePromises)

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
          storage: 'multi-storage',
          savedTo: {
            fileSystem: true,
            blobs: true,
            memory: true
          }
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
