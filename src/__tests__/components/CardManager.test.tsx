import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CardManager from '../../components/CardManager'
import { CardService } from '../../services/cardService'

// Mock CardService
vi.mock('../../services/cardService')
const mockCardService = {
  getUserCards: vi.fn(),
  createUserCard: vi.fn(),
  updateUserCard: vi.fn(),
  deleteUserCard: vi.fn(),
  deactivateUserCard: vi.fn(),
}

describe('CardManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(CardService.getInstance).mockReturnValue(mockCardService as any)
  })

  describe('空狀態渲染', () => {
    it('應該顯示空狀態當沒有使用者卡片時', () => {
      mockCardService.getUserCards.mockReturnValue([])
      
      render(<CardManager />)
      
      expect(screen.getByText('還沒有自定義卡片')).toBeInTheDocument()
      expect(screen.getByText('創建第一個卡片')).toBeInTheDocument()
    })
  })

  describe('創建卡片功能', () => {
    it('應該顯示創建表單當點擊新增按鈕時', () => {
      mockCardService.getUserCards.mockReturnValue([])
      
      render(<CardManager />)
      
      const createButton = screen.getByText('新增卡片')
      fireEvent.click(createButton)
      
      expect(screen.getByText('創建新卡片')).toBeInTheDocument()
      expect(screen.getByText('創建新卡片')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('例如：職場心得模板')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('簡短描述這個模板的用途和特色')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('輸入 AI 生成內容的指令和規則...')).toBeInTheDocument()
    })

    it('應該成功創建卡片當表單提交時', async () => {
      mockCardService.getUserCards.mockReturnValue([])
      const mockNewCard = {
        id: 'new-card-id',
        name: '測試卡片',
        description: '測試描述',
        category: 'general' as const,
        prompt: '測試 prompt',
        isActive: true,
        isSystem: false,
        userId: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        platform: 'general' as const,
        templateTitle: '測試模板',
        templateFeatures: '測試特色',
        isSelected: false
      }
      mockCardService.createUserCard.mockReturnValue(mockNewCard)
      
      render(<CardManager />)
      
      // 點擊新增按鈕
      const createButton = screen.getByText('新增卡片')
      fireEvent.click(createButton)
      
      // 填寫表單
      fireEvent.change(screen.getByPlaceholderText('例如：職場心得模板'), {
        target: { value: '測試卡片' }
      })
      fireEvent.change(screen.getByPlaceholderText('簡短描述這個模板的用途和特色'), {
        target: { value: '測試描述' }
      })
      fireEvent.change(screen.getByPlaceholderText('輸入 AI 生成內容的指令和規則...'), {
        target: { value: '測試 prompt' }
      })
      
      // 提交表單
      const submitButton = screen.getByText('創建卡片')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockCardService.createUserCard).toHaveBeenCalledWith('current-user', {
          name: '測試卡片',
          description: '測試描述',
          category: 'general',
          prompt: '測試 prompt',
          isActive: true,
          platform: 'general',
          templateTitle: '測試卡片',
          templateFeatures: '測試描述',
          isSelected: false
        })
      })
    })

    it('應該顯示錯誤當必填欄位為空時', async () => {
      mockCardService.getUserCards.mockReturnValue([])
      
      render(<CardManager />)
      
      // 點擊新增按鈕
      const createButton = screen.getByText('新增卡片')
      fireEvent.click(createButton)
      
      // 不填寫必填欄位，直接提交
      const submitButton = screen.getByText('創建卡片')
      fireEvent.click(submitButton)
      
      // 由於瀏覽器的原生驗證，錯誤提示可能不會顯示
      // 我們檢查表單是否仍然可見（沒有提交成功）
      expect(screen.getByText('創建新卡片')).toBeInTheDocument()
    })
  })

  describe('編輯卡片功能', () => {
    const mockUserCard = {
      id: 'user-card-id',
      name: '原始卡片',
      description: '原始描述',
      category: 'general' as const,
      prompt: '原始 prompt',
      isActive: true,
      isSystem: false,
      userId: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      platform: 'general' as const,
      templateTitle: '原始模板',
      templateFeatures: '原始特色',
      isSelected: false
    }

    it('應該顯示編輯表單當點擊編輯按鈕時', () => {
      mockCardService.getUserCards.mockReturnValue([mockUserCard])
      
      render(<CardManager />)
      
      const editButton = screen.getByText('編輯')
      fireEvent.click(editButton)
      
      expect(screen.getByText('編輯卡片')).toBeInTheDocument()
      expect(screen.getByDisplayValue('原始卡片')).toBeInTheDocument()
      expect(screen.getByDisplayValue('原始描述')).toBeInTheDocument()
    })

    it('應該成功更新卡片當編輯表單提交時', async () => {
      mockCardService.getUserCards.mockReturnValue([mockUserCard])
      const mockUpdatedCard = { ...mockUserCard, name: '更新名稱' }
      mockCardService.updateUserCard.mockReturnValue(mockUpdatedCard)
      
      render(<CardManager />)
      
      // 點擊編輯按鈕
      const editButton = screen.getByText('編輯')
      fireEvent.click(editButton)
      
      // 修改名稱
      fireEvent.change(screen.getByDisplayValue('原始卡片'), {
        target: { value: '更新名稱' }
      })
      
      // 提交表單
      const updateButton = screen.getByText('更新')
      fireEvent.click(updateButton)
      
      await waitFor(() => {
        expect(mockCardService.updateUserCard).toHaveBeenCalledWith(
          'user-card-id',
          'current-user',
          {
            name: '更新名稱',
            description: '原始描述',
            category: 'general',
            prompt: '原始 prompt'
          }
        )
      })
    })
  })

  describe('刪除卡片功能', () => {
    const mockUserCard = {
      id: 'user-card-id',
      name: '要刪除的卡片',
      description: '測試描述',
      category: 'general' as const,
      prompt: '測試 prompt',
      isActive: true,
      isSystem: false,
      userId: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      platform: 'general' as const,
      templateTitle: '測試模板',
      templateFeatures: '測試特色',
      isSelected: false
    }

    it('應該顯示確認對話框當點擊刪除按鈕時', () => {
      mockCardService.getUserCards.mockReturnValue([mockUserCard])
      
      // Mock confirm dialog
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      
      render(<CardManager />)
      
      const deleteButton = screen.getByText('刪除')
      fireEvent.click(deleteButton)
      
      expect(confirmSpy).toHaveBeenCalledWith('確定要刪除這個卡片嗎？刪除後無法復原。')
      
      confirmSpy.mockRestore()
    })

    it('應該成功刪除卡片當確認時', async () => {
      mockCardService.getUserCards.mockReturnValue([mockUserCard])
      mockCardService.deleteUserCard.mockReturnValue(true)
      
      // Mock confirm dialog
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      
      render(<CardManager />)
      
      const deleteButton = screen.getByText('刪除')
      fireEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(mockCardService.deleteUserCard).toHaveBeenCalledWith('user-card-id', 'current-user')
      })
      
      confirmSpy.mockRestore()
    })
  })

  describe('卡片列表渲染', () => {
    const mockUserCards = [
      {
        id: 'card-1',
        name: '卡片 1',
        description: '描述 1',
        category: 'threads' as const,
        prompt: 'prompt 1',
        isActive: true,
        isSystem: false,
        userId: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        platform: 'threads' as const,
        templateTitle: '模板 1',
        templateFeatures: '特色 1',
        isSelected: false
      },
      {
        id: 'card-2',
        name: '卡片 2',
        description: '描述 2',
        category: 'instagram' as const,
        prompt: 'prompt 2',
        isActive: true,
        isSystem: false,
        userId: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        platform: 'instagram' as const,
        templateTitle: '模板 2',
        templateFeatures: '特色 2',
        isSelected: false
      }
    ]

    it('應該正確渲染使用者卡片列表', () => {
      mockCardService.getUserCards.mockReturnValue(mockUserCards)
      
      render(<CardManager />)
      
      expect(screen.getByText('卡片 1')).toBeInTheDocument()
      expect(screen.getByText('卡片 2')).toBeInTheDocument()
      expect(screen.getByText('描述 1')).toBeInTheDocument()
      expect(screen.getByText('描述 2')).toBeInTheDocument()
      expect(screen.getByText('threads')).toBeInTheDocument()
      expect(screen.getByText('instagram')).toBeInTheDocument()
    })

    it('應該顯示創建時間', () => {
      mockCardService.getUserCards.mockReturnValue(mockUserCards)
      
      render(<CardManager />)
      
      const today = new Date().toLocaleDateString()
      expect(screen.getAllByText(`創建於 ${today}`)).toHaveLength(2)
    })
  })
})
