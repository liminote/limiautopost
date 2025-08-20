import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import AIGenerator from '../../pages/app/AIGenerator'

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
    
    // 點擊編輯按鈕
    const editButtons = screen.getAllByText('編輯')
    fireEvent.click(editButtons[0])
    
    // 修改標題 - 使用 getAllByDisplayValue 然後選擇第一個
    const titleInputs = screen.getAllByDisplayValue('')
    const titleInput = titleInputs[0] // 第一個輸入框是標題
    fireEvent.change(titleInput, { target: { value: '測試標題' } })
    
    // 修改功能描述 - 第二個輸入框
    const featuresInput = titleInputs[1] // 第二個輸入框是功能描述
    fireEvent.change(featuresInput, { target: { value: '測試描述' } })
    
    // 點擊保存
    const saveButton = screen.getByText('保存')
    fireEvent.click(saveButton)
    
    // 等待保存完成
    await waitFor(() => {
      expect(screen.queryByText('保存中...')).not.toBeInTheDocument()
    })
    
    // 檢查 localStorage 是否被調用
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'aigenerator_templates',
      expect.stringContaining('測試標題')
    )
    
    // 檢查保存的數據結構
    const setItemCall = localStorageMock.setItem.mock.calls.find(
      call => call[0] === 'aigenerator_templates'
    )
    expect(setItemCall).toBeDefined()
    
    if (setItemCall) {
      const savedData = JSON.parse(setItemCall[1])
      expect(savedData['template-1']).toBeDefined()
      expect(savedData['template-1'].title).toBe('測試標題')
      expect(savedData['template-1'].features).toBe('測試描述')
    }
  })

  it('應該能夠從 localStorage 載入保存的模板', async () => {
    // 模擬 localStorage 中有保存的數據
    const mockSavedData = {
      'template-1': {
        id: 'template-1',
        title: '已保存的標題',
        platform: 'instagram',
        features: '已保存的描述',
        prompt: '已保存的提示詞',
        updatedAt: new Date().toISOString()
      }
    }
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedData))
    
    renderWithRouter(<AIGenerator />)
    
    // 檢查是否載入了保存的數據
    expect(screen.getByText('已保存的標題')).toBeInTheDocument()
    expect(screen.getByText('已保存的描述')).toBeInTheDocument()
    expect(screen.getByText('Instagram')).toBeInTheDocument()
  })

  it('取消編輯應該恢復到保存的狀態', async () => {
    // 模擬 localStorage 中有保存的數據
    const mockSavedData = {
      'template-1': {
        id: 'template-1',
        title: '原始標題',
        platform: 'threads',
        features: '原始描述',
        prompt: '原始提示詞',
        updatedAt: new Date().toISOString()
      }
    }
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedData))
    
    renderWithRouter(<AIGenerator />)
    
    // 點擊編輯按鈕
    const editButtons = screen.getAllByText('編輯')
    fireEvent.click(editButtons[0])
    
    // 修改標題
    const titleInput = screen.getByDisplayValue('原始標題')
    fireEvent.change(titleInput, { target: { value: '修改後的標題' } })
    
    // 點擊取消
    const cancelButton = screen.getByText('取消')
    fireEvent.click(cancelButton)
    
    // 檢查是否恢復到原始狀態
    expect(screen.getByText('原始標題')).toBeInTheDocument()
    expect(screen.getByText('原始描述')).toBeInTheDocument()
  })
})
