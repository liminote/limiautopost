import { GoogleGenerativeAI } from '@google/generative-ai'

export interface GeminiGenerationRequest {
  prompt: string
  maxTokens?: number
  temperature?: number
}

export interface GeminiGenerationResult {
  success: boolean
  content?: string
  error?: string
}

export class GeminiService {
  private static instance: GeminiService
  private genAI: GoogleGenerativeAI
  private model: any

  private constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY 環境變數未設定')
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService()
    }
    return GeminiService.instance
  }

  /**
   * 生成內容
   */
  public async generateContent(request: GeminiGenerationRequest): Promise<GeminiGenerationResult> {
    try {
      console.log('[GeminiService] 開始生成內容:', { prompt: request.prompt.substring(0, 100) + '...' })
      
      const result = await this.model.generateContent(request.prompt)
      const response = await result.response
      const content = response.text()
      
      console.log('[GeminiService] 生成成功，字數:', content.length)
      
      return {
        success: true,
        content: content
      }
    } catch (error) {
      console.error('[GeminiService] 生成失敗:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  }

  /**
   * 根據模板和原文生成貼文
   */
  public async generatePostFromTemplate(
    templatePrompt: string,
    originalContent: string,
    targetLength: number
  ): Promise<GeminiGenerationResult> {
    const fullPrompt = `${templatePrompt}

原文內容：
${originalContent}

請根據上述模板要求，生成一篇符合字數限制（約 ${targetLength} 字）的貼文。請確保：
1. 嚴格遵守模板的格式和風格要求
2. 字數控制在 ${targetLength} 字左右（±20字）
3. 內容要自然流暢，符合社群媒體的表達方式
4. 如果原文是中文，請用繁體中文回應

請直接輸出貼文內容，不需要額外的說明或標記。`

    return this.generateContent({
      prompt: fullPrompt,
      temperature: 0.7
    })
  }

  /**
   * 測試 API 連線
   */
  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.generateContent({
        prompt: '請回覆「測試成功」這四個字'
      })
      return result.success && result.content === '測試成功'
    } catch {
      return false
    }
  }
}
