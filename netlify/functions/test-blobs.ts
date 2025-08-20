const { Handler } = require('@netlify/functions')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // 測試 Netlify Blobs 功能
    const { getStore } = require('@netlify/blobs')
    
    // 創建一個測試 store
    const store = getStore('test-blobs')
    
    // 寫入測試資料
    const testData = {
      message: 'Hello from Netlify Blobs!',
      timestamp: new Date().toISOString(),
      test: true
    }
    
    await store.set('test-data', JSON.stringify(testData))
    console.log('測試資料已寫入 Blobs')
    
    // 讀取測試資料
    const readData = await store.get('test-data', { type: 'json' })
    console.log('從 Blobs 讀取到資料:', readData)
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Blobs 測試成功',
        written: testData,
        read: readData
      })
    }
    
  } catch (error) {
    console.error('Blobs 測試失敗:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Blobs 測試失敗',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
