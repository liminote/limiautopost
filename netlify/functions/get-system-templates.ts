import { Handler } from '@netlify/functions'
import { list, get } from '@netlify/blobs'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // 列出所有系統模板
    const { blobs } = await list('system-templates')
    
    if (blobs.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({})
      }
    }

    // 讀取所有模板資料
    const templates: Record<string, any> = {}
    
    for (const blob of blobs) {
      try {
        const templateData = await get('system-templates', blob.key, { type: 'json' })
        if (templateData) {
          templates[blob.key] = templateData
        }
      } catch (error) {
        console.warn(`Failed to read template ${blob.key}:`, error)
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(templates)
    }
  } catch (error) {
    console.error('Error getting system templates:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
