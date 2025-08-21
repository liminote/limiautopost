const { Handler } = require('@netlify/functions')

// 使用內存存儲作為備用方案
let memoryStorage = {}

// 創建默認模板數據
const createDefaultTemplates = () => {
  return {
    'template-1': {
      id: 'template-1',
      title: '生活體悟模板',
      features: '分享日常生活感悟和思考',
      prompt: '請根據以下主題，生成一篇生活體悟的文章：',
      platform: 'threads',
      updatedAt: new Date().toISOString()
    },
    'template-2': {
      id: 'template-2',
      title: '知識分享模板',
      features: '分享專業知識和學習心得',
      prompt: '請根據以下主題，生成一篇知識分享的文章：',
      platform: 'threads',
      updatedAt: new Date().toISOString()
    },
    'template-3': {
      id: 'template-3',
      title: '創意靈感模板',
      features: '分享創意想法和靈感來源',
      prompt: '請根據以下主題，生成一篇創意靈感的文章：',
      platform: 'threads',
      updatedAt: new Date().toISOString()
    },
    'template-4': {
      id: 'template-4',
      title: '情感表達模板',
      features: '分享情感體驗和內心感受',
      prompt: '請根據以下主題，生成一篇情感表達的文章：',
      platform: 'threads',
      updatedAt: new Date().toISOString()
    }
  }
}

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
        console.log('🔍 Netlify Blobs store 創建成功')
        
        const existing = await store.get('templates', { type: 'json' })
        console.log('🔍 從 Blobs 讀取到的原始數據:', existing)
        
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
          console.log('ℹ️ Netlify Blobs 中沒有模板數據，創建默認模板')
          
          // 創建默認模板並保存到 Blobs
          const defaultTemplates = createDefaultTemplates()
          
          try {
            await store.set('templates', defaultTemplates)
            console.log('✅ 默認模板已保存到 Blobs')
            
            // 更新內存存儲
            memoryStorage = { ...defaultTemplates }
            
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
              },
              body: JSON.stringify(defaultTemplates)
            }
          } catch (saveError) {
            console.warn('⚠️ 保存到 Blobs 失敗，使用內存存儲:', saveError.message)
            memoryStorage = { ...defaultTemplates }
            
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
              },
              body: JSON.stringify(defaultTemplates)
            }
          }
        }
      } catch (blobsError) {
        console.log('⚠️ Netlify Blobs 不可用，使用內存存儲:', blobsError.message)
        
        // 如果內存存儲有數據，使用內存存儲
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
        
        // 如果內存存儲也沒有數據，創建默認模板
        console.log('ℹ️ 內存存儲也沒有數據，創建默認模板')
        const defaultTemplates = createDefaultTemplates()
        memoryStorage = { ...defaultTemplates }
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          body: JSON.stringify(defaultTemplates)
        }
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
      
      console.log('📝 收到模板更新請求:', { cardId, platform, templateTitle, templateFeatures, prompt })
      
      if (!cardId) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          body: JSON.stringify({ error: 'Missing cardId' })
        }
      }
      
      // 構建更新的模板數據
      const updatedTemplate = {
        id: cardId,
        title: templateTitle || '',
        features: templateFeatures || '',
        prompt: prompt || '',
        platform: platform || 'threads',
        updatedAt: updatedAt || new Date().toISOString()
      }
      
      console.log('📝 更新的模板數據:', updatedTemplate)
      
      // 1. 優先保存到 Netlify Blobs
      let blobsSuccess = false
      try {
        const { getStore } = require('@netlify/blobs')
        const store = getStore('system-templates')
        
        // 先讀取現有數據
        const existing = await store.get('templates', { type: 'json' }) || {}
        console.log('📝 現有 Blobs 數據:', existing)
        
        // 更新指定模板
        const updatedTemplates = {
          ...existing,
          [cardId]: updatedTemplate
        }
        
        // 保存到 Blobs
        await store.set('templates', updatedTemplates)
        console.log('✅ 模板已保存到 Netlify Blobs')
        blobsSuccess = true
        
        // 同時更新內存存儲
        memoryStorage = { ...updatedTemplates }
        
      } catch (blobsError) {
        console.warn('⚠️ 保存到 Blobs 失敗，使用內存存儲:', blobsError.message)
        blobsSuccess = false
      }
      
      // 2. 如果 Blobs 失敗，使用內存存儲
      if (!blobsSuccess) {
        const updatedTemplates = {
          ...memoryStorage,
          [cardId]: updatedTemplate
        }
        memoryStorage = updatedTemplates
        console.log('✅ 模板已保存到內存存儲')
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'Template updated successfully',
          blobs: blobsSuccess,
          template: updatedTemplate
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
  
  // 處理 OPTIONS 請求（CORS 預檢）
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
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

