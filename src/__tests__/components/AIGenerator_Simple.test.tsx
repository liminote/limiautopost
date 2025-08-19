import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import AIGeneratorSimple from '../../pages/app/AIGenerator_Simple'

// Mock AdminSubnav
vi.mock('../../components/AdminSubnav', () => ({
  default: () => <div data-testid="admin-subnav">Admin Subnav</div>
}))

describe('AIGeneratorSimple 編輯功能測試', () => {
  test('應該顯示四個模板', () => {
    render(<AIGeneratorSimple />)
    
    expect(screen.getByText('第一則貼文')).toBeInTheDocument()
    expect(screen.getByText('第二則貼文')).toBeInTheDocument()
    expect(screen.getByText('第三則貼文')).toBeInTheDocument()
    expect(screen.getByText('Instagram 貼文')).toBeInTheDocument()
    
    // 檢查編輯按鈕
    const editButtons = screen.getAllByText('編輯')
    expect(editButtons).toHaveLength(4)
  })

  test('點擊編輯按鈕應該進入編輯模式', () => {
    render(<AIGeneratorSimple />)
    
    // 點擊第一個編輯按鈕
    const editButtons = screen.getAllByText('編輯')
    fireEvent.click(editButtons[0])
    
    // 檢查是否進入編輯模式
    expect(screen.getByText('保存')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
    
    // 檢查編輯表單
    expect(screen.getByDisplayValue('第一則貼文')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Threads')).toBeInTheDocument()
  })

  test('在編輯模式下可以修改內容', () => {
    render(<AIGeneratorSimple />)
    
    // 進入編輯模式
    const editButtons = screen.getAllByText('編輯')
    fireEvent.click(editButtons[0])
    
    // 修改標題
    const titleInput = screen.getByDisplayValue('第一則貼文')
    fireEvent.change(titleInput, { target: { value: '修改後的標題' } })
    expect(titleInput).toHaveValue('修改後的標題')
    
    // 修改平台
    const platformSelect = screen.getByDisplayValue('Threads')
    fireEvent.change(platformSelect, { target: { value: 'Instagram' } })
    expect(platformSelect).toHaveValue('Instagram')
  })

  test('點擊取消應該退出編輯模式並恢復原始內容', () => {
    render(<AIGeneratorSimple />)
    
    // 進入編輯模式
    const editButtons = screen.getAllByText('編輯')
    fireEvent.click(editButtons[0])
    
    // 修改內容
    const titleInput = screen.getByDisplayValue('第一則貼文')
    fireEvent.change(titleInput, { target: { value: '修改後的標題' } })
    
    // 點擊取消
    const cancelButton = screen.getByText('取消')
    fireEvent.click(cancelButton)
    
    // 檢查是否退出編輯模式
    expect(screen.queryByText('保存')).not.toBeInTheDocument()
    expect(screen.getAllByText('編輯')).toHaveLength(4)
    
    // 檢查內容是否恢復
    expect(screen.getByText('第一則貼文')).toBeInTheDocument()
  })

  test('點擊保存應該退出編輯模式並保留修改', () => {
    render(<AIGeneratorSimple />)
    
    // 進入編輯模式
    const editButtons = screen.getAllByText('編輯')
    fireEvent.click(editButtons[0])
    
    // 修改標題
    const titleInput = screen.getByDisplayValue('第一則貼文')
    fireEvent.change(titleInput, { target: { value: '修改後的標題' } })
    
    // 點擊保存
    const saveButton = screen.getByText('保存')
    fireEvent.click(saveButton)
    
    // 檢查是否退出編輯模式
    expect(screen.queryByText('保存')).not.toBeInTheDocument()
    expect(screen.getAllByText('編輯')).toHaveLength(4)
    
    // 檢查修改是否保留
    expect(screen.getByText('修改後的標題')).toBeInTheDocument()
  })

  test('只能同時編輯一個模板', () => {
    render(<AIGeneratorSimple />)
    
    // 點擊第一個編輯按鈕
    const editButtons = screen.getAllByText('編輯')
    fireEvent.click(editButtons[0])
    
    // 檢查只有一個保存按鈕
    expect(screen.getAllByText('保存')).toHaveLength(1)
    expect(screen.getAllByText('取消')).toHaveLength(1)
    expect(screen.getAllByText('編輯')).toHaveLength(3) // 其他三個還是編輯按鈕
  })
})
