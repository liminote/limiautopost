export type TrackedPost = {
  id: string
  title: string
  content: string
  platform: 'Threads' | 'Instagram' | 'Facebook'
  branchCode: string // A001-T1 etc. 暫時只存分支代碼
}

const LS_KEY = 'limiautopost:tracked'

export function getTracked(): TrackedPost[] {
  try { const raw = localStorage.getItem(LS_KEY); return raw? JSON.parse(raw): [] } catch { return [] }
}

export function addTracked(items: Array<Omit<TrackedPost, 'id'>>): TrackedPost[] {
  const list = getTracked()
  const created = items.map(it => ({ ...it, id: crypto.randomUUID() }))
  const newList = [...created, ...list]
  localStorage.setItem(LS_KEY, JSON.stringify(newList))
  return newList
}


