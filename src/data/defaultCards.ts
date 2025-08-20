import type { SystemCard } from '../types/cards'

export const defaultSystemCards: SystemCard[] = [
  {
    id: 'template-1',
    name: '生活體悟',
    description: '分享生活感悟、個人成長、心靈啟發',
    category: 'threads',
    prompt: `請嚴格遵守以下規則生成 Threads 第一則貼文：
- 聚焦於一個清晰的主題（體悟、情境、對話）
- 包含獨立完整的觀點與論述，結尾加收束句
- 加入一個相關 hashtag（限一個）
- 字數限制：480～500 字
- 不能與其他貼文有上下文延續關係`,
    isActive: true,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    platform: 'threads',
    templateTitle: '生活體悟',
    templateFeatures: '分享生活感悟、個人成長、心靈啟發',
    isSelected: false
  },
  {
    id: 'template-2',
    name: '專業分享',
    description: '行業見解、技能分享、專業知識',
    category: 'threads',
    prompt: `請嚴格遵守以下規則生成 Threads 第一則貼文：
- 聚焦於一個專業主題或技能分享
- 包含實用的建議或見解，結尾加行動呼籲
- 加入一個相關 hashtag（限一個）
- 字數限制：480～500 字
- 不能與其他貼文有上下文延續關係`,
    isActive: true,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    platform: 'threads',
    templateTitle: '專業分享',
    templateFeatures: '行業見解、技能分享、專業知識',
    isSelected: false
  },
  {
    id: 'template-3',
    name: '創意故事',
    description: '故事創作、想像力、創意表達',
    category: 'threads',
    prompt: `請嚴格遵守以下規則生成 Threads 第一則貼文：
- 聚焦於一個創意故事或想像情境
- 包含生動的描述和情感表達，結尾加反思
- 加入一個相關 hashtag（限一個）
- 字數限制：480～500 字
- 不能與其他貼文有上下文延續關係`,
    isActive: true,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    platform: 'threads',
    templateTitle: '創意故事',
    templateFeatures: '故事創作、想像力、創意表達',
    isSelected: false
  },
  {
    id: 'template-4',
    name: '時事評論',
    description: '社會議題、時事分析、觀點表達',
    category: 'threads',
    prompt: `請嚴格遵守以下規則生成 Threads 第一則貼文：
- 聚焦於一個時事議題或社會現象
- 包含客觀分析和個人觀點，結尾加思考問題
- 加入一個相關 hashtag（限一個）
- 字數限制：480～500 字
- 不能與其他貼文有上下文延續關係`,
    isActive: true,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    platform: 'threads',
    templateTitle: '時事評論',
    templateFeatures: '社會議題、時事分析、觀點表達',
    isSelected: false
  }
]
