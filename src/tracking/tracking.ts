export type TrackedPost = {
  id: string
  // 核心識別欄位
  articleId: string // 例如 A001
  branchCode: string // 例如 T1 / T2 / IG / MAN
  postId: string // articleId-branchCode，例如 A001-T1

  // 內容與來源
  articleTitle: string
  content: string
  platform: 'Threads' | 'Instagram' | 'Facebook'

  // 管理欄位
  threadsPostId?: string
  permalink?: string
  publishDate?: string // YYYY-MM-DD
  likes?: number
  comments?: number
  shares?: number
  saves?: number
  notes?: string
  tags?: string[]
  createdAt: string
  ownerEmail?: string
}

import { getSession } from '../auth/auth'

const LS_PREFIX = 'limiautopost:tracked'
const SEQ_PREFIX = 'limiautopost:articleSeq'
// 舊版（未分帳）key，用於一次性搬移
const LEGACY_TRACKED_KEY = 'limiautopost:tracked'
const LEGACY_SEQ_KEY = 'limiautopost:articleSeq'

function currentUserKey(prefix: string): string {
  // 以登入者 email 區隔各自資料；未登入則落到 anon
  try {
    const email = getSession()?.email?.toLowerCase() || 'anon'
    return `${prefix}:${email}`
  } catch {
    return `${prefix}:anon`
  }
}

function migrateLegacyIfNeeded() {
  try {
    const session = getSession()
    // 僅允許管理者在本機執行一次性搬移，避免把舊資料複製到所有使用者底下
    if (!session || !session.roles.includes('admin')) return
    const migratedFlag = 'limiautopost:migrated:tracked'
    if (localStorage.getItem(migratedFlag)) return

    const userTrackedKey = currentUserKey(LS_PREFIX)
    const userSeqKey = currentUserKey(SEQ_PREFIX)
    const hasUserTracked = localStorage.getItem(userTrackedKey)
    const legacyTracked = localStorage.getItem(LEGACY_TRACKED_KEY)
    if (!hasUserTracked && legacyTracked) {
      localStorage.setItem(userTrackedKey, legacyTracked)
      console.info('[tracking] Migrated legacy tracked list to admin key:', userTrackedKey)
    }
    const hasUserSeq = localStorage.getItem(userSeqKey)
    const legacySeq = localStorage.getItem(LEGACY_SEQ_KEY)
    if (!hasUserSeq && legacySeq) {
      localStorage.setItem(userSeqKey, legacySeq)
      console.info('[tracking] Migrated legacy seq to admin key:', userSeqKey)
    }
    localStorage.setItem(migratedFlag, '1')
  } catch {
    // 忽略遷移錯誤
  }
}

export function getTracked(): TrackedPost[] {
  try {
    migrateLegacyIfNeeded()
    const key = currentUserKey(LS_PREFIX)
    const raw = localStorage.getItem(key)
    const list = raw ? (JSON.parse(raw) as TrackedPost[]) : []
    const email = getSession()?.email
    return email ? list.filter(x => (x.ownerEmail ?? email) === email) : list
  } catch {
    return []
  }
}

export function addTracked(items: Array<Omit<TrackedPost, 'id' | 'postId' | 'createdAt' | 'likes' | 'comments' | 'shares' | 'saves' | 'tags'>>): TrackedPost[] {
  const list = getTracked()
  // 準備序號累計：以 articleId + 平台字母 為 key，避免新增多筆時重複
  const counters = new Map<string, number>()
  const normLetter = (platform: TrackedPost['platform']): 'T' | 'G' | 'F' => (
    platform === 'Threads' ? 'T' : platform === 'Instagram' ? 'G' : 'F'
  )
  // 從既有資料建立初始計數，Instagram 以前可能是 I 開頭，視為 G
  for (const x of list) {
    const m = /^([TIFG])(\d+)$/.exec(x.branchCode)
    if (!m) continue
    const rawLetter = m[1]
    const n = parseInt(m[2], 10)
    const letter = rawLetter === 'I' ? 'G' : (rawLetter as 'T' | 'G' | 'F')
    const key = `${x.articleId}-${letter}`
    counters.set(key, Math.max(counters.get(key) || 0, n))
  }

  const email = getSession()?.email || ''
  const created = items.map(it => {
    // 若標題相同，沿用既有的 articleId（同一篇原文不換編號）
    const titleKey = (it.articleTitle || '').trim()
    const foundSameTitle = titleKey
      ? list.find(x => (x.articleTitle || '').trim() === titleKey)
      : undefined
    const resolvedArticleId = foundSameTitle ? foundSameTitle.articleId : it.articleId

    // 依平台自動產生編碼：T1/T2、G1/G2（IG→G）、F1/F2
    let branchCode = it.branchCode
    const keep = typeof branchCode === 'string' && /^[TGF]\d+$/.test(branchCode)
    if (!keep) {
      const letter = normLetter(it.platform)
      const key = `${resolvedArticleId}-${letter}`
      const next = (counters.get(key) || 0) + 1
      counters.set(key, next)
      branchCode = `${letter}${next}`
    }
    const record: TrackedPost = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      tags: [],
      ...it,
      articleId: resolvedArticleId,
      branchCode: branchCode!,
      postId: `${resolvedArticleId}-${branchCode}`,
      ownerEmail: email,
    }
    return record
  })
  const newList = [...created, ...list]
  const key = currentUserKey(LS_PREFIX)
  localStorage.setItem(key, JSON.stringify(newList))
  return newList
}

export function removeTracked(id: string): TrackedPost[] {
  const list = getTracked()
  const newList = list.filter(item => item.id !== id)
  const key = currentUserKey(LS_PREFIX)
  localStorage.setItem(key, JSON.stringify(newList))
  return newList
}

export function clearTracked(): void {
  const key = currentUserKey(LS_PREFIX)
  localStorage.removeItem(key)
}

export function updateTracked(id: string, changes: Partial<TrackedPost>): TrackedPost | null {
  const list = getTracked()
  const idx = list.findIndex(x => x.id === id)
  if (idx === -1) return null
  const prev = list[idx]
  const merged: TrackedPost = { ...prev, ...changes }
  // 若 articleId 或 branchCode 有變，重算 postId
  if (changes.articleId || changes.branchCode) {
    merged.postId = `${merged.articleId}-${merged.branchCode}`
  }
  list[idx] = merged
  const key = currentUserKey(LS_PREFIX)
  localStorage.setItem(key, JSON.stringify(list))
  return merged
}

export function nextArticleId(): string {
  try {
    migrateLegacyIfNeeded()
    const key = currentUserKey(SEQ_PREFIX)
    const raw = localStorage.getItem(key)
    const n = raw ? parseInt(raw, 10) : 0
    const next = n + 1
    localStorage.setItem(key, String(next))
    return `A${String(next).padStart(3, '0')}`
  } catch {
    return `A${Math.floor(Math.random()*900+100)}`
  }
}


