import type { BaseCard, SystemCard, UserCard, CardGenerationRequest, CardGenerationResult, TemplateManagement } from '../types/cards'
import { defaultSystemCards } from '../data/defaultCards'

export class CardService {
  private static instance: CardService
  private userCards: Map<string, UserCard[]> = new Map()
  private userSelections: Map<string, Set<string>> = new Map() // userId -> selected cardIds

  private constructor() {
    // 初始化使用者選擇（預設選擇系統模板）
    this.initializeDefaultSelections()
    // 從 localStorage 載入用戶卡片數據
    this.loadUserCardsFromStorage()
  }

  public static getInstance(): CardService {
    if (!CardService.instance) {
      CardService.instance = new CardService()
    }
    return CardService.instance
  }

  private initializeDefaultSelections() {
    // 預設所有使用者都選擇系統模板
    defaultSystemCards.forEach(card => {
      if (card.isSelected) {
        this.addUserSelection('default', card.id)
      }
    })
  }

  // 從 localStorage 載入用戶卡片數據
  private loadUserCardsFromStorage() {
    try {
      const stored = localStorage.getItem('limiautopost:userCards')
      if (stored) {
        const parsed = JSON.parse(stored)
        this.userCards = new Map(Object.entries(parsed).map(([userId, cards]) => [
          userId, 
          (cards as any[]).map(card => ({
            ...card,
            createdAt: new Date(card.createdAt),
            updatedAt: new Date(card.updatedAt)
          }))
        ]))
      }
    } catch (error) {
      console.warn('載入用戶卡片數據失敗:', error)
    }
  }

  // 保存用戶卡片數據到 localStorage
  private saveUserCardsToStorage() {
    try {
      const data = Object.fromEntries(this.userCards)
      localStorage.setItem('limiautopost:userCards', JSON.stringify(data))
    } catch (error) {
      console.warn('保存用戶卡片數據失敗:', error)
    }
  }

  // 獲取所有可用卡片（系統 + 使用者）
  public getAllCards(userId: string): BaseCard[] {
    const systemCards = defaultSystemCards
    const userCards = this.getUserCards(userId)
    
    // 合併並標記選擇狀態
    const allCards = [...systemCards, ...userCards]
    const userSelections = this.getUserSelections(userId)
    
    return allCards.map(card => ({
      ...card,
      isSelected: userSelections.has(card.id)
    }))
  }

  // 獲取使用者卡片
  public getUserCards(userId: string): UserCard[] {
    if (!userId || userId === 'anonymous') {
      console.warn('無效的用戶 ID:', userId)
      return []
    }
    return this.userCards.get(userId) || []
  }

  // 獲取系統卡片
  public getSystemCards(): SystemCard[] {
    return defaultSystemCards
  }

  // 創建使用者卡片
  public createUserCard(userId: string, cardData: Omit<UserCard, 'id' | 'isSystem' | 'userId' | 'createdAt' | 'updatedAt' | 'isSelected'>): UserCard {
    if (!userId || userId === 'anonymous') {
      throw new Error('無效的用戶 ID')
    }

    const newCard: UserCard = {
      ...cardData,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isSystem: false,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isSelected: false
    }

    if (!this.userCards.has(userId)) {
      this.userCards.set(userId, [])
    }
    this.userCards.get(userId)!.push(newCard)
    this.saveUserCardsToStorage() // 保存數據
    return newCard
  }

  // 更新使用者卡片
  public updateUserCard(cardId: string, userId: string, updates: Partial<UserCard>): UserCard | null {
    if (!userId || userId === 'anonymous') {
      throw new Error('無效的用戶 ID')
    }

    const userCards = this.userCards.get(userId) || []
    const cardIndex = userCards.findIndex(card => card.id === cardId)
    
    if (cardIndex === -1) return null
    
    const updatedCard = {
      ...userCards[cardIndex],
      ...updates,
      updatedAt: new Date()
    }
    
    userCards[cardIndex] = updatedCard
    this.saveUserCardsToStorage() // 保存數據
    return updatedCard
  }

  // 刪除使用者卡片
  public deleteUserCard(cardId: string, userId: string): boolean {
    if (!userId || userId === 'anonymous') {
      throw new Error('無效的用戶 ID')
    }

    const userCards = this.userCards.get(userId) || []
    const cardIndex = userCards.findIndex(card => card.id === cardId)
    
    if (cardIndex === -1) return false
    
    userCards.splice(cardIndex, 1)
    // 同時移除選擇狀態
    this.removeUserSelection(userId, cardId)
    this.saveUserCardsToStorage() // 保存數據
    return true
  }

  // 停用使用者卡片
  public deactivateUserCard(cardId: string, userId: string): boolean {
    const updated = this.updateUserCard(cardId, userId, { isActive: false })
    if (updated) {
      this.removeUserSelection(userId, cardId)
    }
    return !!updated
  }

  // 模板選擇相關方法
  public getUserSelections(userId: string): Set<string> {
    if (!userId || userId === 'anonymous') {
      console.warn('無效的用戶 ID:', userId)
      return new Set()
    }

    if (!this.userSelections.has(userId)) {
      // 從 localStorage 載入用戶選擇
      this.loadUserSelectionsFromStorage()
      
      // 如果還是沒有，使用預設選擇系統模板
      if (!this.userSelections.has(userId)) {
        const defaultSelections = new Set(defaultSystemCards.filter(card => card.isSelected).map(card => card.id))
        this.userSelections.set(userId, defaultSelections)
        this.saveUserSelectionsToStorage()
      }
    }
    return this.userSelections.get(userId)!
  }

  // 從 localStorage 載入用戶選擇
  private loadUserSelectionsFromStorage() {
    try {
      const stored = localStorage.getItem('limiautopost:userSelections')
      if (stored) {
        const parsed = JSON.parse(stored)
        this.userSelections = new Map(Object.entries(parsed).map(([uid, selections]) => [
          uid, 
          new Set(selections as string[])
        ]))
      }
    } catch (error) {
      console.warn('載入用戶選擇數據失敗:', error)
    }
  }

  // 保存用戶選擇到 localStorage
  private saveUserSelectionsToStorage() {
    try {
      const data = Object.fromEntries(
        Array.from(this.userSelections.entries()).map(([userId, selections]) => [
          userId, 
          Array.from(selections)
        ])
      )
      localStorage.setItem('limiautopost:userSelections', JSON.stringify(data))
    } catch (error) {
      console.warn('保存用戶選擇數據失敗:', error)
    }
  }

  public addUserSelection(userId: string, cardId: string): boolean {
    if (!userId || userId === 'anonymous') {
      throw new Error('無效的用戶 ID')
    }

    const selections = this.getUserSelections(userId)
    const maxSelections = 5
    
    if (selections.size >= maxSelections && !selections.has(cardId)) {
      return false // 已達最大選擇數量
    }
    
    selections.add(cardId)
    this.saveUserSelectionsToStorage()
    return true
  }

  public removeUserSelection(userId: string, cardId: string): boolean {
    if (!userId || userId === 'anonymous') {
      throw new Error('無效的用戶 ID')
    }

    const selections = this.getUserSelections(userId)
    const result = selections.delete(cardId)
    if (result) {
      this.saveUserSelectionsToStorage()
    }
    return result
  }

  public toggleUserSelection(userId: string, cardId: string): boolean {
    if (!userId || userId === 'anonymous') {
      throw new Error('無效的用戶 ID')
    }

    const selections = this.getUserSelections(userId)
    
    if (selections.has(cardId)) {
      return this.removeUserSelection(userId, cardId)
    } else {
      return this.addUserSelection(userId, cardId)
    }
  }

  // 獲取模板管理資訊
  public getTemplateManagement(userId: string): TemplateManagement {
    if (!userId || userId === 'anonymous') {
      return {
        availableTemplates: [],
        selectedTemplates: [],
        maxSelectedTemplates: 5,
        currentSelectedCount: 0
      }
    }

    const availableTemplates = this.getAllCards(userId)
    const selectedTemplates = this.getSelectedTemplates(userId)
    
    return {
      availableTemplates,
      selectedTemplates,
      maxSelectedTemplates: 5,
      currentSelectedCount: selectedTemplates.length
    }
  }

  // 獲取用戶選擇的模板
  public getSelectedTemplates(userId: string): BaseCard[] {
    if (!userId || userId === 'anonymous') {
      return []
    }

    const userSelections = this.getUserSelections(userId)
    const allCards = this.getAllCards(userId)
    
    return allCards.filter(card => userSelections.has(card.id))
  }

  // 更新系統模板（管理員功能）
  public updateSystemTemplate(
    cardId: string, 
    platform: 'threads' | 'instagram' | 'facebook' | 'general',
    templateTitle: string,
    templateFeatures: string,
    prompt: string
  ): boolean {
    const systemCard = defaultSystemCards.find(card => card.id === cardId)
    if (!systemCard) {
      console.warn(`找不到系統模板：${cardId}`)
      return false
    }

    // 更新模板內容
    Object.assign(systemCard, {
      platform,
      templateTitle,
      templateFeatures,
      prompt,
      updatedAt: new Date()
    })

    console.log(`系統模板更新成功：${cardId}`)
    return true
  }
}

export class AIGenerationService {
  private static instance: AIGenerationService

  private constructor() {}

  public static getInstance(): AIGenerationService {
    if (!AIGenerationService.instance) {
      AIGenerationService.instance = new AIGenerationService()
    }
    return AIGenerationService.instance
  }

  // 生成內容（目前是模擬實現）
  public async generateContent(request: CardGenerationRequest): Promise<CardGenerationResult> {
    // TODO: 整合真實的 AI API
    console.log('AI 生成請求:', request)
    
    // 模擬 API 延遲
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模擬生成結果
    return {
      threads: [
        { content: `這是根據主題「${request.topic}」生成的 Threads 第一則貼文，風格為 ${request.style}。${request.additionalContext ? `額外說明：${request.additionalContext}` : ''}` },
        { content: `這是根據主題「${request.topic}」生成的 Threads 第二則貼文，風格為 ${request.style}。` },
        { content: `這是根據主題「${request.topic}」生成的 Threads 第三則貼文，風格為 ${request.style}。` }
      ],
      instagram: { content: `這是根據主題「${request.topic}」生成的 Instagram 貼文，風格為 ${request.style}。你也有這樣的經驗嗎？` }
    }
  }
}
