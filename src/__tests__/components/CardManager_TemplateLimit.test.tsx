import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CardManager from '../../components/CardManager'
import { CardService } from '../../services/cardService'
import type { UserCard } from '../../types/cards'

// Mock auth
vi.mock('../../auth/auth', () => ({
  useSession: () => ({
    email: 'test-user@example.com'
  })
}))

// Mock CardService
vi.mock('../../services/cardService', () => ({
  CardService: {
    getInstance: vi.fn()
  }
}))

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

describe('CardManager 個人模板數量限制 UI 功能', () => {
  let mockCardService: any
  const testUserId = 'test-user@example.com'

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    // 創建 mock CardService
    mockCardService = {
      getUserCards: vi.fn(),
      createUserCard: vi.fn(),
      updateUserCard: vi.fn(),
      deleteUserCard: vi.fn(),
      canCreateMoreUserCards: vi.fn(),
      getUserCardLimit: vi.fn(),
    }
    
    // 設置 mock 實例
    vi.mocked(CardService.getInstance).mockReturnValue(mockCardService)
  })

  describe('模板數量顯示', () => {
    it('應該正確顯示當前模板數量和限制', () => {
      const mockUserCards: UserCard[] = Array.from({ length: 3 }, (_, i) => ({
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

      mockCardService.getUserCards.mockReturnValue(mockUserCards)
      mockCardService.getUserCardLimit.mockReturnValue(6)

      render(<CardManager />)

      // 應該顯示 "管理你的自定義 AI 生成卡片，創建專屬的內容生成模板 (3/6 個)"
      expect(screen.getByText(/管理你的自定義 AI 生成卡片/)).toBeInTheDocument()
      expect(screen.getByText('(3/6 個)')).toBeInTheDocument()
    })

    it('當沒有模板時應該顯示 0/6', () => {
      mockCardService.getUserCards.mockReturnValue([])
      mockCardService.getUserCardLimit.mockReturnValue(6)

      render(<CardManager />)

      expect(screen.getByText('(0/6 個)')).toBeInTheDocument()
    })
  })

  describe('新增按鈕狀態', () => {
    it('當可以創建更多模板時，新增按鈕應該啟用', () => {
      mockCardService.getUserCards.mockReturnValue([])
      mockCardService.canCreateMoreUserCards.mockReturnValue(true)
      mockCardService.getUserCardLimit.mockReturnValue(6)

      render(<CardManager />)

      const addButton = screen.getByText('新增卡片')
      expect(addButton).toBeInTheDocument()
      expect(addButton).not.toBeDisabled()
      expect(addButton).toHaveClass('bg-[color:var(--yinmn-blue)]')
    })

    it('當達到模板限制時，新增按鈕應該禁用並顯示「已達上限」', () => {
      mockCardService.getUserCards.mockReturnValue([])
      mockCardService.canCreateMoreUserCards.mockReturnValue(false)
      mockCardService.getUserCardLimit.mockReturnValue(6)

      render(<CardManager />)

      const addButton = screen.getByText('已達上限')
      expect(addButton).toBeInTheDocument()
      expect(addButton).toBeDisabled()
      expect(addButton).toHaveClass('bg-gray-300')
      expect(addButton).toHaveClass('cursor-not-allowed')
    })
  })

  describe('創建表單限制檢查', () => {
    it('創建表單應該顯示當前數量和限制', () => {
      mockCardService.getUserCards.mockReturnValue([])
      mockCardService.canCreateMoreUserCards.mockReturnValue(true)
      mockCardService.getUserCardLimit.mockReturnValue(6)

      render(<CardManager />)

      // 點擊新增按鈕
      const addButton = screen.getByText('新增卡片')
      fireEvent.click(addButton)

      // 應該顯示創建表單
      expect(screen.getByText('創建新卡片')).toBeInTheDocument()
      expect(screen.getByText('0/6 個')).toBeInTheDocument()
    })

    it('當達到限制時，創建表單應該顯示警告信息', () => {
      mockCardService.getUserCards.mockReturnValue([])
      mockCardService.canCreateMoreUserCards.mockReturnValue(false)
      mockCardService.getUserCardLimit.mockReturnValue(6)

      render(<CardManager />)

      // 當達到限制時，應該顯示「已達上限」按鈕
      expect(screen.getByText('已達上限')).toBeInTheDocument()
      expect(screen.getByText('(0/6 個)')).toBeInTheDocument()
    })
  })

  describe('錯誤處理', () => {
    it('當創建模板失敗時應該顯示錯誤信息', async () => {
      mockCardService.getUserCards.mockReturnValue([])
      mockCardService.canCreateMoreUserCards.mockReturnValue(true)
      mockCardService.getUserCardLimit.mockReturnValue(6)
      
      // 模擬創建失敗
      mockCardService.createUserCard.mockImplementation(() => {
        throw new Error('已達到個人模板數量上限（最多6個）')
      })

      // Mock window.alert
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

      render(<CardManager />)

      // 點擊新增按鈕
      const addButton = screen.getByText('新增卡片')
      fireEvent.click(addButton)

      // 填寫表單
      const titleInput = screen.getByPlaceholderText('例如：職場心得模板')
      fireEvent.change(titleInput, { target: { value: '測試模板' } })

      const promptTextarea = screen.getByPlaceholderText(/輸入 AI 生成內容的指令和規則/)
      fireEvent.change(promptTextarea, { target: { value: '測試提示詞' } })

      // 提交表單
      const submitButton = screen.getByText('創建卡片')
      fireEvent.click(submitButton)

      // 應該顯示錯誤信息
      expect(alertMock).toHaveBeenCalledWith('已達到個人模板數量上限（最多6個）')

      alertMock.mockRestore()
    })
  })

  describe('模板數量動態更新', () => {
    it('當模板數量變化時，顯示應該正確更新', () => {
      // 初始狀態：0個模板
      mockCardService.getUserCards.mockReturnValue([])
      mockCardService.canCreateMoreUserCards.mockReturnValue(true)
      mockCardService.getUserCardLimit.mockReturnValue(6)

      const { rerender } = render(<CardManager />)
      expect(screen.getByText('(0/6 個)')).toBeInTheDocument()

      // 更新狀態：3個模板
      const mockUserCards: UserCard[] = Array.from({ length: 3 }, (_, i) => ({
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

      mockCardService.getUserCards.mockReturnValue(mockUserCards)
      mockCardService.canCreateMoreUserCards.mockReturnValue(true)

      rerender(<CardManager />)
      expect(screen.getByText('(3/6 個)')).toBeInTheDocument()
    })
  })
})
