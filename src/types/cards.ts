// 基本卡片類型定義
export interface BaseCard {
  id: string
  name: string
  description: string
  category: 'threads' | 'instagram' | 'facebook' | 'general'
  prompt: string
  isSystem: boolean // 系統預設，不可編輯
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// 使用者自定義卡片
export interface UserCard extends Omit<BaseCard, 'isSystem'> {
  isSystem: false
  userId: string
}

// 系統預設卡片
export interface SystemCard extends BaseCard {
  isSystem: true
  userId: null
}

// 卡片生成結果
export interface CardGenerationResult {
  threads: Array<{ content: string }>
  instagram: { content: string }
  facebook?: { content: string }
}

// 卡片生成請求
export interface CardGenerationRequest {
  cardId: string
  topic: string
  style?: 'formal' | 'casual' | 'professional' | 'friendly'
  additionalContext?: string
}
