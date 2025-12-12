export const enum PromptKind {
    Normal = 'normal',
    Special = 'special',
    Lora = 'lora',
}

export interface Prompt {
    /**
     * @description 数据库表 editors 中的主键 id
     */
    id: string
    text: string
    translation: string
    description: string
    source: string
    kind: PromptKind
    relatedTexts: string[]
    tagIds: string[]
    exampleIds: string[]
    rate: number
    createTime: number
    updateTime: number
}

export interface NewPrompt {
    text: string
    translation?: string
    description?: string
    source?: string
    kind?: PromptKind
    relatedTexts?: string[]
    tagIds?: string[]
    exampleIds?: string[]
    rate?: number
}

export type UpdatePrompt = Partial<NewPrompt> & {
    id: string
}
