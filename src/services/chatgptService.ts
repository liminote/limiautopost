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
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
      })

      const content = response.choices[0]?.message?.content
      if (content) {
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

  // 根據模板生成貼文
  async generatePostFromTemplate(template: string, articleContent: string, maxWords: number = 500): Promise<{ success: boolean; content?: string; error?: string }> {
    // 確保 maxWords 有效，如果為 0 或無效值，使用預設值
    const validMaxWords = maxWords > 0 ? maxWords : 500
    
    const prompt = `
請根據以下模板和文章內容，生成一篇完整的社群媒體貼文：

模板要求：
${template}

文章內容：
${articleContent}

嚴格要求：
1. 嚴格遵守模板中的所有規則和要求
2. 字數限制：必須在 ${validMaxWords} 字以內，不能超過
3. 內容必須完整，有開頭、中間、結尾，不能沒頭沒尾
4. 內容要自然流暢，符合社群媒體的閱讀習慣
5. 如果模板要求加入 hashtag，請確保只加入一個相關的 hashtag
6. 生成內容必須是完整的句子和段落
7. 不要包含任何說明文字、標題或額外格式

請直接輸出貼文內容。
`

    // 計算 max_tokens，確保至少為 1
    const maxTokens = Math.max(1, validMaxWords * 3) // 增加 token 預留，確保內容完整
    return await this.generateContent(prompt, maxTokens)
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
