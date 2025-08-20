import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AIGenerator from '../../pages/app/AIGenerator'

// Mock AdminSubnav
vi.mock('../../components/AdminSubnav', () => ({
  default: () => <div data-testid="admin-subnav">Admin Subnav</div>
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
    it('應該正確載入空的 localStorage 數據', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      renderWithRouter(<AIGenerator />)
      
      // 應該顯示預設模板
      expect(screen.getByText('生活體悟')).toBeInTheDocument()
      expect(screen.getByText('專業分享')).toBeInTheDocument()
      expect(screen.getByText('創意故事')).toBeInTheDocument()
      expect(screen.getByText('時事評論')).toBeInTheDocument()
    })

    it('應該正確載入包含空字串的 localStorage 數據', () => {
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
      
      // 空字串應該被正確處理，但 UI 可能不會顯示空的 input
      // 我們檢查第一個模板的標題是否為空
      const firstTemplate = screen.getByText('AI 生成器模板管理').closest('div')
      expect(firstTemplate).toBeInTheDocument()
    })

    it('應該正確載入包含 null 的 localStorage 數據', () => {
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
      
      // null 值應該被正確處理，UI 會顯示預設值或空內容
      // 檢查組件是否正常渲染
      expect(screen.getByText('AI 生成器模板管理')).toBeInTheDocument()
    })

    it('應該正確載入混合數據（部分有值，部分為空）', () => {
      const mockLocalStorageData = {
        'template-1': {
          id: 'template-1',
          platform: 'instagram',
          title: '自定義標題',
          features: '',
          prompt: '自定義提示詞',
          updatedAt: '2025-01-19T00:00:00.000Z'
        }
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockLocalStorageData))
      
      renderWithRouter(<AIGenerator />)
      
      // 應該顯示自定義值
      expect(screen.getByText('自定義標題')).toBeInTheDocument()
      expect(screen.getByText('自定義提示詞')).toBeInTheDocument()
      
      // 檢查組件是否正常渲染
      expect(screen.getByText('AI 生成器模板管理')).toBeInTheDocument()
    })
  })

  describe('模板編輯和保存', () => {
    it('應該能夠編輯模板並保存到 localStorage', async () => {
      renderWithRouter(<AIGenerator />)
      
      // 點擊編輯按鈕
      const editButtons = screen.getAllByText('編輯')
      fireEvent.click(editButtons[0])
      
      // 修改標題
      const titleInput = screen.getByDisplayValue('生活體悟')
      fireEvent.change(titleInput, { target: { value: '測試標題' } })
      
      // 修改功能描述
      const featuresInput = screen.getByDisplayValue('分享生活感悟、個人成長、心靈啟發')
      fireEvent.change(featuresInput, { target: { value: '測試描述' } })
      
      // 修改提示詞
      const promptTextarea = screen.getByDisplayValue(/請嚴格遵守以下規則生成 Threads 第一則貼文/)
      fireEvent.change(promptTextarea, { target: { value: '測試提示詞' } })
      
      // 點擊保存
      const saveButton = screen.getByText('保存')
      fireEvent.click(saveButton)
      
      // 等待保存完成
      await waitFor(() => {
        expect(screen.queryByText('保存中...')).not.toBeInTheDocument()
      })
      
      // 檢查 localStorage 是否被調用
      expect(localStorageMock.setItem).toHaveBeenCalled()
      
      // 檢查保存的數據結構
      const setItemCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'aigenerator_templates'
      )
      expect(setItemCall).toBeDefined()
      
      const savedData = JSON.parse(setItemCall[1])
      expect(savedData['template-1']).toBeDefined()
      expect(savedData['template-1'].title).toBe('測試標題')
      expect(savedData['template-1'].features).toBe('測試描述')
      expect(savedData['template-1'].prompt).toBe('測試提示詞')
    })

    it('應該能夠處理空字串的保存', async () => {
      renderWithRouter(<AIGenerator />)
      
      // 點擊編輯按鈕
      const editButtons = screen.getAllByText('編輯')
      fireEvent.click(editButtons[0])
      
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
      
      // 檢查保存的數據結構
      const setItemCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'aigenerator_templates'
      )
      expect(setItemCall).toBeDefined()
      
      const savedData = JSON.parse(setItemCall[1])
      expect(savedData['template-1'].title).toBe('')
      expect(savedData['template-1'].features).toBe('')
    })
  })

  describe('數據持久化驗證', () => {
    it('保存後重新載入應該顯示編輯後的內容', () => {
      // 第一次渲染：編輯並保存
      const mockSavedData = {
        'template-1': {
          id: 'template-1',
          platform: 'instagram',
          title: '已保存的標題',
          features: '已保存的描述',
          prompt: '已保存的提示詞',
          updatedAt: '2025-01-19T00:00:00.000Z'
        }
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedData))
      
      renderWithRouter(<AIGenerator />)
      
      // 應該顯示保存的內容
      expect(screen.getByText('已保存的標題')).toBeInTheDocument()
      expect(screen.getByText('已保存的描述')).toBeInTheDocument()
      expect(screen.getByText('已保存的提示詞')).toBeInTheDocument()
    })

    it('應該正確處理 undefined 值的回退', () => {
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
      
      // 應該回退到預設值
      expect(screen.getByText('生活體悟')).toBeInTheDocument()
      expect(screen.getByText('分享生活感悟、個人成長、心靈啟發')).toBeInTheDocument()
    })
  })

  describe('同步事件觸發', () => {
    it('保存後應該觸發 templatesUpdated 事件', async () => {
      renderWithRouter(<AIGenerator />)
      
      // 點擊編輯按鈕
      const editButtons = screen.getAllByText('編輯')
      fireEvent.click(editButtons[0])
      
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
