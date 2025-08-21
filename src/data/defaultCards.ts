import type { SystemCard } from '../types/cards'

export const defaultSystemCards: SystemCard[] = [
  {
    id: 'template-1',
    name: '生活體悟模板',
    description: '分享日常生活感悟和思考的模板',
    category: 'threads',
    prompt: '請分享一個今天讓你有所感悟的生活片段，可以是小事也可以是大事，重點是表達你的思考和感受。',
    isActive: true,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    platform: 'threads',
    templateTitle: '生活體悟模板',
    templateFeatures: '分享日常生活感悟和思考的模板',
    isSelected: false
  },
  {
    id: 'template-2',
    name: '知識分享模板',
    description: '分享專業知識和學習心得的模板',
    category: 'threads',
    prompt: '請分享一個你最近學到的新知識或技能，解釋它的重要性，以及你如何應用它。',
    isActive: true,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    platform: 'threads',
    templateTitle: '知識分享模板',
    templateFeatures: '分享專業知識和學習心得的模板',
    isSelected: false
  },
  {
    id: 'template-3',
    name: '創意靈感模板',
    description: '激發創意和靈感的模板',
    category: 'threads',
    prompt: '請分享一個讓你感到興奮的創意想法或靈感，描述它是如何產生的，以及你計劃如何實現它。',
    isActive: true,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    platform: 'threads',
    templateTitle: '創意靈感模板',
    templateFeatures: '激發創意和靈感的模板',
    isSelected: false
  },
  {
    id: 'template-4',
    name: '反思總結模板',
    description: '定期反思和總結的模板',
    category: 'threads',
    prompt: '請對最近一段時間的經歷進行反思總結，分享你的收穫、挑戰和成長。',
    isActive: true,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    platform: 'threads',
    templateTitle: '反思總結模板',
    templateFeatures: '定期反思和總結的模板',
    isSelected: false
  }
]
