import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CardService, AIGenerationService } from '../../services/cardService'
import type { UserCard } from '../../types/cards'

describe('CardService', () => {
  let cardService: CardService
  const testUserId = 'test-user-123'

  beforeEach(() => {
    // 重置單例實例
    vi.clearAllMocks()
    // 清除 localStorage mock
    vi.mocked(localStorage.getItem).mockReturnValue(null)
    vi.mocked(localStorage.setItem).mockReturnValue(undefined)
    
    // 重新創建實例
    cardService = CardService.getInstance()
    
    // 清除之前的測試資料
    const testUserId = 'test-user-123'
    const userCards = cardService.getUserCards(testUserId)
    userCards.forEach(card => {
      cardService.deleteUserCard(card.id, testUserId)
    })
  })

  describe('getInstance', () => {
    it('應該返回單例實例', () => {
      const instance1 = CardService.getInstance()
      const instance2 = CardService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('getAllCards', () => {
    it('應該返回系統卡片和使用者卡片的合併', () => {
      const cards = cardService.getAllCards(testUserId)
      expect(cards).toHaveLength(4) // 4個系統預設卡片
      expect(cards.every(card => card.isSystem)).toBe(true)
    })

    it('應該正確標記選擇狀態', () => {
      const cards = cardService.getAllCards(testUserId)
      const selectedCards = cards.filter(card => card.isSelected)
      expect(selectedCards).toHaveLength(4) // 系統預設都選中
    })
  })

  describe('getUserCards', () => {
    it('應該返回空陣列當使用者沒有卡片時', () => {
      const cards = cardService.getUserCards(testUserId)
      expect(cards).toHaveLength(0)
    })
  })

  describe('createUserCard', () => {
    it('應該成功創建使用者卡片', () => {
      const cardData = {
        name: '測試卡片',
        description: '測試描述',
        category: 'general' as const,
        prompt: '測試 prompt',
        isActive: true,
        platform: 'general' as const,
        templateTitle: '測試模板',
        templateFeatures: '測試特色',
        isSelected: false
      }

      const newCard = cardService.createUserCard(testUserId, cardData)
      
      expect(newCard.id).toMatch(/^user-\d+-\w+$/)
      expect(newCard.isSystem).toBe(false)
      expect(newCard.userId).toBe(testUserId)
      expect(newCard.name).toBe(cardData.name)
      expect(newCard.createdAt).toBeInstanceOf(Date)
      expect(newCard.updatedAt).toBeInstanceOf(Date)
    })

    it('創建的卡片應該出現在使用者卡片列表中', () => {
      const cardData = {
        name: '測試卡片',
        description: '測試描述',
        category: 'general' as const,
        prompt: '測試 prompt',
        isActive: true,
        platform: 'general' as const,
        templateTitle: '測試模板',
        templateFeatures: '測試特色',
        isSelected: false
      }

      cardService.createUserCard(testUserId, cardData)
      const userCards = cardService.getUserCards(testUserId)
      
      expect(userCards).toHaveLength(1)
      expect(userCards[0].name).toBe(cardData.name)
    })
  })

  describe('updateUserCard', () => {
    it('應該成功更新使用者卡片', () => {
      // 先創建卡片
      const cardData = {
        name: '原始名稱',
        description: '原始描述',
        category: 'general' as const,
        prompt: '原始 prompt',
        isActive: true,
        platform: 'general' as const,
        templateTitle: '原始模板',
        templateFeatures: '原始特色',
        isSelected: false
      }

      const card = cardService.createUserCard(testUserId, cardData)
      
      // 更新卡片
      const updates = { name: '更新名稱', description: '更新描述' }
      const updatedCard = cardService.updateUserCard(card.id, testUserId, updates)
      
      expect(updatedCard).not.toBeNull()
      expect(updatedCard!.name).toBe('更新名稱')
      expect(updatedCard!.description).toBe('更新描述')
      // 由於測試執行速度很快，時間可能相同，所以檢查是否大於等於
      expect(updatedCard!.updatedAt.getTime()).toBeGreaterThanOrEqual(card.updatedAt.getTime())
    })

    it('應該返回 null 當卡片不存在時', () => {
      const result = cardService.updateUserCard('non-existent-id', testUserId, { name: '新名稱' })
      expect(result).toBeNull()
    })
  })

  describe('deleteUserCard', () => {
    it('應該成功刪除使用者卡片', () => {
      const cardData = {
        name: '要刪除的卡片',
        description: '測試描述',
        category: 'general' as const,
        prompt: '測試 prompt',
        isActive: true,
        platform: 'general' as const,
        templateTitle: '測試模板',
        templateFeatures: '測試特色',
        isSelected: false
      }

      const card = cardService.createUserCard(testUserId, cardData)
      expect(cardService.getUserCards(testUserId)).toHaveLength(1)
      
      const success = cardService.deleteUserCard(card.id, testUserId)
      expect(success).toBe(true)
      expect(cardService.getUserCards(testUserId)).toHaveLength(0)
    })

    it('應該返回 false 當卡片不存在時', () => {
      const success = cardService.deleteUserCard('non-existent-id', testUserId)
      expect(success).toBe(false)
    })
  })

  describe('模板選擇功能', () => {
    it('應該正確管理使用者選擇', () => {
      const selections = cardService.getUserSelections(testUserId)
      expect(selections.size).toBe(4) // 系統預設選中
    })

    it('應該允許添加選擇', () => {
      const success = cardService.addUserSelection(testUserId, 'system-threads-1')
      expect(success).toBe(true)
      
      const selections = cardService.getUserSelections(testUserId)
      expect(selections.has('system-threads-1')).toBe(true)
    })

    it('應該允許移除選擇', () => {
      cardService.addUserSelection(testUserId, 'system-threads-1')
      const success = cardService.removeUserSelection(testUserId, 'system-threads-1')
      expect(success).toBe(true)
      
      const selections = cardService.getUserSelections(testUserId)
      expect(selections.has('system-threads-1')).toBe(false)
    })

    it('應該正確切換選擇狀態', () => {
      const success1 = cardService.toggleUserSelection(testUserId, 'system-threads-1')
      expect(success1).toBe(true)
      
      const success2 = cardService.toggleUserSelection(testUserId, 'system-threads-1')
      expect(success2).toBe(true)
    })
  })

  describe('getTemplateManagement', () => {
    it('應該返回正確的模板管理資訊', () => {
      const management = cardService.getTemplateManagement(testUserId)
      
      expect(management.maxSelectedTemplates).toBe(5)
      expect(management.currentSelectedCount).toBe(3) // 系統預設（實際只有3個被選中）
      expect(management.availableTemplates).toHaveLength(4) // 總共有4個系統模板
      expect(management.selectedTemplates).toHaveLength(3) // 但只有3個被選中
    })
  })

  describe('getSelectedTemplates', () => {
    it('應該返回使用者選中的模板', () => {
      const selectedTemplates = cardService.getSelectedTemplates(testUserId)
      expect(selectedTemplates).toHaveLength(3) // 實際只有3個被選中
      expect(selectedTemplates.every(template => template.isSelected)).toBe(true)
    })
  })
})

describe('AIGenerationService', () => {
  let aiService: AIGenerationService

  beforeEach(() => {
    vi.clearAllMocks()
    aiService = AIGenerationService.getInstance()
  })

  describe('getInstance', () => {
    it('應該返回單例實例', () => {
      const instance1 = AIGenerationService.getInstance()
      const instance2 = AIGenerationService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('generateContent', () => {
    it('應該成功生成內容', async () => {
      const request = {
        cardId: 'test-card-id',
        topic: '測試主題',
        style: 'casual' as const,
        additionalContext: '額外說明'
      }

      const result = await aiService.generateContent(request)
      
      expect(result).toBeDefined()
      expect(result.threads).toHaveLength(3)
      expect(result.instagram).toBeDefined()
      expect(result.threads![0].content).toContain('測試主題')
      expect(result.threads![0].content).toContain('casual')
      expect(result.threads![0].content).toContain('額外說明')
    })

    it('應該處理沒有額外上下文的情況', async () => {
      const request = {
        cardId: 'test-card-id',
        topic: '測試主題',
        style: 'formal' as const
      }

      const result = await aiService.generateContent(request)
      
      expect(result).toBeDefined()
      expect(result.threads).toHaveLength(3)
      expect(result.threads![0].content).toContain('測試主題')
      expect(result.threads![0].content).toContain('formal')
    })
  })
})
