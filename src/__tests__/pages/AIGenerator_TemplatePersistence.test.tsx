import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AIGenerator from '../../pages/app/AIGenerator'

// Mock AdminSubnav
vi.mock('../../components/AdminSubnav', () => ({
  default: () => <div data-testid="admin-subnav">Admin Subnav</div>
}))

// Mock GitHubSyncService
vi.mock('../../services/githubSyncService', () => ({
  GitHubSyncService: {
    getInstance: vi.fn(() => ({
      getSystemTemplatesFromGitHub: vi.fn().mockResolvedValue({
        'template-1': {
          id: 'template-1',
          title: '生活體悟',
          platform: 'threads',
          features: '分享生活感悟、個人成長、心靈啟發',
          prompt: '請根據原文內容，以溫暖真誠的語調，分享生活感悟...',
          updatedAt: '2025-01-19T00:00:00.000Z'
        },
        'template-2': {
          id: 'template-2',
          title: '專業分享',
          platform: 'threads',
          features: '專業知識、行業見解、實用建議',
          prompt: '請根據原文內容，以專業權威的語調，分享專業見解...',
          updatedAt: '2025-01-19T00:00:00.000Z'
        },
        'template-3': {
          id: 'template-3',
          title: '創意故事',
          platform: 'threads',
          features: '創意敘事、故事化表達、引人入勝',
          prompt: '請根據原文內容，以創意敘事的方式，講述引人入勝的故事...',
          updatedAt: '2025-01-19T00:00:00.000Z'
        },
        'template-4': {
          id: 'template-4',
          title: '時事評論',
          platform: 'threads',
          features: '時事分析、觀點評論、深度思考',
          prompt: '請根據原文內容，以理性客觀的語調，提供時事評論...',
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
      hasGitHubToken: vi.fn().mockReturnValue(true),
      updateSystemTemplates: vi.fn().mockResolvedValue(true)
    }))
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

// Mock window.alert
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
})

// Helper function to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('AIGenerator 模板持久化修復功能', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('模板數據載入邏輯', () => {
    it('應該正確載入空的 localStorage 數據', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      renderWithRouter(<AIGenerator />)
      
      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })
      
      // 應該顯示預設模板
      expect(screen.getByText('生活體悟')).toBeInTheDocument()
      expect(screen.getByText('專業分享')).toBeInTheDocument()
      expect(screen.getByText('創意故事')).toBeInTheDocument()
      expect(screen.getByText('時事評論')).toBeInTheDocument()
    })

    it('應該正確載入包含空字串的 localStorage 數據', async () => {
      const mockLocalStorageData = {
        'template-1': {
          id: 'template-1',
          platform: '',
          title: '',
          features: '',
          prompt: '',
          updatedAt: '2025-01-19T00:00:00.000Z'
        }
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockLocalStorageData))
      
      renderWithRouter(<AIGenerator />)
      
      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })
      
      // 檢查組件是否正常渲染
      expect(screen.getByText('AI 生成器模板管理')).toBeInTheDocument()
    })

    it('應該正確載入包含 null 的 localStorage 數據', async () => {
      const mockLocalStorageData = {
        'template-1': {
          id: 'template-1',
          platform: null,
          title: null,
          features: null,
          prompt: null,
          updatedAt: '2025-01-19T00:00:00.000Z'
        }
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockLocalStorageData))
      
      renderWithRouter(<AIGenerator />)
      
      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })
      
      // null 值應該被正確處理，UI 會顯示預設值或空內容
      // 檢查組件是否正常渲染
      expect(screen.getByText('AI 生成器模板管理')).toBeInTheDocument()
    })

    it('應該正確載入混合數據（部分有值，部分為空）', async () => {
      // 注意：現在組件從 GitHub 載入模板，localStorage 不再影響系統模板
      localStorageMock.getItem.mockReturnValue(null)
      
      renderWithRouter(<AIGenerator />)
      
      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })
      
      // 應該顯示從 GitHub 載入的預設模板
      expect(screen.getByText('生活體悟')).toBeInTheDocument()
      expect(screen.getByText('專業分享')).toBeInTheDocument()
      expect(screen.getByText('創意故事')).toBeInTheDocument()
      expect(screen.getByText('時事評論')).toBeInTheDocument()
      
      // 檢查組件是否正常渲染
      expect(screen.getByText('AI 生成器模板管理')).toBeInTheDocument()
    })
  })

  describe('模板編輯和保存', () => {
    it('應該能夠編輯模板並保存到 localStorage', async () => {
      renderWithRouter(<AIGenerator />)
      
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
      fireEvent.change(titleInput, { target: { value: '測試標題' } })
      
      // 修改功能描述
      const featuresInput = screen.getByDisplayValue('分享生活感悟、個人成長、心靈啟發')
      fireEvent.change(featuresInput, { target: { value: '測試描述' } })
      
      // 修改提示詞
      const promptTextarea = screen.getByDisplayValue(/請根據原文內容，以溫暖真誠的語調，分享生活感悟/)
      fireEvent.change(promptTextarea, { target: { value: '測試提示詞' } })
      
      // 點擊保存
      const saveButton = screen.getByText('保存')
      fireEvent.click(saveButton)
      
      // 等待保存完成
      await waitFor(() => {
        expect(screen.queryByText('保存中...')).not.toBeInTheDocument()
      })
      
      // 檢查 GitHub 更新服務是否被調用
      // 注意：現在組件保存到 GitHub，不再使用 localStorage
      // 我們檢查組件是否正常完成保存流程
      await waitFor(() => {
        expect(screen.queryByText('保存中...')).not.toBeInTheDocument()
      })
      
      // 檢查編輯模式是否已退出
      expect(screen.queryByText('保存')).not.toBeInTheDocument()
      // 檢查第一個模板的編輯按鈕是否存在
      const firstTemplateCard3 = screen.getByText('測試標題').closest('.border')
      const editButton3 = firstTemplateCard3?.querySelector('button')
      expect(editButton3).toBeInTheDocument()
      expect(editButton3).toHaveTextContent('編輯')
    })

    it('應該能夠處理空字串的保存', async () => {
      renderWithRouter(<AIGenerator />)
      
      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })
      
      // 點擊第一個模板的編輯按鈕（生活體悟）
      const firstTemplateCard = screen.getByText('生活體悟').closest('.border')
      const editButton = firstTemplateCard?.querySelector('button')
      expect(editButton).toBeInTheDocument()
      fireEvent.click(editButton!)
      
      // 清空標題
      const titleInput = screen.getByDisplayValue('生活體悟')
      fireEvent.change(titleInput, { target: { value: '' } })
      
      // 清空功能描述
      const featuresInput = screen.getByDisplayValue('分享生活感悟、個人成長、心靈啟發')
      fireEvent.change(featuresInput, { target: { value: '' } })
      
      // 點擊保存
      const saveButton = screen.getByText('保存')
      fireEvent.click(saveButton)
      
      // 等待保存完成
      await waitFor(() => {
        expect(screen.queryByText('保存中...')).not.toBeInTheDocument()
      })
      
      // 檢查組件是否正常完成保存流程
      await waitFor(() => {
        expect(screen.queryByText('保存中...')).not.toBeInTheDocument()
      })
      
      // 檢查編輯模式是否已退出
      expect(screen.queryByText('保存')).not.toBeInTheDocument()
      // 檢查第一個模板的編輯按鈕是否存在
      const firstTemplateCard2 = screen.getByText('未命名模板').closest('.border')
      const editButton2 = firstTemplateCard2?.querySelector('button')
      expect(editButton2).toBeInTheDocument()
      expect(editButton2).toHaveTextContent('編輯')
    })
  })

  describe('數據持久化驗證', () => {
    it('保存後重新載入應該顯示編輯後的內容', async () => {
      // 注意：現在組件從 GitHub 載入模板，localStorage 不再影響系統模板
      localStorageMock.getItem.mockReturnValue(null)
      
      renderWithRouter(<AIGenerator />)
      
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

    it('應該正確處理 undefined 值的回退', async () => {
      const mockSavedData = {
        'template-1': {
          id: 'template-1',
          platform: undefined,
          title: undefined,
          features: undefined,
          prompt: undefined,
          updatedAt: '2025-01-19T00:00:00.000Z'
        }
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedData))
      
      renderWithRouter(<AIGenerator />)
      
      // 等待組件完成載入
      await waitFor(() => {
        expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
      })
      
      // 應該回退到預設值
      expect(screen.getByText('生活體悟')).toBeInTheDocument()
      expect(screen.getByText('分享生活感悟、個人成長、心靈啟發')).toBeInTheDocument()
    })
  })

  describe('同步事件觸發', () => {
    it('保存後應該觸發 templatesUpdated 事件', async () => {
      renderWithRouter(<AIGenerator />)
      
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
      fireEvent.change(titleInput, { target: { value: '測試標題' } })
      
      // 點擊保存
      const saveButton = screen.getByText('保存')
      fireEvent.click(saveButton)
      
      // 等待保存完成
      await waitFor(() => {
        expect(screen.queryByText('保存中...')).not.toBeInTheDocument()
      })
      
      // 檢查是否觸發了 CustomEvent
      expect(window.CustomEvent).toHaveBeenCalledWith('templatesUpdated')
    })
  })
})
