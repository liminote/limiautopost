import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, beforeEach, describe, it, expect } from 'vitest'
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

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock CustomEvent
Object.defineProperty(window, 'CustomEvent', {
  value: vi.fn(),
  writable: true
})

// Mock window.alert
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true
})

// Helper function to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('AIGenerator 模板持久化功能測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('應該能夠編輯模板並持久化保存', async () => {
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
    
    // 點擊保存
    const saveButton = screen.getByText('保存')
    fireEvent.click(saveButton)
    
    // 等待保存完成
    await waitFor(() => {
      expect(screen.queryByText('保存中...')).not.toBeInTheDocument()
    })
    
    // 檢查 GitHub 更新服務是否被調用
    const { GitHubUpdateService } = await import('../../services/githubUpdateService')
    const mockInstance = GitHubUpdateService.getInstance as any
    expect(mockInstance).toHaveBeenCalled()
    
    // 檢查是否觸發了 CustomEvent
    expect(window.CustomEvent).toHaveBeenCalledWith('templatesUpdated')
    
    // 檢查編輯模式是否已退出
    expect(screen.queryByText('保存')).not.toBeInTheDocument()
  })

  it('應該能夠從 localStorage 載入保存的模板', async () => {
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

  it('取消編輯應該恢復到保存的狀態', async () => {
    // 注意：現在組件從 GitHub 載入模板，localStorage 不再影響系統模板
    localStorageMock.getItem.mockReturnValue(null)
    
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
    fireEvent.change(titleInput, { target: { value: '修改後的標題' } })
    
    // 點擊取消
    const cancelButton = screen.getByText('取消')
    fireEvent.click(cancelButton)
    
    // 檢查是否恢復到原始狀態
    expect(screen.getByText('生活體悟')).toBeInTheDocument()
    expect(screen.getByText('分享生活感悟、個人成長、心靈啟發')).toBeInTheDocument()
  })
})
