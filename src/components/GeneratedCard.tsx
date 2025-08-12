import { useEffect, useRef } from 'react'
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

  return (
    <div className="relative card" style={{ background: bgVar ? `var(${bgVar})` : fallbackBg(card.id) }}>
      <div className="card-header flex items-center justify-between">
        <div className="heading-serif text-xs">{card.label} · {card.platform}</div>
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
      </div>
    </div>
  )
}


