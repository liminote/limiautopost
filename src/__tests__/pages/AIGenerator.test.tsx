import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AIGenerator from '../../pages/app/AIGenerator'
import { CardService, AIGenerationService } from '../../services/cardService'

// Mock services
vi.mock('../../services/cardService')
const mockCardService = {
  getSelectedTemplates: vi.fn(),
}
const mockAIService = {
  generateContent: vi.fn(),
}

describe('AIGenerator', () => {
  const mockTemplates = [
    {
      id: 'template-1',
      name: 'Threads 第一則貼文',
      description: '生成 Threads 第一則貼文，字數 480-500 字',
      category: 'threads' as const,
      prompt: '測試 prompt 1',
      isActive: true,
      isSystem: true,
      userId: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      platform: 'threads' as const,
      templateTitle: 'Threads 第一則貼文',
      templateFeatures: '480-500字，完整觀點論述，獨立主題',
      isSelected: true
    },
    {
      id: 'template-2',
      name: 'Instagram 貼文',
      description: '生成 Instagram 貼文，語氣溫暖具洞察力',
      category: 'instagram' as const,
      prompt: '測試 prompt 2',
      isActive: true,
      isSystem: true,
      userId: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      platform: 'instagram' as const,
      templateTitle: 'Instagram 貼文',
      templateFeatures: '溫暖語氣，開放式問題結尾，具洞察力',
      isSelected: true
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(CardService.getInstance).mockReturnValue(mockCardService as any)
    vi.mocked(AIGenerationService.getInstance).mockReturnValue(mockAIService as any)
    
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    })
  })

  describe('初始渲染', () => {
    it('應該顯示頁面標題和描述', () => {
      mockCardService.getSelectedTemplates.mockReturnValue([])
      
      render(<AIGenerator />)
      
      expect(screen.getByText('貼文生成器')).toBeInTheDocument()
      expect(screen.getByText('選擇模板，輸入主題，AI 自動生成貼文內容')).toBeInTheDocument()
    })

    it('應該顯示模板選擇區域', () => {
      mockCardService.getSelectedTemplates.mockReturnValue([])
      
      render(<AIGenerator />)
      
      expect(screen.getByText('選擇模板')).toBeInTheDocument()
      expect(screen.getByText('前往設定管理模板 →')).toBeInTheDocument()
    })

    it('應該顯示生成設定區域', () => {
      mockCardService.getSelectedTemplates.mockReturnValue([])
      
      render(<AIGenerator />)
      
      expect(screen.getByText('生成設定')).toBeInTheDocument()
      expect(screen.getByLabelText('主題 / 關鍵字 *')).toBeInTheDocument()
      expect(screen.getByLabelText('內容風格')).toBeInTheDocument()
      expect(screen.getByLabelText('額外說明（選填）')).toBeInTheDocument()
    })
  })

  describe('模板選擇狀態', () => {
    it('應該顯示空狀態當沒有選擇模板時', () => {
      mockCardService.getSelectedTemplates.mockReturnValue([])
      
      render(<AIGenerator />)
      
      expect(screen.getByText('還沒有選擇任何模板')).toBeInTheDocument()
      expect(screen.getByText('前往設定選擇模板')).toBeInTheDocument()
    })

    it('應該顯示已選擇的模板', () => {
      mockCardService.getSelectedTemplates.mockReturnValue(mockTemplates)
      
      render(<AIGenerator />)
      
      expect(screen.getByText('Threads 第一則貼文')).toBeInTheDocument()
      expect(screen.getByText('Instagram 貼文')).toBeInTheDocument()
      expect(screen.getByText('480-500字，完整觀點論述，獨立主題')).toBeInTheDocument()
      expect(screen.getByText('溫暖語氣，開放式問題結尾，具洞察力')).toBeInTheDocument()
    })

    it('應該顯示系統預設標籤', () => {
      mockCardService.getSelectedTemplates.mockReturnValue(mockTemplates)
      
      render(<AIGenerator />)
      
      const systemLabels = screen.getAllByText('系統預設')
      expect(systemLabels).toHaveLength(2)
    })

    it('應該顯示平台和類別標籤', () => {
      mockCardService.getSelectedTemplates.mockReturnValue(mockTemplates)
      
      render(<AIGenerator />)
      
      expect(screen.getAllByText('threads')).toHaveLength(2) // platform + category
      expect(screen.getAllByText('instagram')).toHaveLength(2) // platform + category
    })
  })

  describe('表單互動', () => {
    beforeEach(() => {
      mockCardService.getSelectedTemplates.mockReturnValue(mockTemplates)
    })

    it('應該允許輸入主題', () => {
      render(<AIGenerator />)
      
      const topicInput = screen.getByLabelText('主題 / 關鍵字 *')
      fireEvent.change(topicInput, { target: { value: '職場溝通技巧' } })
      
      expect(topicInput).toHaveValue('職場溝通技巧')
    })

    it('應該允許選擇風格', () => {
      render(<AIGenerator />)
      
      const styleSelect = screen.getByLabelText('內容風格')
      fireEvent.change(styleSelect, { target: { value: 'professional' } })
      
      expect(styleSelect).toHaveValue('professional')
    })

    it('應該允許輸入額外說明', () => {
      render(<AIGenerator />)
      
      const contextTextarea = screen.getByLabelText('額外說明（選填）')
      fireEvent.change(contextTextarea, { target: { value: '針對初階主管' } })
      
      expect(contextTextarea).toHaveValue('針對初階主管')
    })
  })

  describe('內容生成', () => {
    beforeEach(() => {
      mockCardService.getSelectedTemplates.mockReturnValue(mockTemplates)
    })

    it('應該禁用生成按鈕當沒有主題時', () => {
      render(<AIGenerator />)
      
      const generateButton = screen.getByText('生成內容')
      expect(generateButton).toBeDisabled()
    })

    it('應該禁用生成按鈕當沒有選擇模板時', () => {
      mockCardService.getSelectedTemplates.mockReturnValue([])
      
      render(<AIGenerator />)
      
      const generateButton = screen.getByText('生成內容')
      expect(generateButton).toBeDisabled()
    })

    it('應該成功生成內容', async () => {
      const mockResult = {
        threads: [
          { content: '這是 Threads 第一則貼文內容' },
          { content: '這是 Threads 第二則貼文內容' }
        ],
        instagram: { content: '這是 Instagram 貼文內容' }
      }
      mockAIService.generateContent.mockResolvedValue(mockResult)
      
      render(<AIGenerator />)
      
      // 輸入主題
      const topicInput = screen.getByLabelText('主題 / 關鍵字 *')
      fireEvent.change(topicInput, { target: { value: '職場溝通技巧' } })
      
      // 點擊生成按鈕
      const generateButton = screen.getByText('生成內容')
      fireEvent.click(generateButton)
      
      // 檢查載入狀態
      expect(screen.getByText('生成中...')).toBeInTheDocument()
      
      // 等待生成完成
      await waitFor(() => {
        expect(screen.getByText('生成結果')).toBeInTheDocument()
      })
      
      // 檢查結果內容
      expect(screen.getAllByText('這是 Threads 第一則貼文內容')).toHaveLength(2) // 兩個模板都會生成
      expect(screen.getByText('這是 Instagram 貼文內容')).toBeInTheDocument()
    })

    it('應該處理生成錯誤', async () => {
      mockAIService.generateContent.mockRejectedValue(new Error('生成失敗'))
      
      render(<AIGenerator />)
      
      // 輸入主題
      const topicInput = screen.getByLabelText('主題 / 關鍵字 *')
      fireEvent.change(topicInput, { target: { value: '職場溝通技巧' } })
      
      // 點擊生成按鈕
      const generateButton = screen.getByText('生成內容')
      fireEvent.click(generateButton)
      
      // 等待錯誤顯示
      await waitFor(() => {
        expect(screen.getByText('生成失敗')).toBeInTheDocument()
      })
    })
  })

  describe('結果操作', () => {
    beforeEach(() => {
      mockCardService.getSelectedTemplates.mockReturnValue(mockTemplates)
      const mockResult = {
        threads: [
          { content: 'Threads 第一則內容' },
          { content: 'Threads 第二則內容' }
        ],
        instagram: { content: 'Instagram 內容' }
      }
      mockAIService.generateContent.mockResolvedValue(mockResult)
    })

    it('應該顯示複製按鈕', async () => {
      render(<AIGenerator />)
      
      // 生成內容
      const topicInput = screen.getByLabelText('主題 / 關鍵字 *')
      fireEvent.change(topicInput, { target: { value: '職場溝通技巧' } })
      
      const generateButton = screen.getByText('生成內容')
      fireEvent.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText('生成結果')).toBeInTheDocument()
      })
      
      // 檢查複製按鈕
      const copyButtons = screen.getAllByText('複製')
      expect(copyButtons).toHaveLength(5) // 4個 Threads + 1個 Instagram (因為每個模板都會生成內容)
    })

    it('應該可以複製內容到剪貼簿', async () => {
      render(<AIGenerator />)
      
      // 生成內容
      const topicInput = screen.getByLabelText('主題 / 關鍵字 *')
      fireEvent.change(topicInput, { target: { value: '職場溝通技巧' } })
      
      const generateButton = screen.getByText('生成內容')
      fireEvent.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText('生成結果')).toBeInTheDocument()
      })
      
      // 點擊複製按鈕
      const copyButtons = screen.getAllByText('複製')
      fireEvent.click(copyButtons[0])
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Threads 第一則內容')
    })

    it('應該可以複製全部 JSON', async () => {
      render(<AIGenerator />)
      
      // 生成內容
      const topicInput = screen.getByLabelText('主題 / 關鍵字 *')
      fireEvent.change(topicInput, { target: { value: '職場溝通技巧' } })
      
      const generateButton = screen.getByText('生成內容')
      fireEvent.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText('生成結果')).toBeInTheDocument()
      })
      
      // 點擊複製全部 JSON 按鈕
      const copyAllButton = screen.getByText('複製全部 JSON')
      fireEvent.click(copyAllButton)
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        JSON.stringify({
          threads: [
            { content: 'Threads 第一則內容' },
            { content: 'Threads 第二則內容' },
            { content: 'Threads 第一則內容' },
            { content: 'Threads 第二則內容' }
          ],
          instagram: { content: 'Instagram 內容' }
        }, null, 2)
      )
    })
  })

  describe('重置功能', () => {
    beforeEach(() => {
      mockCardService.getSelectedTemplates.mockReturnValue(mockTemplates)
    })

    it('應該重置表單到初始狀態', async () => {
      const mockResult = {
        threads: [{ content: '測試內容' }],
        instagram: { content: '測試內容' }
      }
      mockAIService.generateContent.mockResolvedValue(mockResult)
      
      render(<AIGenerator />)
      
      // 填寫表單
      const topicInput = screen.getByLabelText('主題 / 關鍵字 *')
      fireEvent.change(topicInput, { target: { value: '職場溝通技巧' } })
      
      const contextTextarea = screen.getByLabelText('額外說明（選填）')
      fireEvent.change(contextTextarea, { target: { value: '額外說明' } })
      
      // 生成內容
      const generateButton = screen.getByText('生成內容')
      fireEvent.click(generateButton)
      
      await waitFor(() => {
        expect(screen.getByText('生成結果')).toBeInTheDocument()
      })
      
      // 點擊重置按鈕
      const resetButton = screen.getByText('重置')
      fireEvent.click(resetButton)
      
      // 檢查表單是否重置
      expect(topicInput).toHaveValue('')
      expect(contextTextarea).toHaveValue('')
      expect(screen.queryByText('生成結果')).not.toBeInTheDocument()
    })
  })
})
