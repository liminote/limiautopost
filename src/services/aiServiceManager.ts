import { geminiService } from './geminiService'
import { chatgptService } from './chatgptService'

export type AIModel = 'gemini' | 'chatgpt'

export interface AIService {
  isAvailable(): boolean
  getServiceName(): string
  getModelName(): string
  testConnection(): Promise<{ success: boolean; message: string }>
  generatePostFromTemplate(template: string, articleContent: string, maxWords?: number): Promise<{ success: boolean; content?: string; error?: string }>
}

export class AIServiceManager {
  private services: Map<AIModel, AIService> = new Map()

  constructor() {
    this.services.set('gemini', geminiService)
    this.services.set('chatgpt', chatgptService)
  }

  // 獲取可用的 AI 服務列表
  getAvailableServices(): Array<{ model: AIModel; service: AIService }> {
    return Array.from(this.services.entries())
      .filter(([_, service]) => service.isAvailable())
      .map(([model, service]) => ({ model, service }))
  }

  // 獲取指定的 AI 服務
  getService(model: AIModel): AIService | null {
    const service = this.services.get(model)
    return service && service.isAvailable() ? service : null
  }

  // 獲取預設服務（優先使用 Gemini，如果不可用則使用 ChatGPT）
  getDefaultService(): AIService | null {
    if (geminiService.isAvailable()) {
      return geminiService
    }
    if (chatgptService.isAvailable()) {
      return chatgptService
    }
    return null
  }

  // 測試所有服務的連接
  async testAllServices(): Promise<Array<{ model: AIModel; success: boolean; message: string }>> {
    const results: Array<{ model: AIModel; success: boolean; message: string }> = []
    
    for (const [model, service] of this.services.entries()) {
      if (service.isAvailable()) {
        const result = await service.testConnection()
        results.push({ model, ...result })
      } else {
        results.push({ 
          model, 
          success: false, 
          message: `${service.getServiceName()} API Key 未設定` 
        })
      }
    }
    
    return results
  }

  // 使用指定模型生成貼文
  async generatePostWithModel(
    model: AIModel, 
    template: string, 
    articleContent: string, 
    maxWords?: number
  ): Promise<{ success: boolean; content?: string; error?: string; model: AIModel }> {
    const service = this.getService(model)
    if (!service) {
      return { 
        success: false, 
        error: `${model} 服務不可用`, 
        model 
      }
    }

    try {
      const result = await service.generatePostFromTemplate(template, articleContent, maxWords)
      return { ...result, model }
    } catch (error: any) {
      return { 
        success: false, 
        error: `${model} 生成失敗: ${error.message || '未知錯誤'}`, 
        model 
      }
    }
  }

  // 使用預設服務生成貼文
  async generatePost(
    template: string, 
    articleContent: string, 
    maxWords?: number
  ): Promise<{ success: boolean; content?: string; error?: string; model: AIModel }> {
    const defaultService = this.getDefaultService()
    if (!defaultService) {
      return { 
        success: false, 
        error: '沒有可用的 AI 服務，請檢查 API Key 設定', 
        model: 'gemini' 
      }
    }

    // 根據可用的服務選擇模型
    const model = defaultService === geminiService ? 'gemini' : 'chatgpt'
    return this.generatePostWithModel(model, template, articleContent, maxWords)
  }
}

// 創建單例實例
export const aiServiceManager = new AIServiceManager()
