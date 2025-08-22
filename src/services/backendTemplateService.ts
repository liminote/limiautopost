// 後端模板服務 - 完全替代 localStorage 存儲
export interface BackendSystemTemplate {
  id: string
  platform: 'threads' | 'instagram' | 'facebook' | 'general'
  title: string
  features: string
  prompt: string
  updatedAt: string
  updatedBy: string
}

export class BackendTemplateService {
  private static instance: BackendTemplateService
  private baseUrl = '/.netlify/functions'
  
  private constructor() {}
  
  public static getInstance(): BackendTemplateService {
    if (!BackendTemplateService.instance) {
      BackendTemplateService.instance = new BackendTemplateService()
    }
    return BackendTemplateService.instance
  }
  
  // 從後端獲取系統模板
  public async getSystemTemplates(): Promise<BackendSystemTemplate[]> {
    try {
      console.log('[BackendTemplateService] 從後端獲取系統模板...')
      
      const response = await fetch(`${this.baseUrl}/update-system-template`, {
        method: 'GET'
      })
      
      if (response.ok) {
        const templates = await response.json()
        const templateArray = Object.values(templates).map(template => ({
          ...template as any,
          updatedBy: 'system'
        })) as BackendSystemTemplate[]
        
        console.log(`[BackendTemplateService] 成功獲取 ${templateArray.length} 個系統模板`)
        return templateArray
      } else {
        console.warn('[BackendTemplateService] 後端 API 回應錯誤:', response.status)
        throw new Error(`API error: ${response.status}`)
      }
    } catch (error) {
      console.error('[BackendTemplateService] 獲取系統模板失敗:', error)
      throw error
    }
  }
  
  // 更新系統模板到後端
  public async updateSystemTemplate(
    id: string, 
    updates: Partial<BackendSystemTemplate>,
    updatedBy: string = 'admin'
  ): Promise<BackendSystemTemplate> {
    try {
      console.log(`[BackendTemplateService] 更新系統模板: ${id}`)
      
      const response = await fetch(`${this.baseUrl}/update-system-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cardId: id,
          platform: updates.platform || 'threads',
          title: updates.title || '',
          features: updates.features || '',
          prompt: updates.prompt || ''
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('[BackendTemplateService] 系統模板更新成功')
        return {
          id: result.template.id,
          platform: result.template.platform,
          title: result.template.title,
          features: result.template.features,
          prompt: result.template.prompt,
          updatedAt: result.template.updatedAt,
          updatedBy: updatedBy
        }
      } else {
        console.warn('[BackendTemplateService] 更新系統模板失敗:', response.status)
        throw new Error(`Update failed: ${response.status}`)
      }
    } catch (error) {
      console.error('[BackendTemplateService] 更新系統模板失敗:', error)
      throw error
    }
  }
  
  // 同步系統模板（觸發所有客戶端更新）
  public async syncSystemTemplates(): Promise<void> {
    try {
      console.log('[BackendTemplateService] 同步系統模板...')
      
      const response = await fetch(`${this.baseUrl}/sync-system-templates`)
      
      if (response.ok) {
        console.log('[BackendTemplateService] 系統模板同步成功')
      } else {
        console.warn('[BackendTemplateService] 同步系統模板失敗:', response.status)
      }
    } catch (error) {
      console.error('[BackendTemplateService] 同步系統模板失敗:', error)
    }
  }
  
  // 檢查後端服務是否可用
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/update-system-template`, {
        method: 'GET'
      })
      return response.ok
    } catch (error) {
      console.warn('[BackendTemplateService] 後端服務不可用:', error)
      return false
    }
  }
}
