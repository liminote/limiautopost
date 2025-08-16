// 基本卡片類型定義
export interface BaseCard {
  id: string
  name: string
  description: string
  category: 'threads' | 'instagram' | 'facebook' | 'general'
  prompt: string
  isActive: boolean
  isSystem: boolean
  userId?: string
  createdAt: Date
  updatedAt: Date
  // 新增欄位
  platform: 'threads' | 'instagram' | 'facebook' | 'general'
  templateTitle: string
  templateFeatures: string
  isSelected: boolean // 是否被使用者勾選
}

export interface UserCard extends Omit<BaseCard, 'isSystem'> {
  isSystem: false
  userId: string
}

export interface SystemCard extends Omit<BaseCard, 'userId'> {
  isSystem: true
}

export interface CardGenerationRequest {
  cardId: string
  topic: string
  style: 'formal' | 'casual' | 'professional' | 'friendly'
  additionalContext?: string
}

export interface CardGenerationResult {
  threads?: Array<{ content: string }>
  instagram?: { content: string }
  facebook?: { content: string }
}

// 新增：模板選擇介面
export interface TemplateSelection {
  cardId: string
  isSelected: boolean
}

// 新增：模板管理介面
export interface TemplateManagement {
  maxSelectedTemplates: number
  currentSelectedCount: number
  availableTemplates: BaseCard[]
  selectedTemplates: BaseCard[]
}
