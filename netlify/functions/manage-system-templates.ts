import type { Handler } from '@netlify/functions'

// 系統模板數據結構
interface SystemTemplate {
  id: string
  platform: 'threads' | 'instagram' | 'facebook' | 'general'
  title: string
  features: string
  prompt: string
  updatedAt: string
  updatedBy: string
}

// 內存存儲（在生產環境中應該使用真正的數據庫）
let systemTemplates: Record<string, SystemTemplate> = {
  'template-1': {
    id: 'template-1',
    platform: 'threads',
    title: 'AA',
    features: '基本功能',
    prompt: '基本提示詞',
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin'
  },
  'template-2': {
    id: 'template-2',
    platform: 'threads',
    title: 'VV',
    features: '進階功能',
    prompt: '進階提示詞',
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin'
  },
  'template-3': {
    id: 'template-3',
    platform: 'threads',
    title: '！！！！！',
    features: '特殊功能',
    prompt: '特殊提示詞',
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin'
  },
  'template-4': {
    id: 'template-4',
    platform: 'threads',
    title: 'TTT',
    features: '測試功能',
    prompt: '測試提示詞',
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin'
  }
}

export const handler: Handler = async (event) => {
  try {
    const { method, path } = event
    
    // 處理不同的 API 端點
    if (path.endsWith('/get-system-templates')) {
      return await handleGetTemplates()
    } else if (path.endsWith('/update-system-template')) {
      return await handleUpdateTemplate(event)
    } else if (path.endsWith('/sync-system-templates')) {
      return await handleSyncTemplates()
    }
    
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'API endpoint not found' })
    }
  } catch (error) {
    console.error('API error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// 獲取系統模板
async function handleGetTemplates() {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify(systemTemplates)
  }
}

// 更新系統模板
async function handleUpdateTemplate(event: any) {
  try {
    const body = JSON.parse(event.body || '{}')
    const { id, updates, updatedBy } = body
    
    if (!id || !updates) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }
    
    // 更新模板
    if (systemTemplates[id]) {
      systemTemplates[id] = {
        ...systemTemplates[id],
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy || 'admin'
      }
      
      console.log(`[API] 系統模板已更新: ${id}`)
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Template updated successfully',
          template: systemTemplates[id]
        })
      }
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Template not found' })
      }
    }
  } catch (error) {
    console.error('Update template error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update template' })
    }
  }
}

// 同步系統模板（觸發所有客戶端更新）
async function handleSyncTemplates() {
  try {
    // 這裡可以添加真正的數據庫同步邏輯
    console.log('[API] 系統模板同步完成')
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Templates synchronized successfully',
        count: Object.keys(systemTemplates).length
      })
    }
  } catch (error) {
    console.error('Sync templates error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to sync templates' })
    }
  }
}
