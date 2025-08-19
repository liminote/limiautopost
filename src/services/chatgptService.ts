import OpenAI from 'openai'

export class ChatGPTService {
  private client: OpenAI | null = null
  private apiKey: string | null = null

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || null
    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true // 注意：在生產環境中應該使用後端代理
      })
    }
  }

  // 測試連接
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      return { success: false, message: 'OpenAI API Key 未設定' }
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      })
      
      if (response.choices[0]?.message?.content) {
        return { success: true, message: 'ChatGPT 連接成功' }
      } else {
        return { success: false, message: 'ChatGPT 回應格式異常' }
      }
    } catch (error: any) {
      console.error('ChatGPT 連接測試失敗:', error)
      return { 
        success: false, 
        message: `ChatGPT 連接失敗: ${error.message || '未知錯誤'}` 
      }
    }
  }

  // 生成內容
  async generateContent(prompt: string, maxTokens: number = 1000): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'OpenAI API Key 未設定' }
    }

    try {
      console.log('[ChatGPT] 開始生成，max_tokens:', maxTokens)
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.3, // 降低溫度，讓生成更穩定
        presence_penalty: 0.1, // 輕微懲罰重複內容
        frequency_penalty: 0.1 // 輕微懲罰頻繁出現的詞彙
      })

      const content = response.choices[0]?.message?.content
      if (content) {
        // 檢查是否被截斷
        const isTruncated = response.choices[0]?.finish_reason === 'length'
        if (isTruncated) {
          console.warn('[ChatGPT] 內容被截斷，finish_reason:', response.choices[0]?.finish_reason)
        }
        
        console.log('[ChatGPT] 生成完成，字數:', content.length, '是否截斷:', isTruncated)
        return { success: true, content: content.trim() }
      } else {
        return { success: false, error: 'ChatGPT 未生成內容' }
      }
    } catch (error: any) {
      console.error('ChatGPT 內容生成失敗:', error)
      return { 
        success: false, 
        error: `ChatGPT 生成失敗: ${error.message || '未知錯誤'}` 
      }
    }
  }

  /**
   * 從模板中提取字數要求
   */
  private extractLengthFromPrompt(template: string): { min: number; max: number } | null {
    console.log('[ChatGPT] 開始提取字數要求，模板內容:', template.substring(0, 200) + '...')
    
    // 匹配各種字數格式
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

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i]
      const match = template.match(pattern)
      if (match) {
        console.log(`[ChatGPT] 匹配到模式 ${i + 1}:`, match)
        
        if (match.length === 3) {
          // 範圍格式：480～500 字
          const min = parseInt(match[1])
          const max = parseInt(match[2])
          if (min && max && min <= max) {
            console.log(`[ChatGPT] 提取到範圍字數: ${min}-${max}`)
            return { min, max }
          }
        } else if (match.length === 2) {
          // 單一數字格式：500 字
          const length = parseInt(match[1])
          if (length) {
            console.log(`[ChatGPT] 提取到單一字數: ${length}`)
            return { min: length, max: length }
          }
        }
      }
    }

    console.warn('[ChatGPT] 無法從模板中提取字數要求')
    return null
  }

  /**
   * 檢查內容完整性
   */
  private checkContentCompleteness(content: string): boolean {
    if (!content || content.length < 50) return false
    
    // 檢查是否以完整句子結尾
    const lastChar = content.trim().slice(-1)
    const sentenceEndings = ['。', '！', '？', '!', '?', '.', '\n']
    
    if (sentenceEndings.includes(lastChar)) {
      return true
    }
    
    // 檢查是否被截斷（最後一個詞是否完整）
    const words = content.trim().split(/\s+/)
    const lastWord = words[words.length - 1]
    
    // 如果最後一個詞太短，可能是被截斷
    if (lastWord.length < 3) {
      return false
    }
    
    return true
  }

  // 根據模板生成貼文
  async generatePostFromTemplate(template: string, articleContent: string, maxWords: number = 500): Promise<{ success: boolean; content?: string; error?: string }> {
    // 添加詳細的調試信息
    console.log('[ChatGPT] ===== 開始生成貼文 =====')
    console.log('[ChatGPT] 接收到的模板:', {
      templateLength: template.length,
      templatePreview: template.substring(0, 200) + '...',
      articleLength: articleContent.length,
      maxWords: maxWords
    })
    
    // 從模板中提取字數要求
    const extractedLength = this.extractLengthFromPrompt(template)
    let targetLength = maxWords
    
    if (extractedLength) {
      console.log('[ChatGPT] 從模板中提取到字數要求:', extractedLength)
      targetLength = extractedLength.max
    } else {
      console.log('[ChatGPT] 無法從模板中提取字數要求，使用預設值:', maxWords)
    }
    
    // 計算 max_tokens，為中文內容提供足夠空間
    // 中文一個字約 2-3 tokens，加上 prompt 的 token，需要更多空間
    const estimatedTokens = Math.max(1000, targetLength * 4) // 中文需要更多 token
    const maxTokens = Math.max(1, estimatedTokens)
    
    console.log('[ChatGPT] Token 計算:', {
      originalMaxWords: maxWords,
      extractedLength,
      targetLength,
      estimatedTokens,
      finalMaxTokens: maxTokens
    })
    
    // 直接使用模板中的 prompt，添加文章內容作為上下文
    const prompt = `${template}

文章內容：
${articleContent}

重要要求：
1. 嚴格遵守上述模板中的所有規則和要求
2. 字數限制：必須控制在 ${targetLength} 字以內，絕對不能超過
3. 內容要完整、自然流暢，符合社群媒體的閱讀習慣
4. 如果模板要求加入 hashtag，請確保只加入一個相關的 hashtag
5. 生成完成後，請確認字數不超過 ${targetLength} 字

請直接輸出貼文內容，不要包含任何說明文字。`

    console.log('[ChatGPT] ===== 構建的最終 prompt =====')
    console.log('[ChatGPT] Prompt 長度:', prompt.length)
    console.log('[ChatGPT] Prompt 完整內容:')
    console.log(prompt)
    console.log('[ChatGPT] ================================')
    
    const result = await this.generateContent(prompt, maxTokens)
    
    // 檢查生成內容的完整性
    if (result.success && result.content) {
      const content = result.content
      const isComplete = this.checkContentCompleteness(content)
      
      if (!isComplete) {
        console.warn('[ChatGPT] 生成內容可能不完整，嘗試重新生成')
        // 如果內容不完整，嘗試用更多 token 重新生成
        const retryResult = await this.generateContent(prompt, maxTokens * 1.5)
        if (retryResult.success && retryResult.content) {
          return retryResult
        }
      }
    }
    
    return result
  }

  // 智能截斷內容
  smartTruncate(content: string, maxWords: number): string {
    if (!content) return content
    
    const words = content.split(/\s+/)
    if (words.length <= maxWords) return content
    
    // 截斷到指定字數，並確保句子完整
    const truncated = words.slice(0, maxWords).join(' ')
    
    // 如果截斷後以標點符號結尾，直接返回
    if (/[。！？.!?]/.test(truncated.slice(-1))) {
      return truncated
    }
    
    // 否則找到最後一個完整句子
    const lastSentence = truncated.match(/.*[。！？.!?]/)
    if (lastSentence) {
      return lastSentence[0]
    }
    
    return truncated
  }

  // 檢查 API Key 是否可用
  isAvailable(): boolean {
    return !!this.apiKey && 
           this.apiKey !== 'undefined' && 
           this.apiKey !== 'null' && 
           this.apiKey !== 'your_openai_api_key_here' &&
           !!this.client
  }

  // 獲取服務名稱
  getServiceName(): string {
    return 'ChatGPT'
  }

  // 獲取模型名稱
  getModelName(): string {
    return 'gpt-3.5-turbo'
  }
}

// 創建單例實例
export const chatgptService = new ChatGPTService()
