import type { BaseCard, SystemCard, UserCard, CardGenerationRequest, CardGenerationResult, TemplateManagement } from '../types/cards'
import { defaultSystemCards } from '../data/defaultCards'
import { GitHubSyncService } from './githubSyncService'

// 定義 GitHubTemplate 類型
interface GitHubTemplate {
  platform: string
  title: string
  features: string
  prompt: string
  updatedAt: string
}

export class CardService {
  private static instance: CardService
  private static readonly MAX_USER_TEMPLATES = 6
  
  // 可變的系統模板狀態，而不是靜態的 defaultSystemCards
  private systemTemplates: SystemCard[] = []
  private userCards: Map<string, UserCard[]> = new Map()
  private userSelections: Map<string, Set<string>> = new Map() // userId -> selected cardIds
  private listeners: Set<() => void> = new Set()
  private githubSyncService: GitHubSyncService

  private constructor() {
    this.githubSyncService = GitHubSyncService.getInstance()
    
    // 初始化系統模板為預設值的副本
    this.systemTemplates = JSON.parse(JSON.stringify(defaultSystemCards))
    
    // 載入用戶卡片數據
    this.loadUserCardsFromStorage()
    
    // 初始化預設選擇
    this.initializeDefaultSelections()
    
    // 監聽 AIGenerator 的模板更新事件
    this.setupTemplateUpdateListener()
    
    // 初始化時載入保存的模板修改
    this.loadSavedSystemTemplatesFromLocal()
    
    // 強制重新載入系統模板，確保無痕模式也能獲取到模板
    this.forceReloadSystemTemplates()
  }

  // 監聽 AIGenerator 的模板更新事件
  private setupTemplateUpdateListener() {
    window.addEventListener('templatesUpdated', async () => {
      console.log('[CardService] 收到模板更新事件，重新載入系統模板並通知所有監聽器')
      
      // 重新載入最新的系統模板
      try {
        await this.loadSavedSystemTemplates()
        console.log('[CardService] 系統模板重新載入完成')
      } catch (error) {
        console.warn('[CardService] 重新載入系統模板失敗:', error)
      }
      
      // 通知所有監聽器
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

  // 異步版本：優先從後端 API 獲取系統模板
  public async getAllCardsAsync(userId: string): Promise<BaseCard[]> {
    try {
      console.log('[CardService] 開始獲取所有卡片，用戶ID:', userId)
      
      // 獲取系統模板（優先級：後端 API > localStorage > 默認）
      const systemCards = await this.getSystemTemplatesWithFallback()
      
      // 獲取用戶卡片和選擇狀態
      const userCards = this.getUserCards(userId)
      const userSelections = this.getUserSelections(userId)
      
      // 合併並標記選擇狀態
      const allCards = [...systemCards, ...userCards]
      const result = allCards.map(card => ({
        ...card,
        isSelected: userSelections.has(card.id)
      }))
      
      console.log('[CardService] 返回結果，系統模板:', systemCards.length, '用戶卡片:', userCards.length, '總計:', result.length)
      return result
      
    } catch (error) {
      console.error('[CardService] 獲取模板失敗:', error)
      return this.getFallbackTemplates(userId)
    }
  }

  // 獲取系統模板，帶回退機制
  private async getSystemTemplatesWithFallback(): Promise<BaseCard[]> {
    // 1. 嘗試從後端 API 獲取
    try {
      const response = await fetch('/.netlify/functions/update-system-template', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      })
      
      if (response.ok) {
        const backendTemplates = await response.json()
        if (backendTemplates && Object.keys(backendTemplates).length > 0) {
          console.log('[CardService] 從後端獲取到模板，數量:', Object.keys(backendTemplates).length)
          return this.convertBackendTemplatesToBaseCards(backendTemplates)
        }
      }
    } catch (error) {
      console.warn('[CardService] 後端 API 調用失敗:', error)
    }
    
    // 2. 嘗試從 localStorage 獲取
    const localStorageTemplates = this.getSystemTemplatesFromLocalStorage()
    if (localStorageTemplates.length > 0) {
      console.log('[CardService] 從 localStorage 獲取到模板，數量:', localStorageTemplates.length)
      return localStorageTemplates
    }
    
    // 3. 沒有模板數據，返回預設的空白模板供編輯
    console.log('[CardService] 沒有找到模板數據，返回預設空白模板')
    return this.getFallbackTemplates('system')
  }

  // 同步版本（向後相容）
  public getAllCards(userId: string): BaseCard[] {
    // 從 localStorage 讀取系統模板（向後相容）
    const systemCards = this.getSystemTemplatesFromLocalStorage()
    const userCards = this.getUserCards(userId)
    
    // 合併並標記選擇狀態
    const allCards = [...systemCards, ...userCards]
    const userSelections = this.getUserSelections(userId)
    
    return allCards.map(card => ({
      ...card,
      isSelected: userSelections.has(card.id)
    }))
  }

  // 從 GitHub 讀取最新的系統模板，如果失敗則回退到預設模板
  private async getSystemTemplatesFromServer(): Promise<BaseCard[]> {
    try {
      console.log('[CardService] 正在從 GitHub 讀取系統模板...')
      const savedTemplates = await this.githubSyncService.getSystemTemplatesFromGitHub()
      
      if (Object.keys(savedTemplates).length > 0) {
        console.log('[CardService] 從 GitHub 讀取到模板:', savedTemplates)
        
        // 將保存的修改應用到系統模板
        const updatedSystemCards = this.systemTemplates.map(card => {
          const savedTemplate = savedTemplates[card.id]
          if (savedTemplate) {
            return {
              ...card,
              platform: savedTemplate.platform,
              templateTitle: savedTemplate.title,
              templateFeatures: savedTemplate.features,
              prompt: savedTemplate.prompt,
              updatedAt: new Date(savedTemplate.updatedAt)
            }
          }
          return card
        })
        
        this.systemTemplates = updatedSystemCards // 更新系統模板狀態
        console.log('[CardService] 更新後的系統模板:', updatedSystemCards)
        return updatedSystemCards
      } else {
        console.warn('[CardService] GitHub 上沒有找到模板資料')
      }
    } catch (error) {
      console.warn('[CardService] 無法從 GitHub 讀取系統模板:', error)
    }
    
    // 如果無法讀取，回退到預設模板
    console.log('[CardService] 使用預設系統模板')
    return defaultSystemCards
  }

  // 將後端 API 返回的模板數據轉換為 BaseCard 格式
  private convertBackendTemplatesToBaseCards(backendTemplates: any): BaseCard[] {
    try {
      if (typeof backendTemplates === 'object' && backendTemplates !== null) {
        console.log('[CardService] 開始轉換後端模板數據:', backendTemplates)
        
        const result = Object.values(backendTemplates).map((template: any) => {
          console.log('[CardService] 轉換模板:', template)
          
          const converted = {
            id: template.id || 'unknown',
            name: template.title || template.templateTitle || '',  // 優先使用 title
            description: template.features || template.templateFeatures || '',  // 優先使用 features
            category: template.platform?.toLowerCase() || 'threads',
            prompt: template.prompt || '',
            isActive: true,
            isSystem: true,
            createdAt: new Date(),
            updatedAt: new Date(template.updatedAt) || new Date(),
            platform: template.platform?.toLowerCase() || 'threads',
            templateTitle: template.title || template.templateTitle || '',  // 優先使用 title
            templateFeatures: template.features || template.templateFeatures || '',  // 優先使用 features
            isSelected: false
          }
          
          console.log('[CardService] 轉換結果:', converted)
          return converted
        })
        
        console.log('[CardService] 所有模板轉換完成，數量:', result.length)
        return result
      }
      return []
    } catch (error) {
      console.warn('轉換後端模板數據失敗:', error)
      return []
    }
  }

  // 同步版本：從 localStorage 讀取（向後相容）
  private getSystemTemplatesFromLocalStorage(): BaseCard[] {
    try {
      const saved = localStorage.getItem('aigenerator_templates')
      if (saved) {
        const templates = JSON.parse(saved)
        
        // 檢查數據格式：可能是數組或對象
        if (Array.isArray(templates)) {
          // 數組格式（舊版本）
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
            isSelected: false
          }))
        } else if (typeof templates === 'object' && templates !== null) {
          // 對象格式（新版本，從後端 API 獲取）
          console.log('[CardService] 從 localStorage 讀取對象格式模板:', templates)
          
          const templateArray = Object.values(templates).map((template: any) => {
            console.log('[CardService] 處理 localStorage 模板:', template)
            
            return {
              id: template.id || 'unknown',
              name: template.title || template.templateTitle || '',  // 優先使用 title
              description: template.features || template.templateFeatures || '',  // 優先使用 features
              category: template.platform?.toLowerCase() || 'threads',
              prompt: template.prompt || '',
              isActive: true,
              isSystem: true,
              createdAt: new Date(),
              updatedAt: new Date(template.updatedAt) || new Date(),
              platform: template.platform?.toLowerCase() || 'threads',
              templateTitle: template.title || template.templateTitle || '',  // 優先使用 title
              templateFeatures: template.features || template.templateFeatures || '',  // 優先使用 features
              isSelected: false
            }
          })
          
          console.log('[CardService] localStorage 模板轉換完成，數量:', templateArray.length)
          return templateArray
        }
      }
    } catch (error) {
      console.warn('無法從 localStorage 讀取模板:', error)
    }
    
    return defaultSystemCards
  }

  // 獲取系統模板（BaseCard 格式）
  public getSystemTemplatesAsBaseCards(): BaseCard[] {
    return this.getSystemTemplatesFromLocalStorage()
  }

  // 獲取使用者卡片
  public getUserCards(userId: string): UserCard[] {
    if (!userId || userId === 'anonymous') {
      console.warn('無效的用戶 ID:', userId)
      return []
    }
    return this.userCards.get(userId) || []
  }

  // 檢查使用者是否可以創建更多個人模板
  public canCreateMoreUserCards(userId: string): boolean {
    if (!userId || userId === 'anonymous') {
      return false
    }
    const currentUserCards = this.userCards.get(userId) || []
    return currentUserCards.length < CardService.MAX_USER_TEMPLATES
  }

  // 獲取使用者個人模板數量限制
  public getUserCardLimit(): number {
    return CardService.MAX_USER_TEMPLATES
  }

  // 獲取系統卡片
  public async getSystemCards(): Promise<SystemCard[]> {
    // 確保載入最新的保存修改
    await this.loadSavedSystemTemplates()
    
    // 返回最新的系統模板
    return [...this.systemTemplates]
  }

  // 同步版本的 getSystemCards（向後相容）
  public getSystemCardsSync(): SystemCard[] {
    // 返回記憶體中的系統模板（可能不是最新的）
    return [...this.systemTemplates]
  }

  // 創建使用者卡片
  public createUserCard(userId: string, cardData: Omit<UserCard, 'id' | 'isSystem' | 'userId' | 'createdAt' | 'updatedAt' | 'isSelected'>): UserCard {
    if (!userId || userId === 'anonymous') {
      throw new Error('無效的用戶 ID')
    }

    // 檢查個人模板數量限制
    const currentUserCards = this.userCards.get(userId) || []
    if (currentUserCards.length >= CardService.MAX_USER_TEMPLATES) {
      throw new Error(`已達到個人模板數量上限（最多${CardService.MAX_USER_TEMPLATES}個）`)
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
      
      // 如果還是沒有，為新用戶設置空的選擇集合（不自動選擇預設模板）
      if (!this.userSelections.has(userId)) {
        console.log('[CardService] 為新用戶創建空的選擇集合')
        this.userSelections.set(userId, new Set())
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
    const systemCard = this.systemTemplates.find(card => card.id === cardId)
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

    // 保存到 localStorage 作為備用
    try {
      const currentSaved = JSON.parse(localStorage.getItem('aigenerator_templates') || '{}')
      currentSaved[cardId] = {
        id: cardId,
        platform,
        title: templateTitle,
        features: templateFeatures,
        prompt,
        updatedAt: systemCard.updatedAt.toISOString()
      }
      localStorage.setItem('aigenerator_templates', JSON.stringify(currentSaved))
      console.log(`系統模板更新成功並保存到 localStorage：${cardId}`)
    } catch (error) {
      console.error('保存到 localStorage 失敗:', error)
    }

    // 通知所有監聽器資料已變更
    this.notifyChanges()

    return true
  }

  // 載入保存的系統模板修改（從 GitHub）
  public async loadSavedSystemTemplates(): Promise<void> {
    try {
      const savedTemplates = await this.githubSyncService.getSystemTemplatesFromGitHub()
      
      if (Object.keys(savedTemplates).length > 0) {
        // 將保存的修改應用到系統模板
        Object.entries(savedTemplates).forEach(([cardId, templateData]: [string, GitHubTemplate]) => {
          const systemCard = this.systemTemplates.find(card => card.id === cardId)
          if (systemCard && templateData) {
            Object.assign(systemCard, {
              platform: templateData.platform,
              templateTitle: templateData.title,
              templateFeatures: templateData.features,
              prompt: templateData.prompt,
              updatedAt: new Date(templateData.updatedAt)
            })
          }
        })
        
        console.log('已從 GitHub 載入保存的系統模板修改')
      } else {
        console.warn('無法從 GitHub 載入模板修改，使用本地版本')
        // 如果 GitHub 載入失敗，嘗試從 localStorage 載入（向後相容）
        this.loadSavedSystemTemplatesFromLocal()
      }
    } catch (error) {
      console.error('從 GitHub 載入系統模板失敗:', error)
      // 如果 GitHub 載入失敗，嘗試從 localStorage 載入（向後相容）
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
          const systemCard = this.systemTemplates.find(card => card.id === cardId)
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

  // 強制重新載入系統模板，確保無痕模式也能獲取到模板
  private forceReloadSystemTemplates(): void {
    this.getSystemTemplatesFromServer().then(updatedSystemCards => {
      if (updatedSystemCards.length > 0) {
        console.log('[CardService] 強制重新載入系統模板成功，數量:', updatedSystemCards.length)
      } else {
        console.warn('[CardService] 強制重新載入系統模板失敗，回退到預設模板')
      }
    }).catch(error => {
      console.warn('[CardService] 強制重新載入系統模板失敗，回退到預設模板:', error)
    })
  }

  // 將預設系統卡片轉換為 BaseCard 格式
  private convertDefaultCardsToBaseCards(): BaseCard[] {
    return defaultSystemCards.map(card => ({
      id: card.id,
      name: card.name || card.templateTitle || '',
      description: card.description || card.templateFeatures || '',
      category: (card.platform?.toLowerCase() as 'threads' | 'instagram' | 'facebook' | 'general') || 'threads',
      prompt: card.prompt || '',
      isActive: true,
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      platform: (card.platform?.toLowerCase() as 'threads' | 'instagram' | 'facebook' | 'general') || 'threads',
      templateTitle: card.name || card.templateTitle || '',
      templateFeatures: card.description || card.templateFeatures || '',
      isSelected: false
    }))
  }

  // 備用模板獲取方法
  private getFallbackTemplates(userId: string): BaseCard[] {
    console.log('[CardService] 使用備用模板方案')
    const defaultCards = this.convertDefaultCardsToBaseCards()
    const userCards = this.getUserCards(userId)
    
    const allCards = [...defaultCards, ...userCards]
    const userSelections = this.getUserSelections(userId)
    
    return allCards.map(card => ({
      ...card,
      isSelected: userSelections.has(card.id)
    }))
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
