## Lovable 設計交付說明（limiautopost）

目標：請優化 UI/版面（Notion 風格、緊湊）、並改善互動細節。產出可直接回貼取代既有檔案的程式碼，不新增相依。

### 風格與設計原則
- 採用 Notion-like、緊湊設計，表格字體 12px、白色 tooltip、陰影、扁平 tags、hover 顯示關閉、輸入高度 28px、平台選單 Threads/IG 顯示清楚（沿用 tokens）
- 全域 tokens 已定義，請沿用 `src/index.css`（不要引入 UI 套件或自訂設計系統）
- 保持簡潔、對齊、易讀，不要讓浮層造成重排抖動

設計偏好與 tokens 來源：見 `src/index.css`，以及下方貼入的片段；此為產品既有規範，請勿修改語意。

### 技術限制
- 僅用 Tailwind utility classes 與現有 `src/index.css` 中的全域樣式
- 不新增第三方相依
- 保留 TypeScript 型別與資料流，允許調整 JSX 結構與 className
- 任何互動效果需無 layout shift（不影響表格與整體寬高）

### 需要你設計/優化的區塊
1) TrackingPage（追蹤列表）
   - 搜尋列與表格的視覺（緊湊、清楚）、表頭固定風格可加強
   - 內容（截斷）欄位的「全文浮窗」：
     - 使用 position: fixed，顯示在該格的側邊（優先右側，不夠空間則左側），垂直位置夾取在視窗內
     - 白底/陰影/圓角（沿用 `.ui-tooltip`）
     - 微延遲隱藏（避免滑鼠移至浮窗時消失），不能造成版面抖動
   - Tag 輸入的建議清單沿用 `.ui-tooltip` 視覺

2) Generator（結果卡片）
   - 卡片標題、平台、小按鈕配置調整，使其更緊湊易讀
   - 複製、加入追蹤等操作區的一致性與對齊

### 驗收標準（重要）
- 表格與卡片的縱橫間距符合緊湊風格（表格 12px 行高、單元格內邊距小）
- 全文浮窗：穩定出現於單元格側邊，無重排、無抖動，滑鼠移到浮窗不會立即消失
- 不新增任何套件，相容現有程式與建置

### 交付項目
- 回傳可直接替換的檔案：`src/pages/app/Tracking.tsx`、`src/pages/app/Generator.tsx`（如需抽成 `components/` 也可，但請附帶檔案）
- 如需新增少量樣式，請改在 `src/index.css` 並沿用 tokens

---

### 參考：全域樣式 tokens（節錄自 `src/index.css`）

```css
/* Notion-like UI (compact) */
:root{
  --ui-bg:#fff; --ui-fg:#111827; --ui-border:#e5e7eb; --ui-chip:#f3f4f6;
  --ui-shadow:0 6px 16px rgba(0,0,0,.12);
}
html{ overflow-y: scroll; }
body{ min-height:100%; scrollbar-gutter: stable; }
.ui-12{font-size:12px;}
.table.ui-compact thead th{padding:6px 8px;}
.table.ui-compact tbody td{padding:6px 8px;}
.ui-input-sm,.ui-select-sm{height:28px;padding:3px 8px;font-size:12px;border:1px solid var(--ui-border);border-radius:6px;background:var(--ui-bg);}
.ui-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border:0;border-radius:6px;background:var(--ui-chip);font-size:11px;line-height:18px;}
.ui-chip .ui-close{opacity:0;transition:opacity .15s}
.ui-chip:hover .ui-close{opacity:.8}
.ui-tooltip{background:var(--ui-bg);border:1px solid var(--ui-border);box-shadow:var(--ui-shadow);border-radius:8px;}
```

---

### 目前 Tracking.tsx（供你參考與直接改寫）

```tsx
// file: src/pages/app/Tracking.tsx
import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { getTracked, removeTracked, clearTracked, updateTracked, type TrackedPost } from '../../tracking/tracking'

export default function TrackingPage() {
  const [rows, setRows] = useState<TrackedPost[]>([])
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ left: number; top: number } | null>(null)
  const [hoverText, setHoverText] = useState<string>('')
  const hideTimerRef = useRef<number | null>(null)
  const anchorRectRef = useRef<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }
  const hideTooltipLater = () => {
    clearHideTimer()
    hideTimerRef.current = window.setTimeout(() => {
      setHoverId(null)
      setHoverPos(null)
      setHoverText('')
    }, 120)
  }

  useLayoutEffect(() => {
    if (!hoverId || !anchorRectRef.current) return
    const margin = 8
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    const fallbackLeft = Math.max(margin, Math.min(anchorRectRef.current.left, viewportW - margin - 1))
    const fallbackTop = Math.max(margin, Math.min(anchorRectRef.current.bottom + margin, viewportH - margin - 1))
    let left = fallbackLeft
    let top = fallbackTop

    const el = tooltipRef.current
    if (el) {
      const w = el.offsetWidth
      const h = el.offsetHeight
      const canPlaceRight = anchorRectRef.current.right + margin + w <= viewportW - margin
      const canPlaceLeft = anchorRectRef.current.left - margin - w >= margin
      if (canPlaceRight) {
        left = anchorRectRef.current.right + margin
      } else if (canPlaceLeft) {
        left = anchorRectRef.current.left - margin - w
      } else {
        left = Math.max(margin, Math.min(anchorRectRef.current.left, viewportW - margin - w))
      }
      const desiredTop = anchorRectRef.current.top
      top = Math.max(margin, Math.min(desiredTop, viewportH - margin - h))
    }
    setHoverPos({ left, top })
  }, [hoverId, hoverText])

  const refresh = () => setRows(getTracked())
  useEffect(() => { refresh() }, [])

  const exportCSV = () => { /* 省略，與原檔相同 */ }

  return (
    <div className="space-y-4 ui-12">
      {/* ...搜尋列與表格。重點在「內容（截斷）」欄位：*/}
      <td className="px-3 py-2 border-t text-gray-600 align-top">
        <div
          className="max-w-64"
          onMouseEnter={(e) => {
            clearHideTimer()
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            anchorRectRef.current = rect
            setHoverText('此處放全文內容')
            setHoverId('hover-row-id')
          }}
          onMouseLeave={hideTooltipLater}
        >
          <span>內容開頭…</span>
        </div>
      </td>

      {hoverId && hoverPos && (
        <div
          ref={tooltipRef}
          className="fixed z-50 w-[24rem] max-h-56 overflow-auto p-2 ui-tooltip ui-12 whitespace-pre-wrap"
          style={{ left: hoverPos.left, top: hoverPos.top }}
          onMouseEnter={clearHideTimer}
          onMouseLeave={hideTooltipLater}
        >
          {hoverText}
        </div>
      )}
    </div>
  )
}
```

---

### 目前 Generator.tsx（供你參考與直接改寫）

```tsx
// file: src/pages/app/Generator.tsx
/* 保持資料流不變，可自由調整卡片視覺（卡片間距、標題、平台、操作列等） */
export default function Generator(){ /* 省略，與原檔相同，可直接在 className 上優化 */ return null as any }
```

---

### 目前 index.css（供你參考與直接改寫）

```css
/* file: src/index.css（請沿用 tokens，必要時在此新增極少量樣式） */
/* Notion-like UI (compact) */
:root{ --ui-bg:#fff; --ui-fg:#111827; --ui-border:#e5e7eb; --ui-chip:#f3f4f6; --ui-shadow:0 6px 16px rgba(0,0,0,.12); }
html{ overflow-y: scroll; }
body{ min-height:100%; scrollbar-gutter: stable; }
.ui-12{font-size:12px;}
.table.ui-compact thead th{padding:6px 8px;}
.table.ui-compact tbody td{padding:6px 8px;}
.ui-input-sm,.ui-select-sm{height:28px;padding:3px 8px;font-size:12px;border:1px solid var(--ui-border);border-radius:6px;background:var(--ui-bg);}
.ui-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border:0;border-radius:6px;background:var(--ui-chip);font-size:11px;line-height:18px;}
.ui-chip .ui-close{opacity:0;transition:opacity .15s}
.ui-chip:hover .ui-close{opacity:.8}
.ui-tooltip{background:var(--ui-bg);border:1px solid var(--ui-border);box-shadow:var(--ui-shadow);border-radius:8px;}
```

---

### 執行方式（本地）
- 開發：`npm run dev`（Vite，127.0.0.1:4182）
- 建置：`npm run build`



---

## 完整原始碼（可直接複製貼上）

### src/pages/app/Tracking.tsx

```tsx
import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { getTracked, removeTracked, clearTracked, updateTracked, type TrackedPost } from '../../tracking/tracking'

export default function TrackingPage() {
  const [rows, setRows] = useState<TrackedPost[]>([])
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ left: number; top: number } | null>(null)
  const [hoverText, setHoverText] = useState<string>('')
  const hideTimerRef = useRef<number | null>(null)
  const anchorRectRef = useRef<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }
  const hideTooltipLater = () => {
    clearHideTimer()
    hideTimerRef.current = window.setTimeout(() => {
      setHoverId(null)
      setHoverPos(null)
      setHoverText('')
    }, 120)
  }

  useLayoutEffect(() => {
    if (!hoverId || !anchorRectRef.current) return
    const margin = 8
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    // 若還未渲染出來，先給一個初始位置避免閃爍
    const fallbackLeft = Math.max(margin, Math.min(anchorRectRef.current.left, viewportW - margin - 1))
    const fallbackTop = Math.max(margin, Math.min(anchorRectRef.current.bottom + margin, viewportH - margin - 1))
    let left = fallbackLeft
    let top = fallbackTop

    const el = tooltipRef.current
    if (el) {
      const w = el.offsetWidth
      const h = el.offsetHeight
      const canPlaceRight = anchorRectRef.current.right + margin + w <= viewportW - margin
      const canPlaceLeft = anchorRectRef.current.left - margin - w >= margin
      if (canPlaceRight) {
        left = anchorRectRef.current.right + margin
      } else if (canPlaceLeft) {
        left = anchorRectRef.current.left - margin - w
      } else {
        left = Math.max(margin, Math.min(anchorRectRef.current.left, viewportW - margin - w))
      }
      const desiredTop = anchorRectRef.current.top
      top = Math.max(margin, Math.min(desiredTop, viewportH - margin - h))
    }
    setHoverPos({ left, top })
  }, [hoverId, hoverText])
  const refresh = () => setRows(getTracked())
  useEffect(() => { refresh() }, [])

  const exportCSV = () => {
    if (!rows.length) return
    const header = ['postId','articleId','articleTitle','platform','content','permalink','publishDate','likes','comments','shares','saves','notes','createdAt']
    const data = rows.map(r => [
      r.postId,
      r.articleId,
      (r.articleTitle||'').replaceAll('\n',' '),
      r.platform,
      (r.content||'').replaceAll('\n',' '),
      r.permalink ?? '',
      r.publishDate ?? '',
      r.likes ?? 0,
      r.comments ?? 0,
      r.shares ?? 0,
      r.saves ?? 0,
      r.notes ?? '',
      r.createdAt ?? '',
    ])
    const lines = [header, ...data]
      .map(r => r.map(x => '"' + String(x ?? '').replaceAll('"','""') + '"').join(','))
      .join('\r\n')
    const csv = '\uFEFF' + lines
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tracked-posts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 ui-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Noto Serif TC, serif' }}>追蹤列表</h1>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline text-sm" onClick={exportCSV}>匯出 CSV</button>
          <button className="btn btn-ghost text-sm" onClick={refresh}>重新整理</button>
          <button className="btn btn-ghost text-sm" onClick={() => { if (confirm('清空所有追蹤項目？')) { clearTracked(); refresh() } }}>清空</button>
        </div>
      </div>

      <SearchBar onFilter={(keyword, start, end) => {
        const all = getTracked()
        const kw = keyword.trim()
        const filtered = all.filter(r => {
          const inKw = kw ? (
            r.postId.includes(kw) || r.articleId.includes(kw) ||
            (r.articleTitle||'').includes(kw) || (r.content||'').includes(kw) ||
            (r.tags||[]).some(t => t.includes(kw))
          ) : true
          const ct = r.createdAt ? new Date(r.createdAt).getTime() : 0
          const inStart = start ? ct >= new Date(start).getTime() : true
          const inEnd = end ? ct <= new Date(end).getTime() + 24*60*60*1000 - 1 : true
          return inKw && inStart && inEnd
        })
        setRows(filtered)
      }} />

      <div className="overflow-x-auto card">
        <table className="table ui-compact">
          <thead>
            <tr>
              <th>貼文識別碼</th>
              <th>原文編號</th>
              <th>原文標題</th>
              <th>平台</th>
              <th>內容（截斷）</th>
              <th>標籤</th>
              <th>貼文連結</th>
              <th>發佈日期</th>
              <th>讚</th>
              <th>留言</th>
              <th>分享</th>
              <th>儲存</th>
              <th>備註</th>
              <th>建立時間</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={15} className="px-3 py-6 text-center text-gray-500">尚無資料</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <td className="px-3 py-2 border-t">{r.postId}</td>
                <td className="px-3 py-2 border-t">{r.articleId}</td>
                <td className="px-3 py-2 border-t">{r.articleTitle || '（無標題）'}</td>

                <td className="px-3 py-2 border-t">
                  <select
                    className="ui-select-sm"
                    value={(r.platform ?? (r.articleId?.toUpperCase().includes('IG') ? 'Instagram' : 'Threads')) as TrackedPost['platform']}
                    onChange={(e)=>{ const v = e.target.value as TrackedPost['platform']; updateTracked(r.id, { platform: v }); setRows(prev => prev.map(x=> x.id===r.id? { ...x, platform: v }: x)); }}
                  >
                    <option value="Threads">Threads</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                  </select>
                </td>

                <td className="px-3 py-2 border-t text-gray-600 align-top">
                  <div
                    className="max-w-64"
                    onMouseEnter={(e) => {
                      clearHideTimer()
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                      anchorRectRef.current = rect
                      setHoverText(r.content || '')
                      setHoverId(r.id)
                    }}
                    onMouseLeave={hideTooltipLater}
                  >
                    <span>{(r.content || '').slice(0, 10)}{(r.content || '').length > 10 ? '…' : ''}</span>
                  </div>
                </td>

                <td className="px-3 py-2 border-t">
                  <TagInput
                    value={r.tags || []}
                    onChange={(tags)=>{ updateTracked(r.id,{ tags }); setRows(prev => prev.map(x=> x.id===r.id? { ...x, tags }: x)); }}
                    suggestions={Array.from(new Set(getTracked().flatMap(x => x.tags || [])))}
                  />
                </td>

                <td className="px-3 py-2 border-t">
                  <input className="ui-input-sm" placeholder="https://..." value={r.permalink || ''}
                    onChange={e=>{ updateTracked(r.id,{ permalink: e.target.value }); setRows(prev=>prev) }} />
                </td>

                <td className="px-3 py-2 border-t">
                  <input className="ui-date-sm" type="date" value={r.publishDate || ''}
                    onChange={e=>{ updateTracked(r.id,{ publishDate: e.target.value }); setRows(prev => prev.map(x=> x.id===r.id? { ...x, publishDate: e.target.value }: x)); }} />
                </td>

                <td className="px-3 py-2 border-t ui-gap-x">
                  <input className="ui-input-xs" type="text" inputMode="numeric" value={r.likes ?? 0}
                    onChange={e=>{ const v = Number(e.target.value||0); updateTracked(r.id,{ likes: v }); setRows(prev => prev.map(x=> x.id===r.id? { ...x, likes: v }: x)); }} />
                </td>

                <td className="px-3 py-2 border-t ui-gap-x">
                  <input className="ui-input-xs" type="text" inputMode="numeric" value={r.comments ?? 0}
                    onChange={e=>{ const v = Number(e.target.value||0); updateTracked(r.id,{ comments: v }); setRows(prev => prev.map(x=> x.id===r.id? { ...x, comments: v }: x)); }} />
                </td>

                <td className="px-3 py-2 border-t ui-gap-x">
                  <input className="ui-input-xs" type="text" inputMode="numeric" value={r.shares ?? 0}
                    onChange={e=>{ const v = Number(e.target.value||0); updateTracked(r.id,{ shares: v }); setRows(prev => prev.map(x=> x.id===r.id? { ...x, shares: v }: x)); }} />
                </td>

                <td className="px-3 py-2 border-t ui-gap-x">
                  <input className="ui-input-xs" type="text" inputMode="numeric" value={r.saves ?? 0}
                    onChange={e=>{ const v = Number(e.target.value||0); updateTracked(r.id,{ saves: v }); setRows(prev => prev.map(x=> x.id===r.id? { ...x, saves: v }: x)); }} />
                </td>

                <td className="px-3 py-2 border-t">
                  <input className="ui-input-sm" value={r.notes || ''}
                    onChange={e=>{ const v = e.target.value; updateTracked(r.id,{ notes: v }); setRows(prev => prev.map(x=> x.id===r.id? { ...x, notes: v }: x)); }} />
                </td>

                <td className="px-3 py-2 border-t">{r.createdAt?.replace('T',' ').slice(0,19) || '-'}</td>

                <td className="px-3 py-2 border-t">
                  <div className="flex gap-2 justify-end">
                    <button className="btn btn-ghost text-xs" onClick={()=> { removeTracked(r.id); refresh() }}>移除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hoverId && hoverPos && (
        <div
          ref={tooltipRef}
          className="fixed z-50 w-[24rem] max-h-56 overflow-auto p-2 ui-tooltip ui-12 whitespace-pre-wrap"
          style={{ left: hoverPos.left, top: hoverPos.top }}
          onMouseEnter={clearHideTimer}
          onMouseLeave={hideTooltipLater}
        >
          {hoverText}
        </div>
      )}
    </div>
  )
}

function SearchBar({ onFilter }: { onFilter: (keyword: string, start?: string, end?: string) => void }){
  const [kw, setKw] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  return (
    <div className="card card-body flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-sm text-gray-600">關鍵字</label>
        <input className="ui-input-sm" placeholder="輸入關鍵字" value={kw} onChange={e=>setKw(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-gray-600">開始日期</label>
        <input className="ui-date-sm" type="date" value={start} onChange={e=>setStart(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-gray-600">結束日期</label>
        <input className="ui-date-sm" type="date" value={end} onChange={e=>setEnd(e.target.value)} />
      </div>
      <div className="ml-auto flex gap-2">
        <button className="btn btn-outline" onClick={()=> onFilter(kw, start || undefined, end || undefined)}>搜尋</button>
        <button className="btn btn-ghost" onClick={()=> { setKw(''); setStart(''); setEnd(''); onFilter('', undefined, undefined) }}>重置</button>
      </div>
    </div>
  )
}

function TagInput({ value, onChange, suggestions }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[] }){
  const [text, setText] = useState('')
  const exist = new Set(value)
  const filtered = suggestions.filter(s => s.toLowerCase().includes(text.toLowerCase()) && !exist.has(s)).slice(0, 6)

  const add = (tag: string) => {
    const t = tag.trim()
    if (!t) return
    if (exist.has(t)) { setText(''); return }
    onChange([...value, t]); setText('')
  }
  const remove = (tag: string) => onChange(value.filter(t => t !== tag))

  return (
    <div className="min-w-56">
      <div className="flex flex-wrap gap-1 mb-1">
        {value.map(t => (
          <span key={t} className="ui-chip">
            #{t}
            <button className="ui-close" onClick={()=>remove(t)}>×</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input className="ui-input-sm" placeholder="輸入後按 Enter 或選擇建議" value={text}
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
```

### src/pages/app/Generator.tsx

```tsx
import { useEffect, useMemo, useState } from 'react'
import { addTracked, getTracked, removeTracked, clearTracked, nextArticleId } from '../../tracking/tracking'
import type { TrackedPost } from '../../tracking/tracking'

type Platform = 'Threads' | 'Instagram' | 'Facebook'

type Card = {
  id: string
  platform: Platform
  label: string
  content: string
  checked: boolean
  code: string // T1/T2/T3/IG/MAN
}

export default function Generator() {
  const [title, setTitle] = useState('')
  const [article, setArticle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [cards, setCards] = useState<Card[]>([])
  const [tracked, setTracked] = useState<TrackedPost[]>([])

  const refreshTracked = () => setTracked(getTracked())
  useEffect(() => { refreshTracked() }, [])

  const anyChecked = useMemo(() => cards.some(c => c.checked), [cards])

  const onGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      const res = generateFrom(article)
      const articleId = nextArticleId()
      const newCards: Card[] = [
        { id: crypto.randomUUID(), platform: 'Threads', label: `Threads 建議 1（約 500 字） · ${articleId}`, content: res[0], checked: false, code: 'T1' },
        { id: crypto.randomUUID(), platform: 'Threads', label: `Threads 建議 2（約 350 字） · ${articleId}`, content: res[1], checked: false, code: 'T2' },
        { id: crypto.randomUUID(), platform: 'Threads', label: `Threads 建議 3（約 200 字） · ${articleId}`, content: res[2], checked: false, code: 'T3' },
        { id: crypto.randomUUID(), platform: 'Instagram', label: `Instagram 建議 · ${articleId}`, content: res[3], checked: false, code: 'IG' },
      ]
      setCards(newCards)
      setGenerating(false)
    }, 300)
  }

  const onCopy = async (content: string) => {
    try { await navigator.clipboard.writeText(content); alert('已複製到剪貼簿') } catch { alert('複製失敗') }
  }

  const addManual = () => {
    setCards(prev => ([
      ...prev,
      { id: crypto.randomUUID(), platform: 'Threads', label: '手動新增', content: '', checked: false, code: 'MAN' }
    ]))
  }

  const onAddToTracking = () => {
    const selected = cards.filter(c => c.checked)
    if (!selected.length) return
    // 從第一張卡片的 label 取出 Axxx（若沒有，臨時給一個）
    const articleId = /A\d{3}/.exec(selected[0]?.label || '')?.[0] || nextArticleId()
    addTracked(selected.map(c => ({
      articleId,
      branchCode: c.code,
      postId: '',
      articleTitle: title,
      content: c.content,
      platform: c.platform,
    })))
    alert('已加入追蹤列表：' + selected.length + ' 筆')
    setCards(prev => prev.map(c => ({ ...c, checked: false })))
    refreshTracked()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 左：輸入與設定 */}
      <div className="lg:col-span-1 space-y-4">
        <div className="card card-body space-y-3">
          <div>
            <label className="block text-sm text-gray-600">標題</label>
            <input className="mt-1 input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="輸入原文標題" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">文章</label>
            <textarea className="mt-1 textarea h-56" value={article} onChange={e=>setArticle(e.target.value)} placeholder="貼上完整長文…" />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost text-gray-500 cursor-not-allowed" title="即將推出" disabled>個人化風格設定</button>
            <button className="ml-auto btn btn-primary disabled:opacity-50" disabled={!article || generating} onClick={onGenerate}>
              {generating ? '生成中…' : '開始生成貼文'}
            </button>
          </div>
        </div>
      </div>

      {/* 中：結果卡片 */}
      <div className="lg:col-span-2 space-y-4">
        {cards.length === 0 ? (
          <div className="text-sm text-gray-500">尚未有結果，請先輸入文章並點「開始生成貼文」。</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((c) => (
              <div key={c.id} className="relative card card-body flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.label} · {c.platform}</div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4" checked={c.checked} onChange={e=> setCards(prev => prev.map(x => x.id===c.id? { ...x, checked: e.target.checked }: x))} />
                    選取
                  </label>
                </div>
                {c.code === 'MAN' && (
                  <select className="select w-40 text-sm" value={c.platform} onChange={e=> setCards(prev => prev.map(x => x.id===c.id? { ...x, platform: e.target.value as Platform }: x))}>
                    <option>Threads</option>
                    <option>Instagram</option>
                    <option>Facebook</option>
                  </select>
                )}
                <textarea className="textarea text-sm" value={c.content} onChange={e=> setCards(prev => prev.map(x => x.id===c.id? { ...x, content: e.target.value }: x))} />
                <div className="flex justify-end">
                  <button className="btn btn-outline text-sm" onClick={()=>onCopy(c.content)}>複製</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button className="btn btn-outline" onClick={addManual}>＋ 手動新增卡片</button>
          {anyChecked && (
            <button className="ml-auto btn btn-primary" onClick={onAddToTracking}>將選取項目加入追蹤列表</button>
          )}
        </div>
      </div>

      {/* 右：追蹤列表 */}
      <div className="lg:col-span-1 space-y-4">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>追蹤列表</span>
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost text-xs" onClick={refreshTracked}>重新整理</button>
              <button
                className="btn btn-outline text-xs"
                onClick={() => {
                  if (!tracked.length) return
                  const header = ['postId','articleId','articleTitle','platform','branchCode','content','permalink','publishDate','likes','comments','shares','saves','notes','createdAt']
                  const rows = tracked.map(t => [
                    t.postId,
                    t.articleId,
                    (t.articleTitle || '').replaceAll('\n',' '),
                    t.platform,
                    t.branchCode,
                    (t.content || '').replaceAll('\n',' '),
                    t.permalink ?? '',
                    t.publishDate ?? '',
                    t.likes ?? 0,
                    t.comments ?? 0,
                    t.shares ?? 0,
                    t.saves ?? 0,
                    t.notes ?? '',
                    t.createdAt ?? '',
                  ])
                  const lines = [header, ...rows]
                    .map(r => r.map(x => '"' + String(x ?? '').replaceAll('"','""') + '"').join(','))
                    .join('\r\n')
                  const csv = '\\uFEFF' + lines
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'tracked-posts.csv'
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >匯出CSV</button>
              <button className="btn btn-ghost text-xs" onClick={() => { if (confirm('清空所有追蹤項目？')) { clearTracked(); refreshTracked() } }}>清空</button>
            </div>
          </div>
          <div className="card-body space-y-3">
            {tracked.length === 0 ? (
              <div className="text-sm text-gray-500">尚無追蹤項目</div>
            ) : (
              <ul className="space-y-3">
                {tracked.map(item => (
                  <li key={item.id} className="border rounded p-3 bg-white/60">
                    <div className="text-sm text-gray-500">{item.platform} · {item.branchCode}</div>
                    <div className="font-medium">{item.articleTitle || '（無標題）'}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-gray-600">{item.content}</div>
                    <div className="mt-2 flex justify-end gap-2">
                      <button className="btn btn-outline text-xs" onClick={() => onCopy(item.content)}>複製內容</button>
                      <button className="btn btn-ghost text-xs" onClick={() => { removeTracked(item.id); refreshTracked() }}>移除</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function generateFrom(text: string): [string, string, string, string] {
  const cleaned = text.replace(/\n+/g, '\n').trim()
  const parts = cleaned.split(/(?<=[。！？!?.])\s*/)
  const makeLen = (limit: number) => {
    if (!cleaned) return ''
    let out = ''
    for (const s of parts) {
      if ((out + s).length > limit) break
      out += s
    }
    if (!out) out = cleaned.slice(0, limit)
    return out
  }
  return [makeLen(500), makeLen(350), makeLen(200), makeLen(220)]
}
```

### src/index.css

```css
/* Notion-like UI (compact) */
:root{
  --ui-bg:#fff; --ui-fg:#111827; --ui-border:#e5e7eb; --ui-chip:#f3f4f6;
  --ui-shadow:0 6px 16px rgba(0,0,0,.12);
}
.fix-scrollbar-layout-shift html, .fix-scrollbar-layout-shift body{ height:100%; }
html{ overflow-y: scroll; }
body{ min-height:100%; scrollbar-gutter: stable; }
.ui-12{font-size:12px;}
.table.ui-compact thead th{padding:6px 8px;}
.table.ui-compact tbody td{padding:6px 8px;}

.ui-input-sm,.ui-select-sm{height:28px;padding:3px 8px;font-size:12px;border:1px solid var(--ui-border);border-radius:6px;background:var(--ui-bg);}
.ui-input-sm{width:80px;}
.ui-select-sm{width:120px;}
.ui-date-sm{height:28px;padding:3px 8px;font-size:12px;border:1px solid var(--ui-border);border-radius:6px;background:var(--ui-bg);width:115px;}

input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
input[type=number]{-moz-appearance:textfield}
.ui-gap-x>*+*{margin-left:6px}

.ui-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border:0;border-radius:6px;background:var(--ui-chip);font-size:11px;line-height:18px;}
.ui-chip .ui-close{opacity:0;transition:opacity .15s}
.ui-chip:hover .ui-close{opacity:.8}

.ui-tooltip{background:var(--ui-bg);border:1px solid var(--ui-border);box-shadow:var(--ui-shadow);border-radius:8px;}

/* 更小的數字輸入（寬 48px）→ 讚／留言／分享／儲存 用這個 */
.ui-input-xs{height:28px;padding:3px 6px;font-size:12px;border:1px solid var(--ui-border);border-radius:6px;background:var(--ui-bg);width:48px;}
```