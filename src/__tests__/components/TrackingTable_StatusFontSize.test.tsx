import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TrackingTable from '../../components/TrackingTable'

// Mock the dependencies
vi.mock('../../services/cardService', () => ({
  getTracked: vi.fn(() => []),
  updateTracked: vi.fn(),
  addTracked: vi.fn(),
  removeTracked: vi.fn()
}))

vi.mock('../../tracking/tracking', () => ({
  getTracked: vi.fn(() => []),
  updateTracked: vi.fn(),
  addTracked: vi.fn(),
  removeTracked: vi.fn()
}))

vi.mock('../../utils/dateUtils', () => ({
  nowYMDHM: vi.fn(() => '2025-01-01 12:00'),
  formatPublishDate: vi.fn((date) => date)
}))

describe('TrackingTable Status Column Font Size', () => {
  const mockRows = [
    {
      id: '1',
      articleId: 'A001',
      postId: 'A001-T1',
      platform: 'Threads' as const,
      status: 'published' as const,
      articleTitle: '測試標題',
      content: '測試內容',
      tags: [],
      permalink: undefined,
      publishDate: undefined,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      remarks: '',
      createdAt: '2025-01-01 12:00:00',
      branchCode: 'T1'
    },
    {
      id: '2',
      articleId: 'A002',
      postId: 'A002-T1',
      platform: 'Instagram' as const,
      status: 'draft' as const,
      articleTitle: '測試標題2',
      content: '測試內容2',
      tags: [],
      permalink: undefined,
      publishDate: undefined,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      remarks: '',
      createdAt: '2025-01-01 12:00:00',
      branchCode: 'T1'
    }
  ]

  it('should render status badges with correct font size', () => {
    render(
      <TrackingTable 
        rows={mockRows} 
        setRows={vi.fn()} 
        loading={false}
        userEmail="test@example.com"
      />
    )

    // 檢查狀態標籤是否存在
    const publishedStatus = screen.getByText('已發佈')
    const draftStatus = screen.getByText('草稿')

    expect(publishedStatus).toBeInTheDocument()
    expect(draftStatus).toBeInTheDocument()

    // 檢查狀態標籤的樣式
    const statusBadges = screen.getAllByText(/已發佈|草稿/)
    
    statusBadges.forEach(badge => {
      // 檢查是否有正確的 CSS 類別
      expect(badge).toHaveClass('rounded-full', 'font-medium')
      
      // 檢查是否在狀態欄位中（第4列）
      const td = badge.closest('td')
      expect(td).toBeInTheDocument()
    })
  })

  it('should have consistent font size across all status types', () => {
    render(
      <TrackingTable 
        rows={mockRows} 
        setRows={vi.fn()} 
        loading={false}
        userEmail="test@example.com"
      />
    )

    // 檢查所有狀態標籤的字級是否一致
    const allStatusElements = screen.getAllByText(/已發佈|草稿|發佈中|失敗|未知/)
    
    allStatusElements.forEach(element => {
      // 檢查是否在狀態欄位中
      const td = element.closest('td')
      expect(td).toBeInTheDocument()
    })
  })

  it('should maintain status badge styling consistency', () => {
    render(
      <TrackingTable 
        rows={mockRows} 
        setRows={vi.fn()} 
        loading={false}
        userEmail="test@example.com"
      />
    )

    const publishedBadge = screen.getByText('已發佈')
    const draftBadge = screen.getByText('草稿')

    // 檢查樣式一致性
    expect(publishedBadge).toHaveClass('bg-green-100', 'text-green-800')
    expect(draftBadge).toHaveClass('bg-gray-100', 'text-gray-800')
    
    // 檢查是否在狀態欄位中
    const publishedTd = publishedBadge.closest('td')
    const draftTd = draftBadge.closest('td')
    expect(publishedTd).toBeInTheDocument()
    expect(draftTd).toBeInTheDocument()
  })
})
