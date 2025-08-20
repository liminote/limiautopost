import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CardService } from '../../services/cardService'
import type { UserCard } from '../../types/cards'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock CustomEvent
Object.defineProperty(window, 'CustomEvent', {
  value: vi.fn(),
})

describe('CardService 個人模板數量限制功能', () => {
  let cardService: CardService
  const testUserId = 'test-user@example.com'

  beforeEach(() => {
    // 清除所有 mock
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    // 重置 CardService 實例
    // @ts-ignore - 訪問私有屬性來重置實例
    CardService.instance = undefined
    cardService = CardService.getInstance()
  })

  describe('getUserCardLimit', () => {
    it('應該返回正確的個人模板數量限制', () => {
      const limit = cardService.getUserCardLimit()
      expect(limit).toBe(6)
    })
  })

  describe('canCreateMoreUserCards', () => {
    it('當用戶沒有個人模板時，應該返回 true', () => {
      const canCreate = cardService.canCreateMoreUserCards(testUserId)
      expect(canCreate).toBe(true)
    })

    it('當用戶有5個個人模板時，應該返回 true', () => {
      // 模擬用戶已有5個模板
      const mockUserCards: UserCard[] = Array.from({ length: 5 }, (_, i) => ({
        id: `user-card-${i}`,
        name: `模板 ${i}`,
        description: `描述 ${i}`,
        category: 'general',
        prompt: `提示詞 ${i}`,
        isActive: true,
        isSystem: false,
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSelected: false,
        platform: 'general',
        templateTitle: `模板 ${i}`,
        templateFeatures: `描述 ${i}`,
      }))

      // 直接設置私有屬性來模擬狀態
      // @ts-ignore - 訪問私有屬性
      cardService.userCards.set(testUserId, mockUserCards)

      const canCreate = cardService.canCreateMoreUserCards(testUserId)
      expect(canCreate).toBe(true)
    })

    it('當用戶有6個個人模板時，應該返回 false', () => {
      // 模擬用戶已有6個模板
      const mockUserCards: UserCard[] = Array.from({ length: 6 }, (_, i) => ({
        id: `user-card-${i}`,
        name: `模板 ${i}`,
        description: `描述 ${i}`,
        category: 'general',
        prompt: `提示詞 ${i}`,
        isActive: true,
        isSystem: false,
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSelected: false,
        platform: 'general',
        templateTitle: `模板 ${i}`,
        templateFeatures: `描述 ${i}`,
      }))

      // 直接設置私有屬性來模擬狀態
      // @ts-ignore - 訪問私有屬性
      cardService.userCards.set(testUserId, mockUserCards)

      const canCreate = cardService.canCreateMoreUserCards(testUserId)
      expect(canCreate).toBe(false)
    })

    it('當用戶ID無效時，應該返回 false', () => {
      const canCreate = cardService.canCreateMoreUserCards('')
      expect(canCreate).toBe(false)

      const canCreateAnonymous = cardService.canCreateMoreUserCards('anonymous')
      expect(canCreateAnonymous).toBe(false)
    })
  })

  describe('createUserCard 限制檢查', () => {
    it('當用戶已有6個模板時，創建新模板應該拋出錯誤', () => {
      // 模擬用戶已有6個模板
      const mockUserCards: UserCard[] = Array.from({ length: 6 }, (_, i) => ({
        id: `user-card-${i}`,
        name: `模板 ${i}`,
        description: `描述 ${i}`,
        category: 'general',
        prompt: `提示詞 ${i}`,
        isActive: true,
        isSystem: false,
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSelected: false,
        platform: 'general',
        templateTitle: `模板 ${i}`,
        templateFeatures: `描述 ${i}`,
      }))

      // 直接設置私有屬性來模擬狀態
      // @ts-ignore - 訪問私有屬性
      cardService.userCards.set(testUserId, mockUserCards)

      const cardData = {
        name: '新模板',
        description: '新描述',
        category: 'general' as const,
        prompt: '新提示詞',
        isActive: true,
        platform: 'general' as const,
        templateTitle: '新模板',
        templateFeatures: '新描述',
      }

      expect(() => {
        cardService.createUserCard(testUserId, cardData)
      }).toThrow('已達到個人模板數量上限（最多6個）')
    })

    it('當用戶ID無效時，創建模板應該拋出錯誤', () => {
      const cardData = {
        name: '新模板',
        description: '新描述',
        category: 'general' as const,
        prompt: '新提示詞',
        isActive: true,
        platform: 'general' as const,
        templateTitle: '新模板',
        templateFeatures: '新描述',
      }

      expect(() => {
        cardService.createUserCard('', cardData)
      }).toThrow('無效的用戶 ID')

      expect(() => {
        cardService.createUserCard('anonymous', cardData)
      }).toThrow('無效的用戶 ID')
    })

    it('當用戶未達到限制時，應該成功創建模板', () => {
      const cardData = {
        name: '新模板',
        description: '新描述',
        category: 'general' as const,
        prompt: '新提示詞',
        isActive: true,
        platform: 'general' as const,
        templateTitle: '新模板',
        templateFeatures: '新描述',
      }

      const newCard = cardService.createUserCard(testUserId, cardData)

      expect(newCard).toBeDefined()
      expect(newCard.name).toBe('新模板')
      expect(newCard.userId).toBe(testUserId)
      expect(newCard.isSystem).toBe(false)
    })
  })

  describe('模板數量統計', () => {
    it('應該正確統計用戶的個人模板數量', () => {
      // 創建3個模板
      for (let i = 0; i < 3; i++) {
        const cardData = {
          name: `模板 ${i}`,
          description: `描述 ${i}`,
          category: 'general' as const,
          prompt: `提示詞 ${i}`,
          isActive: true,
          platform: 'general' as const,
          templateTitle: `模板 ${i}`,
          templateFeatures: `描述 ${i}`,
        }
        cardService.createUserCard(testUserId, cardData)
      }

      const userCards = cardService.getUserCards(testUserId)
      expect(userCards).toHaveLength(3)

      const canCreate = cardService.canCreateMoreUserCards(testUserId)
      expect(canCreate).toBe(true)
    })

    it('當達到限制時，canCreateMoreUserCards 應該返回 false', () => {
      // 創建6個模板
      for (let i = 0; i < 6; i++) {
        const cardData = {
          name: `模板 ${i}`,
          description: `描述 ${i}`,
          category: 'general' as const,
          prompt: `提示詞 ${i}`,
          isActive: true,
          platform: 'general' as const,
          templateTitle: `模板 ${i}`,
          templateFeatures: `描述 ${i}`,
        }
        cardService.createUserCard(testUserId, cardData)
      }

      const userCards = cardService.getUserCards(testUserId)
      expect(userCards).toHaveLength(6)

      const canCreate = cardService.canCreateMoreUserCards(testUserId)
      expect(canCreate).toBe(false)
    })
  })
})
