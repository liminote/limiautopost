import React, { useState, useEffect } from 'react'
import { CardService } from '../services/cardService'
import type { UserCard } from '../types/cards'
import { useSession } from '../auth/auth'

export default function CardManager() {
  const session = useSession()
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [editingCard, setEditingCard] = useState<UserCard | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const cardService = CardService.getInstance()

  // 獲取當前用戶 ID
  const currentUserId = session?.email || 'anonymous'

  // 載入使用者卡片
  useEffect(() => {
    if (!session) return // 未登入時不載入
    
    const loadUserCards = () => {
      const cards = cardService.getUserCards(currentUserId)
      setUserCards(cards)
    }

    loadUserCards()
  }, [session, currentUserId, cardService])

  // 創建新卡片
  const handleCreateCard = (cardData: Omit<UserCard, 'id' | 'isSystem' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!session) return
    
    try {
      const newCard = cardService.createUserCard(currentUserId, cardData)
      setUserCards(prev => [...prev, newCard])
      setShowCreateForm(false)
      
      // 觸發事件通知其他組件
      window.dispatchEvent(new CustomEvent('userCardCreated'))
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      } else {
        alert('創建卡片失敗')
      }
    }
  }

  // 更新卡片
  const handleUpdateCard = (cardId: string, updates: Partial<UserCard>) => {
    if (!session) return
    
    const updatedCard = cardService.updateUserCard(cardId, currentUserId, updates)
    if (updatedCard) {
      setUserCards(prev => prev.map(card => card.id === cardId ? updatedCard : card))
      setEditingCard(null)
      
      // 觸發事件通知其他組件
      window.dispatchEvent(new CustomEvent('userCardUpdated'))
    }
  }

  // 刪除卡片
  const handleDeleteCard = (cardId: string) => {
    if (!session) return
    
    if (confirm('確定要刪除這個卡片嗎？刪除後無法復原。')) {
      const success = cardService.deleteUserCard(cardId, currentUserId)
      if (success) {
        setUserCards(prev => prev.filter(card => card.id !== cardId))
        
        // 觸發事件通知其他組件
        window.dispatchEvent(new CustomEvent('userCardDeleted'))
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* 標題和操作按鈕 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">我的卡片</h2>
          <p className="text-gray-500 text-sm mt-1">
            管理你的自定義 AI 生成卡片，創建專屬的內容生成模板
            <span className="ml-2 text-gray-400">
              ({userCards.length}/{cardService.getUserCardLimit()} 個)
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={!cardService.canCreateMoreUserCards(currentUserId)}
          className={`px-4 py-2 rounded-md ${
            cardService.canCreateMoreUserCards(currentUserId)
              ? 'bg-[color:var(--yinmn-blue)] text-white hover:bg-[color:var(--yinmn-blue-600)]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {cardService.canCreateMoreUserCards(currentUserId) ? '新增卡片' : '已達上限'}
        </button>
      </div>

      {/* 創建卡片表單 */}
      {showCreateForm && (
        <CreateCardForm
          onSubmit={handleCreateCard}
          onCancel={() => setShowCreateForm(false)}
          canCreate={cardService.canCreateMoreUserCards(currentUserId)}
          currentCount={userCards.length}
          limit={cardService.getUserCardLimit()}
        />
      )}

      {/* 卡片列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userCards.map((card) => (
          <div key={card.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">{card.templateTitle || card.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingCard(card)}
                  className="text-[color:var(--yinmn-blue)] hover:text-[color:var(--yinmn-blue-600)] text-sm"
                >
                  編輯
                </button>
                <button
                  onClick={() => handleDeleteCard(card.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  刪除
                </button>
              </div>
            </div>
            
            <p className="text-gray-600 mb-3">{card.templateFeatures || card.description}</p>
            
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-[color:var(--yinmn-blue-300)] text-[color:var(--yinmn-blue)] px-2 py-1 rounded">
                {card.platform || card.category}
              </span>
            </div>

            {/* 編輯表單 */}
            {editingCard?.id === card.id && (
              <EditCardForm
                card={card}
                onSubmit={(updates) => handleUpdateCard(card.id, updates)}
                onCancel={() => setEditingCard(null)}
              />
            )}
          </div>
        ))}
      </div>

      {/* 空狀態 */}
      {userCards.length === 0 && !showCreateForm && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">還沒有自定義卡片</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-[color:var(--yinmn-blue)] text-white rounded-md hover:bg-[color:var(--yinmn-blue-600)]"
          >
            創建第一個卡片
          </button>
        </div>
      )}
    </div>
  )
}

// 創建卡片表單組件
interface CreateCardFormProps {
  onSubmit: (cardData: Omit<UserCard, 'id' | 'isSystem' | 'userId' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  canCreate: boolean
  currentCount: number
  limit: number
}

function CreateCardForm({ onSubmit, onCancel, canCreate, currentCount, limit }: CreateCardFormProps) {
  const [formData, setFormData] = useState({
    platform: 'general' as const,
    templateTitle: '',
    templateFeatures: '',
    prompt: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.templateTitle.trim() || !formData.prompt.trim()) {
      alert('請填寫所有必填欄位')
      return
    }
    onSubmit({
      name: formData.templateTitle,
      description: formData.templateFeatures,
      category: formData.platform,
      prompt: formData.prompt,
      isActive: true,
      platform: formData.platform,
      templateTitle: formData.templateTitle,
      templateFeatures: formData.templateFeatures,
      isSelected: false
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">創建新卡片</h3>
        <span className="text-sm text-gray-500">
          {currentCount}/{limit} 個
        </span>
      </div>
      {!canCreate && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 text-sm">
            已達到個人模板數量上限（{limit}個），無法創建更多模板
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 平台選擇 */}
        <div>
          <label htmlFor="card-platform" className="block text-sm font-medium text-gray-700 mb-1">
            平台 *
          </label>
          <select
            id="card-platform"
            value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[color:var(--yinmn-blue)]"
            required
          >
            <option value="general">不指定</option>
            <option value="threads">Threads</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>

        {/* 模板名稱 */}
        <div>
          <label htmlFor="card-title" className="block text-sm font-medium text-gray-700 mb-1">
            模板名稱 *
          </label>
          <input
            id="card-title"
            type="text"
            value={formData.templateTitle}
            onChange={(e) => setFormData({ ...formData, templateTitle: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[color:var(--yinmn-blue)]"
            placeholder="例如：職場心得模板"
            required
          />
        </div>

        {/* 模板內容 */}
        <div>
          <label htmlFor="card-features" className="block text-sm font-medium text-gray-700 mb-1">
            模板內容
          </label>
          <textarea
            id="card-features"
            value={formData.templateFeatures}
            onChange={(e) => setFormData({ ...formData, templateFeatures: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[color:var(--yinmn-blue)]"
            rows={3}
            placeholder="簡短描述這個模板的用途和特色"
          />
        </div>

        {/* 模板 Prompt */}
        <div>
          <label htmlFor="card-prompt" className="block text-sm font-medium text-gray-700 mb-1">
            模板 Prompt *
          </label>
          <textarea
            id="card-prompt"
            value={formData.prompt}
            onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[color:var(--yinmn-blue)]"
            rows={6}
            placeholder="輸入 AI 生成內容的指令和規則..."
            required
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-4 py-2 bg-[color:var(--yinmn-blue)] text-white rounded-md hover:bg-[color:var(--yinmn-blue-600)]"
          >
            創建卡片
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-[color:var(--yinmn-blue)] text-white rounded-md hover:bg-[color:var(--yinmn-blue-600)]"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  )
}

// 編輯卡片表單組件
interface EditCardFormProps {
  card: UserCard
  onSubmit: (updates: Partial<UserCard>) => void
  onCancel: () => void
}

function EditCardForm({ card, onSubmit, onCancel }: EditCardFormProps) {
  const [formData, setFormData] = useState({
    platform: card.platform || card.category,
    templateTitle: card.templateTitle || card.name,
    templateFeatures: card.templateFeatures || card.description,
    prompt: card.prompt
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.templateTitle.trim() || !formData.prompt.trim()) {
      alert('請填寫所有必填欄位')
      return
    }
    onSubmit({
      name: formData.templateTitle,
      description: formData.templateFeatures,
      category: formData.platform,
      prompt: formData.prompt,
      platform: formData.platform,
      templateTitle: formData.templateTitle,
      templateFeatures: formData.templateFeatures
    })
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="font-medium mb-3">編輯卡片</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* 平台選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            平台
          </label>
          <select
            value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="general">不指定</option>
            <option value="threads">Threads</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>

        {/* 模板名稱 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            模板名稱 *
          </label>
          <input
            type="text"
            value={formData.templateTitle}
            onChange={(e) => setFormData({ ...formData, templateTitle: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* 模板內容 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            模板內容
          </label>
          <textarea
            value={formData.templateFeatures}
            onChange={(e) => setFormData({ ...formData, templateFeatures: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        {/* 模板 Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prompt 內容 *
          </label>
          <textarea
            value={formData.prompt}
            onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            required
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-3 py-1 bg-[color:var(--yinmn-blue)] text-white rounded text-sm hover:bg-[color:var(--yinmn-blue-600)]"
          >
            更新
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 bg-[color:var(--yinmn-blue)] text-white rounded text-sm hover:bg-[color:var(--yinmn-blue-600)]"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
