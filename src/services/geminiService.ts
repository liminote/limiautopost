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
  private genAI: GoogleGenerativeAI | null = null
  private model: any = null
  private apiKey: string | null = null
  private isInitialized: boolean = false

  private constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY
    
    // 詳細的環境變數檢查
    console.log('[GeminiService] 環境變數檢查:')
    console.log('- VITE_GEMINI_API_KEY:', this.apiKey)
    console.log('- 環境變數類型:', typeof this.apiKey)
    console.log('- 環境變數長度:', this.apiKey ? this.apiKey.length : 'N/A')
    console.log('- 所有環境變數:', import.meta.env)
    
    if (!this.apiKey || this.apiKey === 'undefined' || this.apiKey === 'null') {
      console.warn('⚠️ GEMINI_API_KEY 環境變數未設定或無效，服務將標記為不可用')
      this.isInitialized = false
      return
    }
    
    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey)
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      this.isInitialized = true
      console.log('✅ GeminiService 初始化成功')
    } catch (error) {
      console.error('❌ GeminiService 初始化失敗:', error)
      this.isInitialized = false
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
    if (!this.isInitialized || !this.model) {
      return {
        success: false,
        error: 'Gemini 服務未初始化，請檢查 API Key 設定'
      }
    }

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
   * 智能優化生成的內容
   */
  public async optimizeContent(
    originalContent: string,
    platform: string,
    targetStyle: string = 'default'
  ): Promise<GeminiGenerationResult> {
    const optimizationPrompt = this.buildOptimizationPrompt(originalContent, platform, targetStyle)
    
    try {
      console.log('[GeminiService] 開始內容優化...')
      const result = await this.generateContent({
        prompt: optimizationPrompt,
        temperature: 0.8
      })
      
      if (result.success && result.content) {
        console.log('[GeminiService] 內容優化成功')
        return result
      } else {
        console.warn('[GeminiService] 內容優化失敗，返回原始內容')
        return { success: true, content: originalContent }
      }
    } catch (error) {
      console.error('[GeminiService] 內容優化異常:', error)
      return { success: true, content: originalContent }
    }
  }

  /**
   * 建立優化 prompt
   */
  private buildOptimizationPrompt(originalContent: string, platform: string, targetStyle: string): string {
    const styleGuides = {
      threads: {
        default: '專業、有洞察力、引發思考',
        casual: '親切、輕鬆、像朋友聊天',
        professional: '權威、專業、有深度'
      },
      instagram: {
        default: '溫暖、有感染力、視覺化描述',
        lifestyle: '生活化、真實、有共鳴',
        inspirational: '激勵、正面、有力量'
      },
      facebook: {
        default: '詳細、有深度、適合討論',
        community: '社群導向、互動性強',
        informative: '資訊豐富、實用性強'
      }
    }

    const platformStyles = styleGuides[platform as keyof typeof styleGuides]
    const style = platformStyles?.[targetStyle as keyof typeof platformStyles] || platformStyles?.default || '專業、有洞察力'
    
    return `你是一位資深${platform}社群媒體專家。請優化以下內容，讓它更符合${platform}的風格要求。

**目標風格：** ${style}

**原始內容：**
${originalContent}

**優化要求：**
1. 保持核心訊息不變
2. 調整語氣和表達方式，符合${platform}用戶習慣
3. 增加互動性和參與度
4. 優化開頭和結尾，提高吸引力
5. 確保內容自然流暢，符合社群媒體閱讀習慣

請直接輸出優化後的內容，不需要額外說明。`
  }

  /**
   * 根據模板和原文生成貼文（增強版）
   */
  public async generatePostFromTemplateEnhanced(
    templatePrompt: string,
    originalContent: string,
    targetLength: number,
    optimizationLevel: 'basic' | 'enhanced' | 'premium' = 'basic'
  ): Promise<GeminiGenerationResult> {
    console.log(`[GeminiService] 開始增強版貼文生成，優化等級: ${optimizationLevel}`)
    
    // 第一層：基本內容生成
    const basicResult = await this.generatePostFromTemplate(templatePrompt, originalContent, targetLength)
    
    if (!basicResult.success || !basicResult.content) {
      return basicResult
    }

    // 根據優化等級決定是否進行進一步優化
    if (optimizationLevel === 'basic') {
      return basicResult
    }

    // 第二層：內容優化
    const platform = this.extractPlatformFromPrompt(templatePrompt)
    const optimizedResult = await this.optimizeContent(basicResult.content, platform, 'default')
    
    if (optimizationLevel === 'enhanced') {
      return optimizedResult
    }

    // 第三層：風格微調（premium 等級）
    if (optimizationLevel === 'premium') {
      const finalResult = await this.finalizeContent(optimizedResult.content || '', platform, targetLength)
      return finalResult
    }

    return optimizedResult
  }

  /**
   * 最終內容定稿
   */
  private async finalizeContent(content: string, platform: string, targetLength: number): Promise<GeminiGenerationResult> {
    const finalizationPrompt = `請對以下${platform}貼文進行最終定稿：

**內容：**
${content}

**要求：**
1. 確保每個句子都有力量
2. 優化詞彙選擇，使用更有感染力的表達
3. 調整節奏，讓閱讀體驗更流暢
4. 確保在${targetLength}字元內
5. 保持內容的完整性和邏輯性

請直接輸出最終版本，不需要額外說明。`

    try {
      const result = await this.generateContent({
        prompt: finalizationPrompt,
        temperature: 0.6
      })
      
      if (result.success && result.content) {
        // 確保字數符合要求
        if (result.content.length > targetLength) {
          const truncated = this.smartTruncate(result.content, targetLength)
          return { success: true, content: truncated }
        }
        return result
      }
      
      return { success: true, content: content }
    } catch (error) {
      console.error('[GeminiService] 最終定稿失敗:', error)
      return { success: true, content: content }
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
    // 直接使用模板中的 prompt，添加文章內容作為上下文
    const fullPrompt = `${templatePrompt}

原文內容：
${originalContent}

請根據上述模板要求生成貼文內容，直接輸出貼文內容，不要包含「文章內容：」等前綴。`

    const result = await this.generateContent({
      prompt: fullPrompt,
      temperature: 0.7
    })

    return result
  }

  /**
   * 從 Prompt 中自動提取字數要求
   */
  private extractLengthFromPrompt(prompt: string): { min: number; max: number } | null {
    console.log('[GeminiService] 開始提取字數要求，Prompt 內容:', prompt.substring(0, 200) + '...')
    
    // 匹配各種字數格式，正確處理全形波浪號 ～ 和其他分隔符號
    const patterns = [
      /字數限制[：:]\s*(\d+)\s*[～~\-]\s*(\d+)\s*字/,     // 字數限制：480～500 字
      /字數[：:]\s*(\d+)\s*[～~\-]\s*(\d+)\s*字/,         // 字數：480～500 字
      /(\d+)\s*[～~\-]\s*(\d+)\s*字/,                     // 480～500 字
      /字數限制[：:]\s*(\d+)\s*字/,                       // 字數限制：500 字
      /字數[：:]\s*(\d+)\s*字/,                           // 字數：500 字
      /(\d+)\s*字/,                                        // 500 字
      /字數限制[：:]\s*(\d+)\s*[～~\-]\s*(\d+)/,          // 字數限制：480～500 (沒有「字」)
      /字數[：:]\s*(\d+)\s*[～~\-]\s*(\d+)/,              // 字數：480～500
      /(\d+)\s*[～~\-]\s*(\d+)/,                          // 480～500
      /字數限制[：:]\s*(\d+)/,                             // 字數限制：500
      /字數[：:]\s*(\d+)/,                                 // 字數：500
      /(\d+)/                                              // 500 (最後的備用方案)
    ]

    // 測試你的實際格式
    console.log('[GeminiService] 測試字數提取...')
    const testPattern = /字數限制[：:]\s*(\d+)\s*[～~\-]\s*(\d+)\s*字/
    const testMatch = prompt.match(testPattern)
    console.log('[GeminiService] 測試匹配結果:', testMatch)

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i]
      const match = prompt.match(pattern)
      if (match) {
        console.log(`[GeminiService] 匹配到模式 ${i + 1}:`, match)
        
        if (match.length === 3) {
          // 範圍格式：480～500 字
          const min = parseInt(match[1])
          const max = parseInt(match[2])
          if (min && max && min <= max) {
            console.log(`[GeminiService] 提取到範圍字數: ${min}-${max}`)
            return { min, max }
          }
        } else if (match.length === 2) {
          // 單一數字格式：500 字
          const length = parseInt(match[1])
          if (length) {
            console.log(`[GeminiService] 提取到單一字數: ${length}`)
            return { min: length, max: length }
          }
        }
      }
    }

    console.warn('[GeminiService] 無法從 Prompt 中提取字數要求，使用預設值 300 字')
    return { min: 300, max: 300 }
  }

  /**
   * 從 prompt 中提取平台資訊
   */
  private extractPlatformFromPrompt(prompt: string): string {
    if (prompt.includes('Threads') || prompt.includes('threads')) return 'threads'
    if (prompt.includes('Instagram') || prompt.includes('instagram')) return 'instagram'
    if (prompt.includes('Facebook') || prompt.includes('facebook')) return 'facebook'
    return 'general'
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
   * 檢查 API Key 是否可用
   */
  public isAvailable(): boolean {
    return this.isInitialized
  }

  /**
   * 獲取服務名稱
   */
  public getServiceName(): string {
    return 'Gemini'
  }

  /**
   * 獲取模型名稱
   */
  public getModelName(): string {
    return 'gemini-1.5-flash'
  }

  /**
   * 測試 API 連線
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isInitialized || !this.model) {
      return { 
        success: false, 
        message: 'Gemini 服務未初始化，請檢查 API Key 設定' 
      }
    }

    try {
      const result = await this.generateContent({
        prompt: '請回覆「測試成功」這四個字'
      })
      
      if (result.success && result.content) {
        // 更寬鬆的檢查，只要內容包含「測試成功」即可
        if (result.content.includes('測試成功')) {
          return { success: true, message: 'Gemini 連接成功' }
        } else {
          console.warn('[GeminiService] 測試回應內容:', result.content)
          return { success: false, message: 'Gemini 回應內容不符合預期' }
        }
      } else {
        return { 
          success: false, 
          message: `Gemini 生成失敗: ${result.error || '未知錯誤'}` 
        }
      }
    } catch (error: any) {
      console.error('[GeminiService] 連接測試異常:', error)
      return { 
        success: false, 
        message: `Gemini 連接失敗: ${error.message || '未知錯誤'}` 
      }
    }
  }
}

// 創建單例實例
export const geminiService = GeminiService.getInstance()
