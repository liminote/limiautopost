// 平台配置對象，統一管理所有平台相關的配置
export const PLATFORM_CONFIG = {
  threads: {
    display: 'TD',
    label: 'Threads',
    color: '#0ea5a1',
    contentIndex: 0, // 使用 res[0] 的內容
    codePrefix: 'T'
  },
  instagram: {
    display: 'IG',
    label: 'Instagram', 
    color: '#ec4899',
    contentIndex: 3, // 使用 res[3] 的內容
    codePrefix: 'I'
  },
  general: {
    display: 'GE',
    label: '通用',
    color: '#92400e',
    contentIndex: 0, // 使用 res[0] 的內容
    codePrefix: 'G'
  },
  facebook: {
    display: 'FB',
    label: 'Facebook',
    color: '#2563eb',
    contentIndex: 0, // 使用 res[0] 的內容
    codePrefix: 'F'
  }
} as const

export type PlatformType = keyof typeof PLATFORM_CONFIG

// 平台顯示名稱映射
export const PLATFORM_DISPLAY_MAP = {
  Threads: 'TD',
  Instagram: 'IG',
  General: 'GE',
  Facebook: 'FB'
} as const

// 編號生成函數
export const generateCode = (platform: PlatformType, index: number): string => {
  const config = PLATFORM_CONFIG[platform]
  return `${config.codePrefix}${index + 1}`
}

// 平台映射函數
export const mapPlatform = (platform: PlatformType): 'Threads' | 'Instagram' | 'Facebook' | 'General' => {
  const platformMap = {
    threads: 'Threads' as const,
    instagram: 'Instagram' as const,
    general: 'General' as const,
    facebook: 'Facebook' as const
  }
  return platformMap[platform]
}

// 平台標籤函數
export const getPlatformLabel = (platform: PlatformType): string => {
  return PLATFORM_CONFIG[platform].label
}
