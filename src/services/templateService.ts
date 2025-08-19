import type { BaseCard, SystemCard } from '../types/cards'

// 系統模板的類型定義
export type SystemTemplate = {
  id: string
  title: string
  platform: string
  features: string
  prompt: string
}

// 轉換為 BaseCard 格式
export const convertToBaseCard = (template: SystemTemplate): BaseCard => ({
  id: template.id,
  name: template.title,
  description: template.features,
  category: template.platform.toLowerCase(),
  prompt: template.prompt,
  isActive: true,
  isSystem: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  platform: template.platform.toLowerCase(),
  templateTitle: template.title,
  templateFeatures: template.features,
  isSelected: true
})

export class TemplateService {
  private static instance: TemplateService
  private listeners: Set<() => void> = new Set()

  private constructor() {}

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService()
    }
    return TemplateService.instance
  }

  // 註冊資料變更監聽器
  public subscribeToChanges(callback: () => void): () => void {
    this.listeners.add(callback)
    
    return () => {
      this.listeners.delete(callback)
    }
  }

  // 通知所有監聽器資料已變更
  private notifyChanges(): void {
    this.listeners.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('模板資料變更通知失敗:', error)
      }
    })
  }

  // 從 AIGenerator 的 localStorage 讀取最新的系統模板
  public getSystemTemplates(): SystemTemplate[] {
    try {
      const saved = localStorage.getItem('aigenerator_templates')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.warn('無法從 AIGenerator 讀取模板:', error)
    }
    
    // 如果無法讀取，回退到預設模板
    return [
      {
        id: 'threads-1',
        title: '第一則貼文',
        platform: 'Threads',
        features: '480-500字，完整觀點論述，獨立主題',
        prompt: '請嚴格遵守以下規則生成 Threads 第一則貼文：\n- 聚焦於一個清晰的主題（體悟、情境、對話）\n- 包含獨立完整的觀點與論述，結尾加收束句\n- 加入一個相關 hashtag（限一個）\n- 字數限制：480～500 字\n- 不能與其他貼文有上下文延續關係'
      },
      {
        id: 'threads-2',
        title: '第二則貼文',
        platform: 'Threads',
        features: '330-350字，完整觀點論述，獨立主題',
        prompt: '請嚴格遵守以下規則生成 Threads 第二則貼文：\n- 聚焦於一個清晰的主題（體悟、情境、對話）\n- 包含獨立完整的觀點與論述，結尾加收束句\n- 加入一個相關 hashtag（限一個）\n- 字數限制：330～350 字\n- 不能與其他貼文有上下文延續關係'
      },
      {
        id: 'threads-3',
        title: '第三則貼文',
        platform: 'Threads',
        features: '180-200字，完整觀點論述，獨立主題',
        prompt: '請嚴格遵守以下規則生成 Threads 第三則貼文：\n- 聚焦於一個清晰的主題（體悟、情境、對話）\n- 包含獨立完整的觀點與論述，結尾加收束句\n- 加入一個相關 hashtag（限一個）\n- 字數限制：180～200 字\n- 不能與其他貼文有上下文延續關係'
      },
      {
        id: 'instagram',
        title: 'Instagram 貼文',
        platform: 'Instagram',
        features: '溫暖語氣，開放式問題結尾，具洞察力',
        prompt: '請生成 Instagram 貼文：\n- 語氣溫暖但具洞察力\n- 可結尾搭配開放式問題（例如「你也有這樣的經驗嗎？」）\n- 長度可以略長於 Threads\n- 保持與主題相關的連貫性'
      }
    ]
  }

  // 獲取轉換後的系統模板（BaseCard 格式）
  public getSystemTemplatesAsBaseCards(): BaseCard[] {
    return this.getSystemTemplates().map(convertToBaseCard)
  }

  // 當 AIGenerator 更新模板時調用此方法
  public notifyTemplatesUpdated(): void {
    this.notifyChanges()
  }
}
