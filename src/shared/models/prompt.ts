export interface Prompt {
    /**
     * @description 数据库表 editors 中的主键 id
     */
    id: string
    text: string
    translation: string
    description: string
    tagIds: string[]
    exampleIds: string[]
    createTime: number
    updateTime: number
}

export interface NewPrompt {
    text: string
    translation?: string
    description?: string
    tagIds?: string[]
    exampleIds?: string[]
}

export type UpdatePrompt = Partial<NewPrompt> & {
    id: string
}
