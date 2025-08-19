import type { BaseCard, SystemCard, UserCard, CardGenerationRequest, CardGenerationResult, TemplateManagement } from '../types/cards'
import { defaultSystemCards } from '../data/defaultCards'

export class CardService {
  private static instance: CardService
  private userCards: Map<string, UserCard[]> = new Map()
  private userSelections: Map<string, Set<string>> = new Map() // userId -> selected cardIds
  private listeners: Set<() => void> = new Set()

  private constructor() {
    // 從 localStorage 載入用戶卡片數據
    this.loadUserCardsFromStorage()
    // 注意：loadSavedSystemTemplates 是 async，在建構函數中不呼叫
    
    // 監聽 AIGenerator 的模板更新事件
    this.setupTemplateUpdateListener()
  }

  // 監聽 AIGenerator 的模板更新事件
  private setupTemplateUpdateListener() {
    window.addEventListener('templatesUpdated', () => {
      console.log('[CardService] 收到模板更新事件，通知所有監聽器')
      this.notifyChanges()
    })
  }

  public static getInstance(): CardService {
    if (!CardService.instance) {
      CardService.instance = new CardService()
    }
    return CardService.instance
  }

  // 註冊資料變更監聽器
  public subscribeToChanges(callback: () => void): () => void {
    this.listeners.add(callback)
    
    // 返回取消訂閱的函數
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
    // 優先從 AIGenerator 讀取最新的系統模板
    const systemCards = this.getSystemTemplatesFromAIGenerator()
    const userCards = this.getUserCards(userId)
    
    // 合併並標記選擇狀態
    const allCards = [...systemCards, ...userCards]
    const userSelections = this.getUserSelections(userId)
    
    return allCards.map(card => ({
      ...card,
      isSelected: userSelections.has(card.id)
    }))
  }

  // 從 AIGenerator 的 localStorage 讀取最新的系統模板
  private getSystemTemplatesFromAIGenerator(): BaseCard[] {
    try {
      const saved = localStorage.getItem('aigenerator_templates')
      if (saved) {
        const templates = JSON.parse(saved)
        return templates.map((template: any) => ({
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
          isSelected: false // 預設未選擇，由使用者決定
        }))
      }
    } catch (error) {
      console.warn('無法從 AIGenerator 讀取模板:', error)
    }
    
    // 如果無法讀取，回退到預設模板
    return defaultSystemCards
  }

  // 獲取系統模板（BaseCard 格式）
  public getSystemTemplatesAsBaseCards(): BaseCard[] {
    return this.getSystemTemplatesFromAIGenerator()
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
  public async getSystemCards(): Promise<SystemCard[]> {
    // 確保載入最新的保存修改
    await this.loadSavedSystemTemplates()
    
    // 返回最新的系統模板
    return [...defaultSystemCards]
  }

  // 同步版本的 getSystemCards（向後相容）
  public getSystemCardsSync(): SystemCard[] {
    // 返回記憶體中的系統模板（可能不是最新的）
    return [...defaultSystemCards]
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
    this.notifyChanges() // 通知變更
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
    this.notifyChanges() // 通知變更
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
    this.notifyChanges() // 通知變更
    return true
  }

  // 停用使用者卡片
  public deactivateUserCard(cardId: string, userId: string): boolean {
    const updated = this.updateUserCard(cardId, userId, { isActive: false })
    if (updated) {
      this.removeUserSelection(userId, cardId)
    }
    this.notifyChanges() // 通知變更
    return !!updated
  }

  // 模板選擇相關方法
  public getUserSelections(userId: string): Set<string> {
    if (!userId || userId === 'anonymous') {
      console.warn('[CardService] 無效的用戶 ID:', userId)
      return new Set()
    }

    if (!this.userSelections.has(userId)) {
      // 從 localStorage 載入用戶選擇
      this.loadUserSelectionsFromStorage()
      
      // 如果還是沒有，為新用戶設置預設選擇
      if (!this.userSelections.has(userId)) {
        // 為新用戶自動選擇預設的系統模板
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
    const maxSelections = 5 // 最大選擇數量
    
    // 如果已經選擇了這個模板，允許移除
    if (selections.has(cardId)) {
      return true
    }
    
    // 檢查是否已達最大選擇數量
    if (selections.size >= maxSelections) {
      console.warn(`[CardService] 已達最大選擇數量 ${maxSelections}`)
      return false
    }
    
    selections.add(cardId)
    this.saveUserSelectionsToStorage()
    this.notifyChanges() // 通知變更
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
    this.notifyChanges() // 通知變更
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

    const availableTemplates = this.getAvailableCards(userId)
    const selectedTemplates = this.getSelectedTemplates(userId)
    
    return {
      availableTemplates,
      selectedTemplates,
      maxSelectedTemplates: 5,
      currentSelectedCount: selectedTemplates.length
    }
  }

  // 獲取模板管理資訊（包含最新的系統模板）
  public async getTemplateManagementAsync(userId: string): Promise<TemplateManagement> {
    if (!userId || userId === 'anonymous') {
      return {
        availableTemplates: [],
        selectedTemplates: [],
        maxSelectedTemplates: 5,
        currentSelectedCount: 0
      }
    }

    const availableTemplates = await this.getAvailableCardsAsync(userId)
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
      console.warn('[CardService] 無效的用戶 ID:', userId)
      return []
    }

    const userSelections = this.getUserSelections(userId)
    const allCards = this.getAllCards(userId)
    const selectedTemplates = allCards.filter(card => userSelections.has(card.id))
    
    return selectedTemplates
  }

  // 更新系統模板（管理員功能）
  public async updateSystemTemplate(
    cardId: string, 
    platform: 'threads' | 'instagram' | 'facebook' | 'general',
    templateTitle: string,
    templateFeatures: string,
    prompt: string
  ): Promise<boolean> {
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

    // 使用 Netlify Blobs 儲存到伺服器，讓所有用戶共享
    try {
      const response = await fetch('/.netlify/functions/update-system-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          platform,
          templateTitle,
          templateFeatures,
          prompt,
          updatedAt: systemCard.updatedAt.toISOString()
        })
      })

      if (response.ok) {
        console.log(`系統模板更新成功並保存到伺服器：${cardId}`)
      } else {
        console.error('保存到伺服器失敗:', response.status)
        // 即使伺服器保存失敗，也返回成功（因為記憶體更新成功）
      }
    } catch (error) {
      console.error('保存系統模板到伺服器失敗:', error)
      // 即使保存失敗，也返回成功（因為記憶體更新成功）
    }

    // 通知所有監聽器資料已變更
    this.notifyChanges()

    return true
  }

  // 載入保存的系統模板修改（從伺服器）
  public async loadSavedSystemTemplates(): Promise<void> {
    try {
      const response = await fetch('/.netlify/functions/get-system-templates')
      
      if (response.ok) {
        const savedTemplates = await response.json()
        
        // 將保存的修改應用到系統模板
        Object.entries(savedTemplates).forEach(([cardId, templateData]: [string, any]) => {
          const systemCard = defaultSystemCards.find(card => card.id === cardId)
          if (systemCard && templateData) {
            Object.assign(systemCard, {
              platform: templateData.platform,
              templateTitle: templateData.templateTitle,
              templateFeatures: templateData.templateFeatures,
              prompt: templateData.prompt,
              updatedAt: new Date(templateData.updatedAt)
            })
          }
        })
        
        console.log('已從伺服器載入保存的系統模板修改')
      } else {
        console.warn('無法從伺服器載入模板修改，使用本地版本')
        // 如果伺服器載入失敗，嘗試從 localStorage 載入（向後相容）
        this.loadSavedSystemTemplatesFromLocal()
      }
    } catch (error) {
      console.error('從伺服器載入系統模板失敗:', error)
      // 如果伺服器載入失敗，嘗試從 localStorage 載入（向後相容）
      this.loadSavedSystemTemplatesFromLocal()
    }
  }

  // 向後相容：從 localStorage 載入（舊版本）
  private loadSavedSystemTemplatesFromLocal(): void {
    try {
      const storageKey = 'limiautopost:systemTemplates'
      const savedTemplates = localStorage.getItem(storageKey)
      
      if (savedTemplates) {
        const templates = JSON.parse(savedTemplates)
        
        // 將保存的修改應用到系統模板
        Object.entries(templates).forEach(([cardId, templateData]: [string, any]) => {
          const systemCard = defaultSystemCards.find(card => card.id === cardId)
          if (systemCard && templateData) {
            Object.assign(systemCard, {
              platform: templateData.platform,
              templateTitle: templateData.templateTitle,
              templateFeatures: templateData.templateFeatures,
              prompt: templateData.prompt,
              updatedAt: new Date(templateData.updatedAt)
            })
          }
        })
        
        console.log('已從 localStorage 載入保存的系統模板修改（向後相容）')
      }
    } catch (error) {
      console.error('從 localStorage 載入系統模板失敗:', error)
    }
  }

  // 獲取用戶可用的模板（包含系統模板和用戶自訂模板）
  public getAvailableCards(userId: string): BaseCard[] {
    // 使用同步版本獲取系統模板（可能不是最新的）
    const systemCards = this.getSystemCardsSync()
    const userCards = this.getUserCards(userId)
    
    return [...systemCards, ...userCards]
  }

  // 獲取用戶可用的模板（包含最新的系統模板）
  public async getAvailableCardsAsync(userId: string): Promise<BaseCard[]> {
    // 確保載入最新的系統模板修改
    const systemCards = await this.getSystemCards()
    const userCards = this.getUserCards(userId)
    
    return [...systemCards, ...userCards]
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
