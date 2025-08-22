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

  // 測試 ChatGPT 連接
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isAvailable()) {
      return { success: false, message: 'OpenAI API Key 未設定' }
    }

    try {
      const response = await this.client!.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello, please respond with "OK" only.' }],
        max_tokens: 10
      })

      if (response.choices[0]?.message?.content === 'OK') {
        return { success: true, message: 'ChatGPT 連接成功' }
      } else {
        return { success: false, message: 'ChatGPT 回應格式異常' }
      }
    } catch (error) {
      console.error('ChatGPT 連接測試失敗:', error)
      return {
        success: false,
        message: `ChatGPT 連接失敗: ${error.message || '未知錯誤'}`
      }
    }
  }

  // 生成內容
  async generateContent(request: { prompt: string; maxWords?: number }): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'OpenAI API Key 未設定' }
    }

    try {
      const response = await this.client!.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: request.prompt }],
        max_tokens: request.maxWords ? Math.ceil(request.maxWords * 1.5) : 1000,
        temperature: 0.7
      })

      const content = response.choices[0]?.message?.content
      if (content) {
        return { success: true, content }
      } else {
        return { success: false, error: 'ChatGPT 未生成內容' }
      }
    } catch (error) {
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
  private extractLengthFromPrompt(template: string): number | null {
    // 簡化的字數提取，只保留最常用的模式
    const patterns = [
      /字數[：:]\s*(\d+)\s*[～~\-]\s*(\d+)\s*字/,     // 字數：480～500 字
      /(\d+)\s*[～~\-]\s*(\d+)\s*字/,                 // 480～500 字
      /字數[：:]\s*(\d+)\s*字/,                       // 字數：500 字
      /(\d+)\s*字/,                                    // 500 字
    ]

    for (const pattern of patterns) {
      const match = template.match(pattern)
      if (match) {
        if (match.length === 3) {
          // 範圍格式：480～500 字
          const max = parseInt(match[2])
          if (max) return max
        } else if (match.length === 2) {
          // 單一數字格式：500 字
          const length = parseInt(match[1])
          if (length) return length
        }
      }
    }

    return null
  }

  // 根據模板生成貼文
  async generatePostFromTemplate(template: string, articleContent: string, maxWords: number = 500): Promise<{ success: boolean; content?: string; error?: string }> {
    // 簡化的字數提取
    const targetLength = this.extractLengthFromPrompt(template) || maxWords
    
    // 構建 prompt
    const prompt = `${template}

文章內容：
${articleContent}

要求：嚴格遵守模板規則，字數控制在 ${targetLength} 字以內。`

    // 計算 max_tokens
    const maxTokens = Math.max(1000, targetLength * 3)
    
    return await this.generateContent({ prompt, maxWords: targetLength })
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
    return 'gpt-4o'
  }
}

// 創建單例實例
export const chatgptService = new ChatGPTService()
