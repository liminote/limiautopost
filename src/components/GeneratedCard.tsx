import { useEffect, useRef } from 'react'
import { PLATFORM_CONFIG } from '../config/platformConfig'

type Platform = 'Threads' | 'Instagram' | 'Facebook'

export type GeneratedCardData = {
  id: string
  platform: Platform
  label: string
  content: string
  checked: boolean
  code: string
}

export default function GeneratedCard({
  card,
  onToggleChecked,
  onPlatformChange,
  onContentChange,
  onCopy,
  bgVar
}: {
  card: GeneratedCardData
  onToggleChecked: (id: string, checked: boolean) => void
  onPlatformChange: (id: string, platform: Platform) => void
  onContentChange: (id: string, content: string) => void
  onCopy: (content: string) => void
  bgVar?: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
    onContentChange(card.id, el.value)
  }

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [card.content])

  const fallbackBg = (idx: string): string => {
    // Use the last character of id to pseudo-randomize tint selection
    const n = Math.abs(idx.charCodeAt(idx.length - 1)) % 4
    const varName = n === 0 ? '--card-tint-1' : n === 1 ? '--card-tint-2' : n === 2 ? '--card-tint-3' : '--card-tint-4'
    return `var(${varName})`
  }

  // 獲取平台顏色
  const getPlatformColor = (platform: Platform) => {
    switch (platform) {
      case 'Threads': return PLATFORM_CONFIG.threads.color
      case 'Instagram': return PLATFORM_CONFIG.instagram.color
      case 'Facebook': return PLATFORM_CONFIG.facebook.color
      default: return PLATFORM_CONFIG.threads.color
    }
  }

  return (
    <div className="relative card" style={{ background: bgVar ? `var(${bgVar})` : fallbackBg(card.id) }}>
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="heading-serif text-sm">{card.label}</span>
          <span 
            className="px-1.5 py-0.5 text-xs font-medium rounded"
            style={{ 
              backgroundColor: getPlatformColor(card.platform) + '20',
              color: getPlatformColor(card.platform)
            }}
          >
            {card.platform}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline text-xs" onClick={()=> onCopy(card.content)}>複製</button>
          <label className="inline-flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" className="size-4" checked={card.checked} onChange={(e)=> onToggleChecked(card.id, e.target.checked)} />
            選取
          </label>
        </div>
      </div>
      <div className="card-body flex flex-col gap-2">
        {card.code === 'MAN' && (
          <select className="select w-40 text-sm" value={card.platform} onChange={(e)=> onPlatformChange(card.id, e.target.value as Platform)}>
            <option>Threads</option>
            <option>Instagram</option>
            <option>Facebook</option>
          </select>
        )}
        <textarea ref={textareaRef} className="textarea text-xs resize-none" value={card.content} onChange={handleChange} rows={1} />
        {/* 字元計數 */}
        <div className="text-right">
          <span className="text-xs text-gray-500">{card.content.length} 字元</span>
        </div>
      </div>
    </div>
  )
}


