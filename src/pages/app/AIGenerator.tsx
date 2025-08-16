import { useState, useEffect } from 'react'
import { CardService, AIGenerationService } from '../../services/cardService'
import type { BaseCard, CardGenerationRequest, CardGenerationResult } from '../../types/cards'

export default function AIGenerator() {
  const [cards, setCards] = useState<BaseCard[]>([])
  const [selectedCard, setSelectedCard] = useState<BaseCard | null>(null)
  const [topic, setTopic] = useState('')
  const [style, setStyle] = useState<'formal' | 'casual' | 'professional' | 'friendly'>('casual')
  const [additionalContext, setAdditionalContext] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<CardGenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cardService = CardService.getInstance()
  const aiService = AIGenerationService.getInstance()

  // 載入可用卡片
  useEffect(() => {
    const loadCards = () => {
      // TODO: 獲取真實用戶 ID
      const userId = 'current-user'
      const availableCards = cardService.getAllCards(userId)
      setCards(availableCards)
      
      // 預設選擇第一個卡片
      if (availableCards.length > 0 && !selectedCard) {
        setSelectedCard(availableCards[0])
      }
    }

    loadCards()
  }, [selectedCard])

  // 生成內容
  const handleGenerate = async () => {
    if (!selectedCard || !topic.trim()) {
      setError('請選擇卡片並輸入主題')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedContent(null)

    try {
      const request: CardGenerationRequest = {
        cardId: selectedCard.id,
        topic: topic.trim(),
        style,
        additionalContext: additionalContext.trim() || undefined
      }

      const result = await aiService.generateContent(request)
      setGeneratedContent(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失敗')
    } finally {
      setIsGenerating(false)
    }
  }

  // 重置表單
  const handleReset = () => {
    setTopic('')
    setStyle('casual')
    setAdditionalContext('')
    setGeneratedContent(null)
    setError(null)
  }

  // 複製內容到剪貼簿
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // TODO: 顯示複製成功提示
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI 貼文生成器</h1>
        <p className="text-gray-600">選擇卡片模板，輸入主題，AI 自動生成貼文內容</p>
      </div>

      {/* 生成設定區域 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">生成設定</h2>
        
        {/* 卡片選擇 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            選擇卡片模板
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedCard?.id === card.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedCard(card)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{card.name}</h3>
                  {card.isSystem && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      系統預設
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{card.description}</p>
                <div className="mt-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {card.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 主題輸入 */}
        <div className="mb-4">
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
            主題 / 關鍵字 *
          </label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例如：職場溝通技巧、創業心得、生活感悟..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* 風格選擇 */}
        <div className="mb-4">
          <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
            內容風格
          </label>
          <select
            id="style"
            value={style}
            onChange={(e) => setStyle(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="casual">輕鬆自然</option>
            <option value="formal">正式專業</option>
            <option value="professional">專業權威</option>
            <option value="friendly">親切友善</option>
          </select>
        </div>

        {/* 額外上下文 */}
        <div className="mb-6">
          <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
            額外說明（選填）
          </label>
          <textarea
            id="context"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="補充說明、特殊要求、目標受眾等..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedCard || !topic.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? '生成中...' : '生成內容'}
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            重置
          </button>
        </div>

        {/* 錯誤提示 */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>

      {/* 生成結果區域 */}
      {generatedContent && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">生成結果</h2>
          
          {/* Threads 內容 */}
          {generatedContent.threads && generatedContent.threads.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Threads 貼文</h3>
              <div className="space-y-4">
                {generatedContent.threads.map((thread, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Threads {index + 1}
                      </span>
                      <button
                        onClick={() => copyToClipboard(thread.content)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        複製
                      </button>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{thread.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instagram 內容 */}
          {generatedContent.instagram && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Instagram 貼文</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Instagram</span>
                  <button
                                            onClick={() => copyToClipboard(generatedContent.instagram?.content || '')}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    複製
                  </button>
                </div>
                <p className="text-gray-800 whitespace-pre-wrap">
                  {generatedContent.instagram.content}
                </p>
              </div>
            </div>
          )}

          {/* Facebook 內容 */}
          {generatedContent.facebook && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Facebook 貼文</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Facebook</span>
                  <button
                    onClick={() => copyToClipboard(generatedContent.facebook!.content)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    複製
                  </button>
                </div>
                <p className="text-gray-800 whitespace-pre-wrap">
                  {generatedContent.facebook.content}
                </p>
              </div>
            </div>
          )}

          {/* 後續操作 */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">
              生成完成！你可以複製內容到其他編輯器進行調整，或直接使用。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(JSON.stringify(generatedContent, null, 2))}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                複製全部 JSON
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                重新生成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
