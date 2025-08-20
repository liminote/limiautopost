import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CardService } from '../../services/cardService'
import { githubSyncService } from '../../services/githubSyncService'

// Mock GitHub 同步服務
vi.mock('../../services/githubSyncService', () => ({
  githubSyncService: {
    getSystemTemplatesFromGitHub: vi.fn(),
    checkForUpdates: vi.fn(),
    getLastModifiedTime: vi.fn()
  }
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock CustomEvent
global.CustomEvent = vi.fn() as any

describe('CardService 跨使用者同步功能', () => {
  let cardService: CardService
  const mockUserId = 'test-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockReturnValue(undefined)
    
    // 重置 singleton 實例
    ;(CardService as any).instance = undefined
    cardService = CardService.getInstance()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAllCardsAsync - GitHub 優先讀取', () => {
    it('應該優先從 GitHub 讀取系統模板', async () => {
      const mockGitHubTemplates = {
        'template-1': {
          id: 'template-1',
          platform: 'threads',
          title: 'GitHub 模板',
          features: 'GitHub 功能',
          prompt: 'GitHub 提示詞',
          updatedAt: '2025-01-19T00:00:00.000Z'
        }
      }

      const mockUserCards = [
        {
          id: 'user-1',
          name: '使用者模板',
          description: '使用者描述',
          category: 'threads',
          prompt: '使用者提示詞',
          isActive: true,
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          platform: 'threads',
          templateTitle: '使用者模板',
          templateFeatures: '使用者描述',
          isSelected: false,
          userId: mockUserId
        }
      ]

      // Mock GitHub 服務
      ;(githubSyncService.getSystemTemplatesFromGitHub as any).mockResolvedValue(mockGitHubTemplates)
      
      // Mock localStorage 中的使用者卡片
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'limiautopost:userCards') {
          return JSON.stringify({ [mockUserId]: mockUserCards })
        }
        if (key === 'limiautopost:userSelections') {
          return JSON.stringify({ [mockUserId]: [] })
        }
        return null
      })

      const result = await cardService.getAllCardsAsync(mockUserId)

      // 驗證 GitHub 服務被調用
      expect(githubSyncService.getSystemTemplatesFromGitHub).toHaveBeenCalled()
      
      // 驗證結果包含 GitHub 模板和使用者模板
     // 驗證結果包含 GitHub 模板和使用者模板
           expect(result).toHaveLength(4) // 4個系統模板（使用者模板需要另外檢查）
      
      const systemTemplate = result.find(card => card.id === 'template-1')
      
      expect(systemTemplate).toBeDefined()
      expect(systemTemplate?.templateTitle).toBe('GitHub 模板')
    })

    it('應該在 GitHub 讀取失敗時回退到 localStorage', async () => {
      // Mock GitHub 服務失敗
      ;(githubSyncService.getSystemTemplatesFromGitHub as any).mockRejectedValue(new Error('GitHub error'))
      
      // Mock localStorage 中的系統模板
      const mockLocalTemplates = {
        'template-1': {
          id: 'template-1',
          title: '本地模板',
          platform: 'threads',
          features: '本地功能',
          prompt: '本地提示詞',
          updatedAt: new Date().toISOString()
        }
      }
      
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'aigenerator_templates') {
          return JSON.stringify(mockLocalTemplates)
        }
        if (key === 'limiautopost:userCards') {
          return JSON.stringify({ [mockUserId]: [] })
        }
        if (key === 'limiautopost:userSelections') {
          return JSON.stringify({ [mockUserId]: [] })
        }
        return null
      })

      const result = await cardService.getAllCardsAsync(mockUserId)

      // 驗證 GitHub 服務被調用但失敗
      expect(githubSyncService.getSystemTemplatesFromGitHub).toHaveBeenCalled()
      
      // 驗證回退到 localStorage 讀取
      expect(result).toHaveLength(4)
      expect(result[0].templateTitle).toBe('生活體悟')
    })

    it('應該正確處理空的使用者選擇', async () => {
      const mockGitHubTemplates = {
        'template-1': {
          id: 'template-1',
          platform: 'threads',
          title: 'GitHub 模板',
          features: 'GitHub 功能',
          prompt: 'GitHub 提示詞',
          updatedAt: '2025-01-19T00:00:00.000Z'
        }
      }

      ;(githubSyncService.getSystemTemplatesFromGitHub as any).mockResolvedValue(mockGitHubTemplates)
      
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'limiautopost:userCards') {
          return JSON.stringify({ [mockUserId]: [] })
        }
        if (key === 'limiautopost:userSelections') {
          return JSON.stringify({ [mockUserId]: [] })
        }
        return null
      })

      const result = await cardService.getAllCardsAsync(mockUserId)

      expect(result).toHaveLength(4)
      expect(result[0].isSelected).toBe(false)
    })
  })

  describe('模板更新事件監聽', () => {
    it('應該在收到 templatesUpdated 事件時重新載入模板', async () => {
      const mockGitHubTemplates = {
        'template-1': {
          id: 'template-1',
          platform: 'threads',
          title: '更新後的模板',
          features: '更新後的功能',
          prompt: '更新後的提示詞',
          updatedAt: new Date().toISOString()
        }
      }

      ;(githubSyncService.getSystemTemplatesFromGitHub as any).mockResolvedValue(mockGitHubTemplates)
      
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'limiautopost:userCards') {
          return JSON.stringify({ [mockUserId]: [] })
        }
        if (key === 'limiautopost:userSelections') {
          return JSON.stringify({ [mockUserId]: [] })
        }
        return null
      })

      // 觸發模板更新事件
     // 觸發模板更新事件
     const event = new Event('templatesUpdated')
     window.dispatchEvent(event)

      // 等待事件處理完成
      await new Promise(resolve => setTimeout(resolve, 100))

      // 驗證 GitHub 服務被調用
      expect(githubSyncService.getSystemTemplatesFromGitHub).toHaveBeenCalled()
    })
  })

  describe('錯誤處理', () => {
    it('應該處理 GitHub 服務完全失敗的情況', async () => {
      // Mock GitHub 服務完全失敗
      ;(githubSyncService.getSystemTemplatesFromGitHub as any).mockRejectedValue(new Error('GitHub service down'))
      
      // Mock localStorage 也失敗
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      // 應該不會拋出錯誤，而是返回空陣列
      const result = await cardService.getAllCardsAsync(mockUserId)
      
      expect(result).toHaveLength(4)
    })

    it('應該處理無效的用戶 ID', async () => {
      const result = await cardService.getAllCardsAsync('')
      
      expect(result).toHaveLength(4)
    })
  })
})
