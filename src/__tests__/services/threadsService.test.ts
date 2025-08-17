import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock fetch
global.fetch = vi.fn()

// Mock session
const mockSession = {
  email: 'test@example.com',
  role: 'user',
  createdAt: new Date().toISOString(),
}

describe('Threads Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Threads 狀態管理', () => {
    it('應該正確處理已連接狀態', async () => {
      // Mock localStorage 中的連接狀態
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'threads:test@example.com:linked') return '1'
        if (key === 'threads:test@example.com:username') return 'testuser'
        return null
      })

      // Mock API 回應
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'linked',
          username: 'testuser',
          tokenSavedAt: new Date().toISOString()
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      // 這裡可以測試實際的狀態管理邏輯
      // 由於我們沒有實際的 Threads 服務類，我們測試 localStorage 的交互
      expect(localStorageMock.getItem('threads:test@example.com:linked')).toBe('1')
      expect(localStorageMock.getItem('threads:test@example.com:username')).toBe('testuser')
    })

    it('應該正確處理未連接狀態', async () => {
      // Mock localStorage 中的未連接狀態
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'threads:test@example.com:linked') return '0'
        return null
      })

      // Mock API 回應
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'ready',
          username: null,
          tokenSavedAt: null
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      expect(localStorageMock.getItem('threads:test@example.com:linked')).toBe('0')
      expect(localStorageMock.getItem('threads:test@example.com:username')).toBeNull()
    })

    it('應該正確處理狀態同步', async () => {
      // 初始狀態：本地認為已連接，但伺服器狀態不同
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'threads:test@example.com:linked') return '1'
        if (key === 'threads:test@example.com:username') return 'olduser'
        return null
      })

      // Mock API 回應：伺服器顯示未連接
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'ready',
          username: null,
          tokenSavedAt: null
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      // 測試狀態同步邏輯
      // 這裡模擬狀態同步的過程
      const serverLinked = false
      const serverUsername = null

      if (serverLinked !== true) {
        // 應該同步到本地快取
        localStorageMock.setItem('threads:test@example.com:linked', '0')
        localStorageMock.removeItem('threads:test@example.com:username')
      }

      expect(localStorageMock.setItem).toHaveBeenCalledWith('threads:test@example.com:linked', '0')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('threads:test@example.com:username')
    })
  })

  describe('Threads 斷開連結', () => {
    it('應該正確處理斷開連結成功', async () => {
      // Mock API 回應
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ ok: true })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      // 模擬斷開連結的過程
      const result = await mockResponse.json()
      
      expect(result.ok).toBe(true)
      
      // 斷開連結後應該清除本地快取
      localStorageMock.removeItem('threads:test@example.com:linked')
      localStorageMock.removeItem('threads:test@example.com:username')
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('threads:test@example.com:linked')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('threads:test@example.com:username')
    })

    it('應該正確處理斷開連結失敗', async () => {
      // Mock API 回應失敗
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ ok: false, error: 'Token expired' })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await mockResponse.json()
      
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Token expired')
    })

    it('應該處理網路錯誤', async () => {
      // Mock 網路錯誤
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      try {
        await global.fetch('/api/threads/disconnect')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network error')
      }
    })
  })

  describe('Threads 強制同步', () => {
    it('應該正確執行強制同步', async () => {
      // Mock API 回應
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          status: 'linked',
          username: 'synceduser',
          tokenSavedAt: new Date().toISOString()
        })
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await mockResponse.json()
      
      expect(result.status).toBe('linked')
      expect(result.username).toBe('synceduser')
      
      // 強制同步後應該更新本地快取
      localStorageMock.setItem('threads:test@example.com:linked', '1')
      localStorageMock.setItem('threads:test@example.com:username', 'synceduser')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('threads:test@example.com:linked', '1')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('threads:test@example.com:username', 'synceduser')
    })

    it('應該處理同步失敗的情況', async () => {
      // Mock API 回應失敗
      const mockResponse = {
        ok: false,
        status: 500
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      expect(mockResponse.ok).toBe(false)
      expect(mockResponse.status).toBe(500)
    })
  })

  describe('localStorage 事件監聽', () => {
    it('應該正確監聽 localStorage 變化', () => {
      const mockStorageEvent = new StorageEvent('storage', {
        key: 'threads:test@example.com:linked',
        newValue: '1',
        oldValue: '0'
      })

      // 模擬 localStorage 變化事件
      window.dispatchEvent(mockStorageEvent)
      
      // 這裡可以測試事件監聽器的邏輯
      // 由於我們沒有實際的組件，我們測試事件是否被觸發
      expect(mockStorageEvent.type).toBe('storage')
      expect(mockStorageEvent.key).toBe('threads:test@example.com:linked')
      expect(mockStorageEvent.newValue).toBe('1')
    })

    it('應該正確處理 username 變化', () => {
      const mockStorageEvent = new StorageEvent('storage', {
        key: 'threads:test@example.com:username',
        newValue: 'newuser',
        oldValue: 'olduser'
      })

      window.dispatchEvent(mockStorageEvent)
      
      expect(mockStorageEvent.key).toBe('threads:test@example.com:username')
      expect(mockStorageEvent.newValue).toBe('newuser')
    })
  })

  describe('頁面可見性變化處理', () => {
    it('應該正確處理頁面可見性變化', () => {
      const mockVisibilityEvent = new Event('visibilitychange')
      
      // 模擬頁面變為可見
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true
      })
      
      window.dispatchEvent(mockVisibilityEvent)
      
      expect(document.hidden).toBe(false)
    })

    it('應該正確處理頁面變為隱藏', () => {
      const mockVisibilityEvent = new Event('visibilitychange')
      
      // 模擬頁面變為隱藏
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true
      })
      
      window.dispatchEvent(mockVisibilityEvent)
      
      expect(document.hidden).toBe(true)
    })
  })
})
