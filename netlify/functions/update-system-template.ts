const { Handler } = require('@netlify/functions')

// 使用內存存儲作為備用方案
let memoryStorage = {}

exports.handler = async (event) => {
  // 支持 GET 和 POST 方法
  if (event.httpMethod === 'GET') {
    // GET 方法：讀取模板數據
    try {
      console.log('🔍 嘗試讀取系統模板...')
      console.log('🔍 當前內存存儲狀態:', Object.keys(memoryStorage))
      
      // 1. 優先嘗試 Netlify Blobs
      try {
        const { getStore } = require('@netlify/blobs')
        const store = getStore('system-templates')
        console.log('🔍 Netlify Blobs store 創建成功')
        
        const existing = await store.get('templates', { type: 'json' })
        console.log('🔍 從 Blobs 讀取到的原始數據:', existing)
        
        if (existing && Object.keys(existing).length > 0) {
          console.log('✅ 從 Netlify Blobs 讀取到模板:', Object.keys(existing))
          console.log('✅ 模板數據詳情:', existing)
          
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
          console.log('ℹ️ Netlify Blobs 中沒有模板數據或數據為空')
          console.log('ℹ️ existing 值:', existing)
          console.log('ℹ️ existing 類型:', typeof existing)
          console.log('ℹ️ existing 長度:', existing ? Object.keys(existing).length : 'null/undefined')
        }
      } catch (blobsError) {
        console.log('⚠️ Netlify Blobs 不可用，嘗試內存存儲:', blobsError.message)
        console.log('⚠️ Blobs 錯誤詳情:', blobsError)
      }
      
      // 2. 回退到內存存儲
      if (Object.keys(memoryStorage).length > 0) {
        console.log('✅ 從內存存儲讀取到模板:', Object.keys(memoryStorage))
        console.log('✅ 內存存儲模板詳情:', memoryStorage)
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
      console.log('ℹ️ 內存存儲狀態:', memoryStorage)
      
      // 3. 如果沒有任何模板數據，創建預設的系統模板
      console.log('🔧 創建預設系統模板...')
      const defaultTemplates = {
        'template-1': {
          id: 'template-1',
          platform: 'threads',
          title: '生活體悟模板',
          features: '分享日常生活感悟和思考的模板',
          prompt: '請分享一個今天讓你有所感悟的生活片段，可以是小事也可以是大事，重點是表達你的思考和感受。',
          updatedAt: new Date().toISOString()
        },
        'template-2': {
          id: 'template-2',
          platform: 'threads',
          title: '知識分享模板',
          features: '分享專業知識和學習心得的模板',
          prompt: '請分享一個你最近學到的新知識或技能，解釋它的重要性，以及你如何應用它。',
          updatedAt: new Date().toISOString()
        },
        'template-3': {
          id: 'template-3',
          platform: 'threads',
          title: '創意靈感模板',
          features: '激發創意和靈感的模板',
          prompt: '請分享一個讓你感到興奮的創意想法或靈感，描述它是如何產生的，以及你計劃如何實現它。',
          updatedAt: new Date().toISOString()
        },
        'template-4': {
          id: 'template-4',
          platform: 'threads',
          title: '反思總結模板',
          features: '定期反思和總結的模板',
          prompt: '請對最近一段時間的經歷進行反思總結，分享你的收穫、挑戰和成長。',
          updatedAt: new Date().toISOString()
        }
      }
      
      // 保存預設模板到內存存儲
      memoryStorage = { ...defaultTemplates }
      console.log('✅ 已創建並保存預設系統模板:', Object.keys(defaultTemplates))
      
      // 嘗試保存到 Netlify Blobs
      try {
        const { getStore } = require('@netlify/blobs')
        const store = getStore('system-templates')
        await store.set('templates', JSON.stringify(defaultTemplates))
        console.log('✅ 預設模板已保存到 Netlify Blobs')
      } catch (blobsError) {
        console.warn('⚠️ 保存預設模板到 Blobs 失敗:', blobsError.message)
      }
      
      console.log('ℹ️ 返回預設模板')
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify(defaultTemplates)
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
