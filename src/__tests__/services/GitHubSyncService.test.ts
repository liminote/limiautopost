import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GitHubSyncService, type GitHubTemplate } from '../../services/githubSyncService'

// Mock fetch
global.fetch = vi.fn()

describe('GitHubSyncService', () => {
  let service: GitHubSyncService

  beforeEach(() => {
    vi.clearAllMocks()
    // 重置 singleton 實例
    ;(GitHubSyncService as any).instance = undefined
    service = GitHubSyncService.getInstance()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getInstance', () => {
    it('應該返回單例實例', () => {
      const instance1 = GitHubSyncService.getInstance()
      const instance2 = GitHubSyncService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('getSystemTemplatesFromGitHub', () => {
    it('應該成功從 GitHub 讀取模板', async () => {
      const mockTemplates: Record<string, GitHubTemplate> = {
        'template-1': {
          id: 'template-1',
          platform: 'threads',
          title: '測試模板',
          features: '測試功能',
          prompt: '測試提示詞',
          updatedAt: '2025-01-19T00:00:00.000Z'
        }
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockTemplates)
      }

      ;(fetch as any).mockResolvedValue(mockResponse)

      const result = await service.getSystemTemplatesFromGitHub()

      expect(fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/liminote/limiautopost/main/src/data/systemTemplates.json'
      )
      expect(result).toEqual(mockTemplates)
    })

    it('應該處理 GitHub 回應錯誤', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      }

      ;(fetch as any).mockResolvedValue(mockResponse)

      const result = await service.getSystemTemplatesFromGitHub()

      expect(result).toEqual({})
    })

    it('應該處理網路錯誤', async () => {
      ;(fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await service.getSystemTemplatesFromGitHub()

      expect(result).toEqual({})
    })
  })

  describe('checkForUpdates', () => {
    it('應該檢測到更新', async () => {
      const mockFileInfo = {
        commit: {
          commit: {
            author: {
              date: new Date().toISOString() // 現在時間
            }
          }
        }
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockFileInfo)
      }

      ;(fetch as any).mockResolvedValue(mockResponse)

      const lastCheckTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1天前
      const result = await service.checkForUpdates(lastCheckTime)

      expect(result).toBe(true)
    })

    it('應該檢測不到更新', async () => {
      const mockFileInfo = {
        commit: {
          commit: {
            author: {
              date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1天前
            }
          }
        }
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockFileInfo)
      }

      ;(fetch as any).mockResolvedValue(mockResponse)

      const lastCheckTime = new Date().toISOString() // 現在時間
      const result = await service.checkForUpdates(lastCheckTime)

      expect(result).toBe(false)
    })

    it('應該處理 API 錯誤', async () => {
      const mockResponse = {
        ok: false
      }

      ;(fetch as any).mockResolvedValue(mockResponse)

      const result = await service.checkForUpdates(new Date().toISOString())

      expect(result).toBe(false)
    })
  })

  describe('getLastModifiedTime', () => {
    it('應該獲取最後修改時間', async () => {
      const expectedDate = '2025-01-19T00:00:00.000Z'
      const mockFileInfo = {
        commit: {
          commit: {
            author: {
              date: expectedDate
            }
          }
        }
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockFileInfo)
      }

      ;(fetch as any).mockResolvedValue(mockResponse)

      const result = await service.getLastModifiedTime()

      expect(result).toBe(expectedDate)
    })

    it('應該處理 API 錯誤', async () => {
      const mockResponse = {
        ok: false
      }

      ;(fetch as any).mockResolvedValue(mockResponse)

      const result = await service.getLastModifiedTime()

      expect(result).toBeNull()
    })
  })

  describe('forceCheckUpdates', () => {
    it('應該強制檢查更新', async () => {
      const mockFileInfo = {
        commit: {
          commit: {
            author: {
              date: new Date().toISOString()
            }
          }
        }
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockFileInfo)
      }

      ;(fetch as any).mockResolvedValue(mockResponse)

      const result = await service.forceCheckUpdates()

      expect(result).toBe(false)
    })
  })
})
