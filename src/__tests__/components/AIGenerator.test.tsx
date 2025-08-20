import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import AIGenerator from '../../pages/app/AIGenerator'

// Mock CardService
vi.mock('../../services/cardService', () => ({
  CardService: {
    getInstance: vi.fn(() => ({
      loadSavedSystemTemplates: vi.fn().mockResolvedValue(undefined),
      getSystemCardsSync: vi.fn().mockReturnValue([]),
      updateSystemTemplate: vi.fn().mockResolvedValue(true)
    }))
  }
}))

// Mock AdminSubnav
vi.mock('../../components/AdminSubnav', () => ({
  default: () => <div data-testid="admin-subnav">Admin Subnav</div>
}))

describe('AIGenerator 編輯功能測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('編輯流程完整測試', async () => {
    render(<AIGenerator />)
    
    // 1. 檢查初始狀態：應該有4個編輯按鈕
    const editButtons = screen.getAllByText('編輯')
    expect(editButtons).toHaveLength(4)
    
    // 2. 點擊第一個編輯按鈕
    fireEvent.click(editButtons[0])
    
    // 3. 檢查是否進入編輯模式
    await waitFor(() => {
      expect(screen.getByText('保存')).toBeInTheDocument()
      expect(screen.getByText('取消')).toBeInTheDocument()
    })
    
    // 4. 檢查編輯表單是否顯示
    expect(screen.getByDisplayValue('生活體悟')).toBeInTheDocument()
    expect(screen.getByDisplayValue('分享生活感悟、個人成長、心靈啟發')).toBeInTheDocument()
    
    // 5. 修改模板名稱
    const titleInput = screen.getByDisplayValue('生活體悟')
    fireEvent.change(titleInput, { target: { value: '測試修改標題' } })
    expect(titleInput).toHaveValue('測試修改標題')
    
    // 6. 修改平台
    const platformSelect = screen.getByRole('combobox')
    fireEvent.change(platformSelect, { target: { value: 'instagram' } })
    expect(platformSelect).toHaveValue('instagram')
    
    // 7. 點擊保存
    const saveButton = screen.getByText('保存')
    fireEvent.click(saveButton)
    
    // 8. 檢查是否退出編輯模式
    await waitFor(() => {
      expect(screen.queryByText('保存')).not.toBeInTheDocument()
      expect(screen.getAllByText('編輯')).toHaveLength(4)
    })
  })

  test('取消編輯測試', async () => {
    render(<AIGenerator />)
    
    // 進入編輯模式
    const editButtons = screen.getAllByText('編輯')
    fireEvent.click(editButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText('保存')).toBeInTheDocument()
    })
    
    // 修改一些內容
    const titleInput = screen.getByDisplayValue('生活體悟')
    fireEvent.change(titleInput, { target: { value: '修改後的標題' } })
    
    // 點擊取消
    const cancelButton = screen.getByText('取消')
    fireEvent.click(cancelButton)
    
    // 檢查是否回到顯示模式
    await waitFor(() => {
      expect(screen.queryByText('保存')).not.toBeInTheDocument()
      expect(screen.getAllByText('編輯')).toHaveLength(4)
    })
  })

  test('localStorage 保存測試', async () => {
    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })
    
    // Mock CustomEvent
    const mockDispatchEvent = vi.fn()
    Object.defineProperty(window, 'dispatchEvent', {
      value: mockDispatchEvent,
      writable: true,
    })
    
    render(<AIGenerator />)
    
    // 進入編輯模式並保存
    const editButtons = screen.getAllByText('編輯')
    fireEvent.click(editButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText('保存')).toBeInTheDocument()
    })
    
    const saveButton = screen.getByText('保存')
    fireEvent.click(saveButton)
    
    // 檢查 localStorage 是否被調用
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'aigenerator_templates',
        expect.stringContaining('template-1')
      )
    })
    
    // 檢查同步事件是否被觸發
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'templatesUpdated'
      })
    )
  })
})
