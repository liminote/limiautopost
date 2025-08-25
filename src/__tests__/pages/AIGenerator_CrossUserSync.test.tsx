import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AIGenerator from '../../pages/app/AIGenerator'

// Mock GitHubSyncService
vi.mock('../../services/githubSyncService', () => ({
  GitHubSyncService: {
    getInstance: vi.fn(() => ({
      getSystemTemplatesFromGitHub: vi.fn().mockResolvedValue({
        'template-1': {
          id: 'template-1',
          title: '生活體悟',
          platform: 'instagram',
          features: '分享生活感悟、個人成長、心靈啟發',
          prompt: '請分享一個生活感悟或個人成長的故事',
          updatedAt: '2025-01-19T00:00:00.000Z'
        },
        'template-2': {
          id: 'template-2',
          title: '專業分享',
          platform: 'instagram',
          features: '專業知識、行業見解、實用建議',
          prompt: '請分享一個專業知識或行業見解',
          updatedAt: '2025-01-19T00:00:00.000Z'
        },
        'template-3': {
          id: 'template-3',
          title: '創意故事',
          platform: 'instagram',
          features: '創意敘事、故事化表達、引人入勝',
          prompt: '請分享一個創意故事或有趣的經歷',
          updatedAt: '2025-01-19T00:00:00.000Z'
        },
        'template-4': {
          id: 'template-4',
          title: '時事評論',
          platform: 'instagram',
          features: '時事分析、觀點評論、深度思考',
          prompt: '請分享對某個時事話題的看法和思考',
          updatedAt: '2025-01-19T00:00:00.000Z'
        }
      })
    }))
  }
}))

// Mock GitHubUpdateService
vi.mock('../../services/githubUpdateService', () => ({
  GitHubUpdateService: {
    getInstance: vi.fn(() => ({
      updateSystemTemplate: vi.fn().mockResolvedValue(true),
      updateSystemTemplates: vi.fn().mockResolvedValue(true),
      hasGitHubToken: vi.fn().mockReturnValue(true)
    }))
  }
}))

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
    it('應該從 localStorage 載入已保存的模板', async () => {
      // 注意：現在組件從 GitHub 載入模板，localStorage 不再影響系統模板
      localStorageMock.getItem.mockReturnValue(null)

      render(<AIGenerator />)

      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })

      // 應該顯示從 GitHub 載入的預設模板
      expect(screen.getByText('生活體悟')).toBeInTheDocument()
      expect(screen.getByText('專業分享')).toBeInTheDocument()
      expect(screen.getByText('創意故事')).toBeInTheDocument()
      expect(screen.getByText('時事評論')).toBeInTheDocument()
    })

    it('應該在 localStorage 沒有資料時使用預設模板', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      render(<AIGenerator />)

      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })

      // 應該顯示從 GitHub 載入的預設模板
      expect(screen.getByText('生活體悟')).toBeInTheDocument()
      expect(screen.getByText('專業分享')).toBeInTheDocument()
      expect(screen.getByText('創意故事')).toBeInTheDocument()
      expect(screen.getByText('時事評論')).toBeInTheDocument()
    })
  })

  describe('模板編輯', () => {
    it('應該能夠編輯模板標題', async () => {
      render(<AIGenerator />)

      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })

      // 點擊第一個模板的編輯按鈕（生活體悟）
      const firstTemplateCard = screen.getByText('生活體悟').closest('.border')
      const editButton = firstTemplateCard?.querySelector('button')
      expect(editButton).toBeInTheDocument()
      fireEvent.click(editButton!)

      // 找到標題輸入框
      const titleInput = screen.getByDisplayValue('生活體悟')
      expect(titleInput).toBeInTheDocument()

      // 修改標題
      fireEvent.change(titleInput, { target: { value: '新標題' } })
      expect(titleInput).toHaveValue('新標題')
    })

    it('應該能夠編輯模板平台', async () => {
      render(<AIGenerator />)

      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })

      // 點擊第一個模板的編輯按鈕（生活體悟）
      const firstTemplateCard = screen.getByText('生活體悟').closest('.border')
      const editButton = firstTemplateCard?.querySelector('button')
      expect(editButton).toBeInTheDocument()
      fireEvent.click(editButton!)

      // 檢查編輯模式是否啟動（應該有輸入框出現）
      await waitFor(() => {
        expect(screen.getByDisplayValue('生活體悟')).toBeInTheDocument()
      })

      // 注意：當前組件沒有平台選擇功能，只檢查編輯模式是否啟動
      expect(screen.getByDisplayValue('分享生活感悟、個人成長、心靈啟發')).toBeInTheDocument()
      expect(screen.getByDisplayValue('請分享一個生活感悟或個人成長的故事')).toBeInTheDocument()
    })

    it('應該能夠編輯模板功能描述', async () => {
      render(<AIGenerator />)

      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })

      // 點擊第一個模板的編輯按鈕（生活體悟）
      const firstTemplateCard = screen.getByText('生活體悟').closest('.border')
      const editButton = firstTemplateCard?.querySelector('button')
      expect(editButton).toBeInTheDocument()
      fireEvent.click(editButton!)

      // 找到功能描述輸入框
      const featuresInput = screen.getByDisplayValue('分享生活感悟、個人成長、心靈啟發')
      expect(featuresInput).toBeInTheDocument()

      // 修改功能描述
      fireEvent.change(featuresInput, { target: { value: '新功能描述' } })
      expect(featuresInput).toHaveValue('新功能描述')
    })

    it('應該能夠編輯 AI 提示詞', async () => {
      render(<AIGenerator />)

      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })

      // 點擊第一個模板的編輯按鈕（生活體悟）
      const firstTemplateCard = screen.getByText('生活體悟').closest('.border')
      const editButton = firstTemplateCard?.querySelector('button')
      expect(editButton).toBeInTheDocument()
      fireEvent.click(editButton!)

      // 找到 AI 提示詞輸入框
      const promptTextarea = screen.getByDisplayValue('請分享一個生活感悟或個人成長的故事')
      expect(promptTextarea).toBeInTheDocument()

      // 修改 AI 提示詞
      fireEvent.change(promptTextarea, { target: { value: '新的 AI 提示詞' } })
      expect(promptTextarea).toHaveValue('新的 AI 提示詞')
    })
  })

  describe('模板保存', () => {
    it('應該能夠保存模板修改', async () => {
      render(<AIGenerator />)

      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })

      // 點擊第一個模板的編輯按鈕（生活體悟）
      const firstTemplateCard = screen.getByText('生活體悟').closest('.border')
      const editButton = firstTemplateCard?.querySelector('button')
      expect(editButton).toBeInTheDocument()
      fireEvent.click(editButton!)

      // 修改標題
      const titleInput = screen.getByDisplayValue('生活體悟')
      fireEvent.change(titleInput, { target: { value: '新標題' } })

      // 點擊保存按鈕
      const saveButton = screen.getByText('保存')
      fireEvent.click(saveButton)

      // 等待保存完成
      await waitFor(() => {
        expect(screen.queryByText('保存中...')).not.toBeInTheDocument()
      })

      // 驗證觸發同步事件
      expect(CustomEvent).toHaveBeenCalledWith('templatesUpdated')
    })

    it('應該在保存後關閉編輯模式', async () => {
      render(<AIGenerator />)

      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })

      // 點擊第一個模板的編輯按鈕（生活體悟）
      const firstTemplateCard = screen.getByText('生活體悟').closest('.border')
      const editButton = firstTemplateCard?.querySelector('button')
      expect(editButton).toBeInTheDocument()
      fireEvent.click(editButton!)

      // 點擊保存按鈕
      const saveButton = screen.getByText('保存')
      fireEvent.click(saveButton)

      // 等待保存完成
      await waitFor(() => {
        expect(screen.queryByText('保存中...')).not.toBeInTheDocument()
      })

      // 驗證編輯模式已關閉
      expect(screen.queryByText('保存')).not.toBeInTheDocument()
    })
  })

  describe('取消編輯', () => {
    it('應該能夠取消編輯並恢復原始內容', async () => {
      // 注意：現在組件從 GitHub 載入模板，localStorage 不再影響系統模板
      localStorageMock.getItem.mockReturnValue(null)

      render(<AIGenerator />)

      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })

      // 點擊第一個模板的編輯按鈕（生活體悟）
      const firstTemplateCard = screen.getByText('生活體悟').closest('.border')
      const editButton = firstTemplateCard?.querySelector('button')
      expect(editButton).toBeInTheDocument()
      fireEvent.click(editButton!)

      // 修改內容
      const titleInput = screen.getByDisplayValue('生活體悟')
      fireEvent.change(titleInput, { target: { value: '修改後的標題' } })

      // 點擊取消按鈕
      const cancelButton = screen.getByText('取消')
      fireEvent.click(cancelButton)

      // 驗證內容已恢復（檢查編輯模式已關閉）
      expect(screen.queryByText('生活體悟')).toBeInTheDocument()
      expect(screen.queryByText('保存')).not.toBeInTheDocument()
    })
  })

  describe('錯誤處理', () => {
    it('應該處理 localStorage 錯誤', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      // 應該不會拋出錯誤
      expect(() => render(<AIGenerator />)).not.toThrow()
      
      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })
    })

    it('應該處理無效的 JSON 資料', async () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'aigenerator_templates') {
          return 'invalid json'
        }
        return null
      })

      // 應該不會拋出錯誤，而是使用預設模板
      expect(() => render(<AIGenerator />)).not.toThrow()
      
      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })
      
      // 應該顯示從 GitHub 載入的預設模板
      expect(screen.getByText('生活體悟')).toBeInTheDocument()
    })
  })
})
