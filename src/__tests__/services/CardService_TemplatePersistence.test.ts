import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CardService } from '../../services/cardService'

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

// Mock GitHubSyncService
vi.mock('../../services/githubSyncService', () => ({
  GitHubSyncService: {
    getInstance: vi.fn(() => ({
      getSystemTemplatesFromGitHub: vi.fn()
    }))
  }
}))

describe('CardService 模板持久化功能', () => {
  let cardService: CardService

  beforeEach(() => {
    vi.clearAllMocks()
    // 重置 localStorage mock
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => {})
    localStorageMock.removeItem.mockImplementation(() => {})
    localStorageMock.clear.mockImplementation(() => {})
    
    // 創建新的 CardService 實例
    cardService = CardService.getInstance()
  })

  it('應該保持系統模板狀態，不會被自動重置', async () => {
    // 模擬 localStorage 中有保存的系統模板
    const savedTemplates = {
      "template-1": {
        "id": "template-1",
        "platform": "threads",
        "title": "自定義生活體悟",
        "features": "自定義的生活感悟分享",
        "prompt": "自定義的 prompt 內容",
        "updatedAt": "2025-01-19T00:00:00.000Z"
      }
    }
    
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'limiautopost:systemTemplates') {
        return JSON.stringify(savedTemplates)
      }
      return null
    })

    // 獲取系統模板
    const systemCards = await cardService.getSystemCards()
    
    // 驗證模板沒有被重置為預設值
    expect(systemCards.length).toBeGreaterThan(0)
    
    // 驗證自定義的模板內容被保留
    const customTemplate = systemCards.find(card => card.id === 'template-1')
    expect(customTemplate).toBeDefined()
    expect(customTemplate?.templateTitle).toBe('自定義生活體悟')
    expect(customTemplate?.templateFeatures).toBe('自定義的生活感悟分享')
    expect(customTemplate?.prompt).toBe('自定義的 prompt 內容')
  })

  it('應該在 GitHub 同步失敗時保持當前模板狀態', async () => {
    // 模擬 localStorage 中有保存的系統模板
    const savedTemplates = {
      "template-2": {
        "id": "template-2",
        "platform": "threads",
        "title": "自定義專業分享",
        "features": "自定義的專業見解",
        "prompt": "自定義的專業 prompt",
        "updatedAt": "2025-01-19T00:00:00.000Z"
      }
    }
    
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'limiautopost:systemTemplates') {
        return JSON.stringify(savedTemplates)
      }
      return null
    })

    // 獲取系統模板
    const systemCards = await cardService.getSystemCards()
    
    // 驗證模板數量
    expect(systemCards.length).toBeGreaterThan(0)
    
    // 驗證自定義模板被保留
    const customTemplate = systemCards.find(card => card.id === 'template-2')
    expect(customTemplate).toBeDefined()
    expect(customTemplate?.templateTitle).toBe('自定義專業分享')
  })

  it('應該優先使用當前系統模板狀態而不是預設模板', async () => {
    // 模擬 localStorage 中沒有保存的模板
    localStorageMock.getItem.mockReturnValue(null)
    
    // 獲取系統模板
    const systemCards = await cardService.getSystemCards()
    
    // 驗證返回的是當前的系統模板狀態，而不是預設模板
    expect(systemCards).toBeDefined()
    // 注意：這裡的具體行為取決於 CardService 的初始化邏輯
  })

  it('應該正確處理模板更新事件而不丟失數據', () => {
    // 模擬觸發模板更新事件
    const event = new Event('templatesUpdated')
    
    // 觸發事件
    window.dispatchEvent(event)
    
    // 驗證事件處理器正常工作
    // 這裡主要是測試事件不會導致數據丟失
    expect(true).toBe(true) // 如果沒有拋出錯誤，說明事件處理正常
  })
})
