export interface GitHubTemplate {
  id: string
  platform: 'threads' | 'instagram' | 'facebook' | 'general'
  title: string
  features: string
  prompt: string
  updatedAt: string
}

export class GitHubSyncService {
  private static instance: GitHubSyncService
  private readonly GITHUB_RAW_URL = 'https://raw.githubusercontent.com/liminote/limiautopost/main/src/data/systemTemplates.json'
  private readonly GITHUB_API_URL = 'https://api.github.com/repos/liminote/limiautopost/contents/src/data/systemTemplates.json'
  private lastCheckTime: string = new Date().toISOString()
  private checkInterval: number = 5 * 60 * 1000 // 5分鐘檢查一次

  private constructor() {
    // 啟動自動檢查更新
    this.startAutoCheck()
  }

  public static getInstance(): GitHubSyncService {
    if (!GitHubSyncService.instance) {
      GitHubSyncService.instance = new GitHubSyncService()
    }
    return GitHubSyncService.instance
  }

  // 啟動自動檢查更新
  private startAutoCheck() {
    setInterval(async () => {
      try {
        const hasUpdates = await this.checkForUpdates(this.lastCheckTime)
        if (hasUpdates) {
          console.log('[GitHubSyncService] 發現更新，觸發同步事件')
          window.dispatchEvent(new CustomEvent('templatesUpdated'))
          this.lastCheckTime = new Date().toISOString()
        }
      } catch (error) {
        console.warn('[GitHubSyncService] 自動檢查更新失敗:', error)
      }
    }, this.checkInterval)
  }

  // 從 GitHub 讀取最新的系統模板
  public async getSystemTemplatesFromGitHub(): Promise<Record<string, GitHubTemplate>> {
    try {
      console.log('[GitHubSyncService] 正在從 GitHub 讀取系統模板...')
      
      // 使用 GitHub Raw 內容 URL（不需要 API token）
      const response = await fetch(this.GITHUB_RAW_URL)
      
      if (response.ok) {
        const templates = await response.json()
        console.log('[GitHubSyncService] 成功從 GitHub 讀取模板:', templates)
        return templates
      } else {
        console.warn('[GitHubSyncService] GitHub 回應錯誤:', response.status, response.statusText)
        return {}
      }
    } catch (error) {
      console.warn('[GitHubSyncService] 無法從 GitHub 讀取系統模板:', error)
      return {}
    }
  }

  // 檢查 GitHub 上的模板是否有更新
  public async checkForUpdates(lastCheckTime: string): Promise<boolean> {
    try {
      const response = await fetch(this.GITHUB_API_URL)
      
      if (response.ok) {
        const fileInfo = await response.json()
        const lastModified = fileInfo.commit?.commit?.author?.date
        
        if (lastModified && new Date(lastModified) > new Date(lastCheckTime)) {
          console.log('[GitHubSyncService] 發現 GitHub 上有更新:', lastModified)
          return true
        }
      }
    } catch (error) {
      console.warn('[GitHubSyncService] 檢查更新失敗:', error)
    }
    
    return false
  }

  // 獲取最後修改時間
  public async getLastModifiedTime(): Promise<string | null> {
    try {
      const response = await fetch(this.GITHUB_API_URL)
      
      if (response.ok) {
        const fileInfo = await response.json()
        return fileInfo.commit?.commit?.author?.date || null
      }
    } catch (error) {
      console.warn('[GitHubSyncService] 獲取最後修改時間失敗:', error)
    }
    
    return null
  }

  // 強制檢查更新
  public async forceCheckUpdates(): Promise<boolean> {
    const hasUpdates = await this.checkForUpdates(this.lastCheckTime)
    if (hasUpdates) {
      this.lastCheckTime = new Date().toISOString()
    }
    return hasUpdates
  }
}

export const githubSyncService = GitHubSyncService.getInstance()
