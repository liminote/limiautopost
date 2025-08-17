import { useState } from 'react'

export default function TagInput({ value, onChange, suggestions, className }: {
  value: string[]
  onChange: (v: string[]) => void
  suggestions: string[]
  className?: string
}){
  const [text, setText] = useState('')
  const exist = new Set(value)
  const filtered = suggestions.filter(s => s.toLowerCase().includes(text.toLowerCase()) && !exist.has(s)).slice(0, 6)

  const add = (tag: string) => {
    const t = tag.trim()
    if (!t) return
    if (exist.has(t)) { 
      setText(''); 
      return 
    }
    onChange([...value, t]); 
    setText('') // 確保清空輸入框
  }
  const remove = (tag: string) => onChange(value.filter(t => t !== tag))

  return (
    <div className={className || ''}>
      <div className="flex flex-wrap gap-1 mb-1">
        {value.map(t => (
          <span key={t} className="ui-chip">
            #{t}
            <button className="ui-close" onClick={()=>remove(t)}>×</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input className="ui-input-sm" placeholder="輸入後按 Enter 或選擇建議" value={text} style={{ width: '100%' }}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); add(text) } }} />
        {text && filtered.length>0 && (
          <div className="absolute z-20 mt-1 w-full ui-tooltip ui-12 max-h-40 overflow-auto">
            {filtered.map(s => (
              <div key={s} className="px-2 py-1 hover:bg-gray-100 cursor-pointer" onClick={()=>add(s)}>#{s}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


