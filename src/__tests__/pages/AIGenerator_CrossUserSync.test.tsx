import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AIGenerator from '../../pages/app/AIGenerator'

// Mock AdminSubnav 組件
vi.mock('../../components/AdminSubnav', () => ({
  default: () => <div data-testid="admin-subnav">Admin Subnav</div>
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

describe('AIGenerator 跨使用者同步功能', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('模板載入', () => {
    it('應該從 localStorage 載入已保存的模板', () => {
      const mockSavedTemplates = {
        'template-1': {
          id: 'template-1',
          platform: 'instagram',
          title: '已保存的標題',
          features: '已保存的功能',
          prompt: '已保存的提示詞',
          updatedAt: new Date().toISOString()
        }
      }

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'aigenerator_templates') {
          return JSON.stringify(mockSavedTemplates)
        }
        return null
      })

      render(<AIGenerator />)

      // 驗證已保存的內容被載入
      expect(screen.getByText('已保存的標題')).toBeInTheDocument()
      expect(screen.getByText('已保存的功能')).toBeInTheDocument()
      expect(screen.getByText('Instagram')).toBeInTheDocument()
    })

    it('應該在 localStorage 沒有資料時使用預設模板', () => {
      localStorageMock.getItem.mockReturnValue(null)

      render(<AIGenerator />)

      // 驗證預設模板被載入
      expect(screen.getByText('生活體悟')).toBeInTheDocument()
      expect(screen.getByText('專業分享')).toBeInTheDocument()
      expect(screen.getByText('創意故事')).toBeInTheDocument()
      expect(screen.getByText('時事評論')).toBeInTheDocument()
    })
  })

  describe('模板編輯', () => {
    it('應該能夠編輯模板標題', async () => {
      render(<AIGenerator />)

      // 點擊編輯按鈕
      const editButtons = screen.getAllByText('編輯')
      fireEvent.click(editButtons[0])

      // 找到標題輸入框
      const titleInput = screen.getByDisplayValue('生活體悟')
      expect(titleInput).toBeInTheDocument()

      // 修改標題
      fireEvent.change(titleInput, { target: { value: '新標題' } })
      expect(titleInput).toHaveValue('新標題')
    })

    it('應該能夠編輯模板平台', async () => {
      render(<AIGenerator />)

      // 點擊編輯按鈕
      const editButtons = screen.getAllByText('編輯')
      fireEvent.click(editButtons[0])

      // 找到平台選擇框
      const platformSelect = screen.getByDisplayValue('threads')
      expect(platformSelect).toBeInTheDocument()

      // 修改平台
      fireEvent.change(platformSelect, { target: { value: 'instagram' } })
      expect(platformSelect).toHaveValue('instagram')
    })

    it('應該能夠編輯模板功能描述', async () => {
      render(<AIGenerator />)

      // 點擊編輯按鈕
      const editButtons = screen.getAllByText('編輯')
      fireEvent.click(editButtons[0])

      // 找到功能描述輸入框
      const featuresInput = screen.getByDisplayValue('分享生活感悟、個人成長、心靈啟發')
      expect(featuresInput).toBeInTheDocument()

      // 修改功能描述
      fireEvent.change(featuresInput, { target: { value: '新功能描述' } })
      expect(featuresInput).toHaveValue('新功能描述')
    })

    it('應該能夠編輯 AI 提示詞', async () => {
      render(<AIGenerator />)

      // 點擊編輯按鈕
      const editButtons = screen.getAllByText('編輯')
      fireEvent.click(editButtons[0])

      // 找到 AI 提示詞輸入框
      const promptTextarea = screen.getByDisplayValue(/請嚴格遵守以下規則生成 Threads 第一則貼文/)
      expect(promptTextarea).toBeInTheDocument()

      // 修改 AI 提示詞
      fireEvent.change(promptTextarea, { target: { value: '新的 AI 提示詞' } })
      expect(promptTextarea).toHaveValue('新的 AI 提示詞')
    })
  })

  describe('模板保存', () => {
    it('應該能夠保存模板修改', async () => {
      render(<AIGenerator />)

      // 點擊編輯按鈕
      const editButtons = screen.getAllByText('編輯')
      fireEvent.click(editButtons[0])

      // 修改標題
      const titleInput = screen.getByDisplayValue('生活體悟')
      fireEvent.change(titleInput, { target: { value: '新標題' } })

      // 點擊保存按鈕
      const saveButton = screen.getByText('保存')
      fireEvent.click(saveButton)

      // 驗證保存到 localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'aigenerator_templates',
        expect.stringContaining('新標題')
      )

      // 驗證觸發同步事件
      expect(CustomEvent).toHaveBeenCalledWith('templatesUpdated')
    })

    it('應該在保存後關閉編輯模式', async () => {
      render(<AIGenerator />)

      // 點擊編輯按鈕
      const editButtons = screen.getAllByText('編輯')
      fireEvent.click(editButtons[0])

      // 點擊保存按鈕
      const saveButton = screen.getByText('保存')
      fireEvent.click(saveButton)

      // 等待保存完成
      await waitFor(() => {
        expect(screen.queryByText('保存')).not.toBeInTheDocument()
      })

      // 驗證編輯模式已關閉
      expect(screen.getByText('編輯')).toBeInTheDocument()
    })
  })

  describe('取消編輯', () => {
    it('應該能夠取消編輯並恢復原始內容', async () => {
      const mockSavedTemplates = {
        'template-1': {
          id: 'template-1',
          platform: 'instagram',
          title: '已保存的標題',
          features: '已保存的功能',
          prompt: '已保存的提示詞',
          updatedAt: new Date().toISOString()
        }
      }

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'aigenerator_templates') {
          return JSON.stringify(mockSavedTemplates)
        }
        return null
      })

      render(<AIGenerator />)

      // 點擊編輯按鈕
      const editButtons = screen.getAllByText('編輯')
      fireEvent.click(editButtons[0])

      // 修改內容
      const titleInput = screen.getByDisplayValue('已保存的標題')
      fireEvent.change(titleInput, { target: { value: '修改後的標題' } })

      // 點擊取消按鈕
      const cancelButton = screen.getByText('取消')
      fireEvent.click(cancelButton)

      // 驗證內容已恢復
      expect(screen.getByText('已保存的標題')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('修改後的標題')).not.toBeInTheDocument()
    })
  })

  describe('錯誤處理', () => {
    it('應該處理 localStorage 錯誤', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      // 應該不會拋出錯誤
      expect(() => render(<AIGenerator />)).not.toThrow()
    })

    it('應該處理無效的 JSON 資料', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'aigenerator_templates') {
          return 'invalid json'
        }
        return null
      })

      // 應該不會拋出錯誤，而是使用預設模板
      expect(() => render(<AIGenerator />)).not.toThrow()
      expect(screen.getByText('生活體悟')).toBeInTheDocument()
    })
  })
})
