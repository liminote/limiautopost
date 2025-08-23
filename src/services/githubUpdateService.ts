export interface GitHubTemplate {
  id: string
  platform: 'threads' | 'instagram' | 'facebook' | 'general'
  title: string
  features: string
  prompt: string
  updatedAt: string
}

export class GitHubUpdateService {
  private static instance: GitHubUpdateService
  private readonly GITHUB_API_URL = 'https://api.github.com/repos/liminote/limiautopost/contents/src/data/systemTemplates.json'
  
  private constructor() {}
  
  public static getInstance(): GitHubUpdateService {
    if (!GitHubUpdateService.instance) {
      GitHubUpdateService.instance = new GitHubUpdateService()
    }
    return GitHubUpdateService.instance
  }
  
  // 更新 GitHub 上的系統模板文件
  public async updateSystemTemplates(
    templates: Record<string, GitHubTemplate>
  ): Promise<boolean> {
    try {
      console.log('[GitHubUpdateService] 開始更新 GitHub 系統模板...')
      
      // 檢查是否有 GitHub token
      const githubToken = this.getGitHubToken()
      if (!githubToken) {
        console.warn('[GitHubUpdateService] 沒有 GitHub token，無法更新文件')
        throw new Error('需要 GitHub Personal Access Token 來更新文件')
      }
      
      // 獲取當前文件信息（包括最新的 SHA）
      const currentFile = await this.getCurrentFileInfo(githubToken)
      if (!currentFile) {
        throw new Error('無法獲取當前文件信息')
      }
      
      console.log('[GitHubUpdateService] 當前文件 SHA:', currentFile.sha)
      
      // 準備更新數據
      const updatedContent = JSON.stringify(templates, null, 2)
      const encodedContent = btoa(unescape(encodeURIComponent(updatedContent)))
      
      // 發送更新請求
      const response = await fetch(this.GITHUB_API_URL, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update system templates - ${new Date().toISOString()}`,
          content: encodedContent,
          sha: currentFile.sha
        })
      })
      
      if (response.ok) {
        console.log('[GitHubUpdateService] GitHub 文件更新成功')
        return true
      } else if (response.status === 409) {
        // 409 錯誤：文件衝突，需要重新獲取 SHA
        console.warn('[GitHubUpdateService] 文件衝突 (409)，嘗試重新同步...')
        return await this.retryUpdateWithFreshSHA(templates, githubToken)
      } else {
        const errorData = await response.json()
        console.error('[GitHubUpdateService] GitHub API 錯誤:', errorData)
        throw new Error(`GitHub API 錯誤: ${response.status} - ${errorData.message || '未知錯誤'}`)
      }
      
    } catch (error) {
      console.error('[GitHubUpdateService] 更新 GitHub 文件失敗:', error)
      throw error
    }
  }
  
  // 重試更新，使用最新的 SHA
  private async retryUpdateWithFreshSHA(
    templates: Record<string, GitHubTemplate>,
    token: string
  ): Promise<boolean> {
    try {
      console.log('[GitHubUpdateService] 重新獲取最新文件信息...')
      
      // 等待一下，讓 GitHub 同步
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 重新獲取文件信息
      const freshFile = await this.getCurrentFileInfo(token)
      if (!freshFile) {
        throw new Error('無法獲取最新的文件信息')
      }
      
      console.log('[GitHubUpdateService] 新的文件 SHA:', freshFile.sha)
      
      // 準備更新數據
      const updatedContent = JSON.stringify(templates, null, 2)
      const encodedContent = btoa(unescape(encodeURIComponent(updatedContent)))
      
      // 重新發送更新請求
      const response = await fetch(this.GITHUB_API_URL, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update system templates (retry) - ${new Date().toISOString()}`,
          content: encodedContent,
          sha: freshFile.sha
        })
      })
      
      if (response.ok) {
        console.log('[GitHubUpdateService] 重試更新成功')
        return true
      } else {
        const errorData = await response.json()
        console.error('[GitHubUpdateService] 重試更新失敗:', errorData)
        throw new Error(`重試更新失敗: ${response.status} - ${errorData.message || '未知錯誤'}`)
      }
      
    } catch (error) {
      console.error('[GitHubUpdateService] 重試更新失敗:', error)
      throw error
    }
  }
  
  // 獲取當前文件信息
  private async getCurrentFileInfo(token: string): Promise<{ sha: string } | null> {
    try {
      const response = await fetch(this.GITHUB_API_URL, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      
      if (response.ok) {
        const fileInfo = await response.json()
        return { sha: fileInfo.sha }
      }
      
      return null
    } catch (error) {
      console.error('[GitHubUpdateService] 獲取文件信息失敗:', error)
      return null
    }
  }
  
  // 從環境變數或配置獲取 GitHub token
  private getGitHubToken(): string | null {
    // 優先從環境變數獲取
    if (typeof process !== 'undefined' && process.env.GITHUB_TOKEN) {
      return process.env.GITHUB_TOKEN
    }
    
    // 從 localStorage 獲取（用戶手動設置）
    const storedToken = localStorage.getItem('github_token')
    if (storedToken) {
      return storedToken
    }
    
    return null
  }
  
  // 設置 GitHub token
  public setGitHubToken(token: string): void {
    localStorage.setItem('github_token', token)
    console.log('[GitHubUpdateService] GitHub token 已設置')
  }
  
  // 檢查是否有 GitHub token
  public hasGitHubToken(): boolean {
    return !!this.getGitHubToken()
  }
  
  // 移除 GitHub token
  public removeGitHubToken(): void {
    localStorage.removeItem('github_token')
    console.log('[GitHubUpdateService] GitHub token 已移除')
  }
}

export const githubUpdateService = GitHubUpdateService.getInstance()
