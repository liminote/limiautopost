import React, { useState, useEffect } from 'react'
import { CardService } from '../services/cardService'
import type { UserCard } from '../types/cards'

export default function CardManager() {
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [editingCard, setEditingCard] = useState<UserCard | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const cardService = CardService.getInstance()

  // 載入使用者卡片
  useEffect(() => {
    loadUserCards()
  }, [])

  const loadUserCards = () => {
    // TODO: 獲取真實用戶 ID
    const userId = 'current-user'
    const cards = cardService.getUserCards(userId)
    setUserCards(cards)
  }

  // 創建新卡片
  const handleCreateCard = (cardData: Omit<UserCard, 'id' | 'isSystem' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const userId = 'current-user'
      const newCard = cardService.createUserCard(userId, cardData)
      setUserCards([...userCards, newCard])
      setShowCreateForm(false)
      
      // 觸發父組件重新載入模板選擇管理
      // 這裡需要通知父組件更新模板列表
      window.dispatchEvent(new CustomEvent('userCardCreated'))
    } catch (error) {
      console.error('創建卡片失敗:', error)
      alert('創建卡片失敗')
    }
  }

  // 更新卡片
  const handleUpdateCard = (cardId: string, updates: Partial<UserCard>) => {
    try {
      const userId = 'current-user'
      const updatedCard = cardService.updateUserCard(cardId, userId, updates)
      if (updatedCard) {
        setUserCards(userCards.map(card => 
          card.id === cardId ? updatedCard : card
        ))
        setEditingCard(null)
        
        // 觸發父組件重新載入模板選擇管理
        window.dispatchEvent(new CustomEvent('userCardUpdated'))
      }
    } catch (error) {
      console.error('更新卡片失敗:', error)
      alert('更新卡片失敗')
    }
  }

  // 刪除卡片
  const handleDeleteCard = (cardId: string) => {
    if (confirm('確定要刪除這個卡片嗎？刪除後無法復原。')) {
      try {
        const userId = 'current-user'
        const success = cardService.deleteUserCard(cardId, userId)
        if (success) {
          setUserCards(userCards.filter(card => card.id !== cardId))
          
          // 觸發父組件重新載入模板選擇管理
          window.dispatchEvent(new CustomEvent('userCardDeleted'))
        }
      } catch (error) {
        console.error('刪除卡片失敗:', error)
        alert('刪除卡片失敗')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* 標題和操作按鈕 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">我的卡片</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-[color:var(--yinmn-blue)] text-white rounded-md hover:bg-[color:var(--yinmn-blue-600)]"
        >
          新增卡片
        </button>
      </div>

      {/* 創建卡片表單 */}
      {showCreateForm && (
        <CreateCardForm
          onSubmit={handleCreateCard}
          onCancel={() => setShowCreateForm(false)}
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
}

function CreateCardForm({ onSubmit, onCancel }: CreateCardFormProps) {
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
      <h3 className="text-lg font-medium mb-4">創建新卡片</h3>
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
