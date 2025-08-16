import type { SystemCard } from '../types/cards'

export const defaultSystemCards: SystemCard[] = [
  {
    id: 'system-threads-1',
    name: 'Threads 第一則貼文',
    description: '生成 Threads 第一則貼文，字數 480-500 字',
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
    templateTitle: 'Threads 第一則貼文',
    templateFeatures: '480-500字，完整觀點論述，獨立主題',
    isSelected: true
  },
  {
    id: 'system-threads-2',
    name: 'Threads 第二則貼文',
    description: '生成 Threads 第二則貼文，字數 330-350 字',
    category: 'threads',
    prompt: `請嚴格遵守以下規則生成 Threads 第二則貼文：
- 聚焦於一個清晰的主題（體悟、情境、對話）
- 包含獨立完整的觀點與論述，結尾加收束句
- 加入一個相關 hashtag（限一個）
- 字數限制：330～350 字
- 不能與其他貼文有上下文延續關係`,
    isActive: true,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    platform: 'threads',
    templateTitle: 'Threads 第二則貼文',
    templateFeatures: '330-350字，完整觀點論述，獨立主題',
    isSelected: true
  },
  {
    id: 'system-threads-3',
    name: 'Threads 第三則貼文',
    description: '生成 Threads 第三則貼文，字數 180-200 字',
    category: 'threads',
    prompt: `請嚴格遵守以下規則生成 Threads 第三則貼文：
- 聚焦於一個清晰的主題（體悟、情境、對話）
- 包含獨立完整的觀點與論述，結尾加收束句
- 加入一個相關 hashtag（限一個）
- 字數限制：180～200 字
- 不能與其他貼文有上下文延續關係`,
    isActive: true,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    platform: 'threads',
    templateTitle: 'Threads 第三則貼文',
    templateFeatures: '180-200字，完整觀點論述，獨立主題',
    isSelected: true
  },
  {
    id: 'system-instagram',
    name: 'Instagram 貼文',
    description: '生成 Instagram 貼文，語氣溫暖具洞察力',
    category: 'instagram',
    prompt: `請生成 Instagram 貼文：
- 語氣溫暖但具洞察力
- 可結尾搭配開放式問題（例如「你也有這樣的經驗嗎？」）
- 長度可以略長於 Threads
- 保持與主題相關的連貫性`,
    isActive: true,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    platform: 'instagram',
    templateTitle: 'Instagram 貼文',
    templateFeatures: '溫暖語氣，開放式問題結尾，具洞察力',
    isSelected: true
  }
]
