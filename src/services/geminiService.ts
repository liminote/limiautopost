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
  private apiKey: string

  private constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!this.apiKey) {
      console.error('GEMINI_API_KEY 環境變數未設定')
      throw new Error('GEMINI_API_KEY 環境變數未設定，請檢查 Netlify 環境變數設定')
    }
    
    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey)
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      console.log('GeminiService 初始化成功')
    } catch (error) {
      console.error('GeminiService 初始化失敗:', error)
      throw new Error('GeminiService 初始化失敗')
    }
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      try {
        GeminiService.instance = new GeminiService()
      } catch (error) {
        console.error('無法建立 GeminiService 實例:', error)
        throw error
      }
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
    // 如果 targetLength 為 0，自動解析 Prompt 中的字數要求
    if (targetLength === 0) {
      const extractedLength = this.extractLengthFromPrompt(templatePrompt)
      if (extractedLength) {
        console.log(`[GeminiService] 從 Prompt 中提取到字數要求: ${extractedLength.min}-${extractedLength.max} 字`)
        targetLength = extractedLength.max // 使用最大值作為限制
      }
    }

    // 如果指定了字數，則進行字數控制
    const fullPrompt = `${templatePrompt}

原文內容：
${originalContent}

請根據上述模板要求，生成一篇符合字數限制（嚴格控制在 ${targetLength} 字元以內）的貼文。請確保：
1. 嚴格遵守模板的格式和風格要求
2. 字數必須控制在 ${targetLength} 字元以內，絕對不能超過
3. 內容要自然流暢，符合社群媒體的表達方式
4. 如果原文是中文，請用繁體中文回應
5. 生成完成後，請再次確認字數不超過 ${targetLength} 字元

請直接輸出貼文內容，不需要額外的說明或標記。`

    const result = await this.generateContent({
      prompt: fullPrompt,
      temperature: 0.7
    })

    // 檢查字數並自動截取
    if (result.success && result.content) {
      const actualLength = result.content.length
      console.log(`[GeminiService] 生成內容字數: ${actualLength}, 目標字數: ${targetLength}`)
      
      if (actualLength > targetLength) {
        console.warn(`[GeminiService] 內容超出字數限制，自動截取`)
        
        // 智能截取：盡量在句子結尾處切斷
        const truncated = this.smartTruncate(result.content, targetLength)
        
        return {
          success: true,
          content: truncated
        }
      }
    }

    return result
  }

  /**
   * 從 Prompt 中自動提取字數要求
   */
  private extractLengthFromPrompt(prompt: string): { min: number; max: number } | null {
    // 匹配各種字數格式
    const patterns = [
      /字數限制[：:]\s*(\d+)\s*[～~-]\s*(\d+)\s*字/, // 480～500 字
      /字數[：:]\s*(\d+)\s*[～~-]\s*(\d+)\s*字/,     // 字數：480～500 字
      /(\d+)\s*[～~-]\s*(\d+)\s*字/,                 // 480～500 字
      /字數限制[：:]\s*(\d+)\s*字/,                  // 字數限制：500 字
      /字數[：:]\s*(\d+)\s*字/,                      // 字數：500 字
      /(\d+)\s*字/                                   // 500 字
    ]

    for (const pattern of patterns) {
      const match = prompt.match(pattern)
      if (match) {
        if (match.length === 3) {
          // 範圍格式：480～500 字
          const min = parseInt(match[1])
          const max = parseInt(match[2])
          if (min && max && min <= max) {
            return { min, max }
          }
        } else if (match.length === 2) {
          // 單一數字格式：500 字
          const length = parseInt(match[1])
          if (length) {
            return { min: length, max: length }
          }
        }
      }
    }

    console.warn('[GeminiService] 無法從 Prompt 中提取字數要求')
    return null
  }

  /**
   * 智能截取文字，盡量在句子結尾處切斷
   */
  private smartTruncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    
    // 在指定長度附近尋找句子結尾
    const searchRange = Math.min(maxLength, text.length)
    const searchText = text.substring(0, searchRange)
    
    // 尋找句子結尾標點符號
    const sentenceEndings = ['。', '！', '？', '!', '?', '.', '\n']
    let bestCutPoint = maxLength
    
    for (const ending of sentenceEndings) {
      const lastIndex = searchText.lastIndexOf(ending)
      if (lastIndex > 0 && lastIndex < maxLength) {
        bestCutPoint = lastIndex + 1
        break
      }
    }
    
    // 如果找不到句子結尾，就在單字邊界切斷
    if (bestCutPoint === maxLength) {
      const lastSpace = searchText.lastIndexOf(' ')
      if (lastSpace > maxLength * 0.8) { // 在 80% 範圍內找空格
        bestCutPoint = lastSpace + 1
      }
    }
    
    const truncated = text.substring(0, bestCutPoint).trim()
    console.log(`[GeminiService] 智能截取完成: ${truncated.length} 字元`)
    
    return truncated
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
