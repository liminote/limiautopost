const { Handler } = require('@netlify/functions')

// 使用內存存儲作為備用方案
let memoryStorage = {}

exports.handler = async (event) => {
  // 支持 GET 和 POST 方法
  if (event.httpMethod === 'GET') {
    // GET 方法：讀取模板數據
    try {
      console.log('🔍 嘗試讀取系統模板...')
      
      // 1. 優先嘗試 Netlify Blobs
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
        } else {
          console.log('ℹ️ Netlify Blobs 中沒有模板數據')
        }
      } catch (blobsError) {
        console.log('⚠️ Netlify Blobs 不可用，嘗試內存存儲:', blobsError.message)
      }
      
      // 2. 回退到內存存儲
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
      
      // 1. 嘗試從 Netlify Blobs 讀取
      try {
        const { getStore } = require('@netlify/blobs')
        const store = getStore('system-templates')
        
        try {
          const existing = await store.get('templates', { type: 'json' })
          if (existing) {
            existingTemplates = existing
            console.log('✅ 從 Netlify Blobs 讀取到現有模板:', Object.keys(existingTemplates))
          }
        } catch (error) {
          console.log('ℹ️ 沒有現有的模板資料，創建新的')
        }
      } catch (blobsError) {
        console.warn('⚠️ Netlify Blobs 不可用:', blobsError.message)
      }
      
      // 2. 如果 Blobs 沒有數據，從內存存儲讀取
      if (Object.keys(existingTemplates).length === 0) {
        existingTemplates = { ...memoryStorage }
        console.log('ℹ️ 從內存存儲讀取到現有模板:', Object.keys(existingTemplates))
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
      
      console.log('📝 更新後的模板數據:', existingTemplates)
      
      // 同時保存到多個存儲位置
      const saveResults = {
        blobs: false,
        memory: true
      }
      
      // 1. 保存到 Netlify Blobs
      try {
        const { getStore } = require('@netlify/blobs')
        const store = getStore('system-templates')
        await store.set('templates', JSON.stringify(existingTemplates))
        console.log('✅ 模板已保存到 Netlify Blobs')
        saveResults.blobs = true
      } catch (blobsError) {
        console.warn('⚠️ Netlify Blobs 保存失敗:', blobsError.message)
      }
      
      // 2. 更新內存存儲
      memoryStorage = { ...existingTemplates }
      console.log('✅ 模板已保存到內存存儲')
      
      // 3. 驗證保存結果
      console.log('💾 保存結果:', saveResults)
      console.log('💾 內存存儲當前狀態:', Object.keys(memoryStorage))

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
          storage: saveResults.blobs ? 'blobs+memory' : 'memory',
          savedTo: saveResults,
          currentTemplates: Object.keys(existingTemplates)
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
