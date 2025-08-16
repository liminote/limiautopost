import type { BaseCard, SystemCard, UserCard, CardGenerationRequest, CardGenerationResult } from '../types/cards'
import { defaultSystemCards } from '../data/defaultCards'

// 卡片管理服務
export class CardService {
  private static instance: CardService
  private systemCards: SystemCard[] = []
  private userCards: UserCard[] = []

  private constructor() {
    this.initializeSystemCards()
  }

  public static getInstance(): CardService {
    if (!CardService.instance) {
      CardService.instance = new CardService()
    }
    return CardService.instance
  }

  // 初始化系統預設卡片
  private initializeSystemCards() {
    this.systemCards = [...defaultSystemCards]
  }

  // 獲取所有系統卡片
  public getSystemCards(): SystemCard[] {
    return this.systemCards.filter(card => card.isActive)
  }

  // 獲取所有使用者卡片
  public getUserCards(userId: string): UserCard[] {
    return this.userCards.filter(card => card.userId === userId && card.isActive)
  }

  // 獲取所有可用卡片（系統 + 使用者）
  public getAllCards(userId: string): BaseCard[] {
    return [...this.getSystemCards(), ...this.getUserCards(userId)]
  }

  // 根據 ID 獲取卡片
  public getCardById(cardId: string, userId: string): BaseCard | null {
    const systemCard = this.systemCards.find(card => card.id === cardId)
    if (systemCard) return systemCard

    const userCard = this.userCards.find(card => card.id === cardId && card.userId === userId)
    return userCard || null
  }

  // 創建使用者自定義卡片
  public createUserCard(userId: string, cardData: Omit<UserCard, 'id' | 'isSystem' | 'userId' | 'createdAt' | 'updatedAt'>): UserCard {
    const newCard: UserCard = {
      ...cardData,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isSystem: false,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.userCards.push(newCard)
    return newCard
  }

  // 更新使用者卡片
  public updateUserCard(cardId: string, userId: string, updates: Partial<UserCard>): UserCard | null {
    const cardIndex = this.userCards.findIndex(card => card.id === cardId && card.userId === userId)
    if (cardIndex === -1) return null

    this.userCards[cardIndex] = {
      ...this.userCards[cardIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return this.userCards[cardIndex]
  }

  // 刪除使用者卡片
  public deleteUserCard(cardId: string, userId: string): boolean {
    const cardIndex = this.userCards.findIndex(card => card.id === cardId && card.userId === userId)
    if (cardIndex === -1) return false

    this.userCards.splice(cardIndex, 1)
    return true
  }

  // 停用使用者卡片
  public deactivateUserCard(cardId: string, userId: string): boolean {
    const card = this.userCards.find(card => card.id === cardId && card.userId === userId)
    if (!card) return false

    card.isActive = false
    card.updatedAt = new Date().toISOString()
    return true
  }

  // 檢查卡片是否為系統卡片
  public isSystemCard(cardId: string): boolean {
    return this.systemCards.some(card => card.id === cardId)
  }

  // 檢查使用者是否有權限編輯卡片
  public canUserEditCard(cardId: string, userId: string): boolean {
    if (this.isSystemCard(cardId)) return false
    const card = this.userCards.find(card => card.id === cardId && card.userId === userId)
    return card !== undefined
  }
}

// AI 生成服務
export class AIGenerationService {
  private static instance: AIGenerationService

  private constructor() {}

  public static getInstance(): AIGenerationService {
    if (!AIGenerationService.instance) {
      AIGenerationService.instance = new AIGenerationService()
    }
    return AIGenerationService.instance
  }

  // 生成貼文內容
  public async generateContent(request: CardGenerationRequest): Promise<CardGenerationResult> {
    try {
      // 這裡會調用 AI API，目前先返回模擬資料
      // TODO: 實作真正的 AI API 調用
      
      const cardService = CardService.getInstance()
      const card = cardService.getCardById(request.cardId, 'current-user') // TODO: 獲取真實用戶 ID
      
      if (!card) {
        throw new Error('卡片不存在')
      }

      // 模擬 AI 生成過程
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 根據卡片類別返回不同的模擬結果
      switch (card.category) {
        case 'threads':
          return {
            threads: [
              { content: `這是根據主題「${request.topic}」生成的 Threads 第一則貼文，風格：${request.style || 'casual'}。內容會嚴格遵循字數限制和格式要求。` },
              { content: `這是 Threads 第二則貼文，從不同角度探討「${request.topic}」這個主題。` },
              { content: `Threads 第三則貼文，簡潔有力地總結「${request.topic}」的核心觀點。` }
            ],
            instagram: { content: `Instagram 貼文：關於「${request.topic}」的溫暖分享，結尾會搭配開放式問題鼓勵互動。` }
          }
        
        case 'instagram':
          return {
            threads: [],
            instagram: { content: `Instagram 貼文：專注於「${request.topic}」的溫暖內容，語氣親切且具洞察力。你也有類似的經驗嗎？` }
          }
        
        case 'facebook':
          return {
            threads: [],
            instagram: { content: `Facebook 貼文：適合社群分享的「${request.topic}」內容，鼓勵朋友間的互動和討論。` }
          }
        
        default:
          return {
            threads: [],
            instagram: { content: `通用貼文：關於「${request.topic}」的內容生成。` }
          }
      }
    } catch (error) {
      console.error('AI 生成失敗:', error)
      throw new Error('內容生成失敗，請稍後再試')
    }
  }
}
