import { PromptTag } from './prompt-tag'

export interface Workspace {
    /**
     * @description 数据库表 workspace_states 中的主键 id
     */
    id: string
    name: string
    positive: PromptTag[]
    negative: PromptTag[]
    /**
     * @description 当前 workspace 打开的 tag collections
     */
    tagIds: string[]
    createTime: number
    updateTime: number
}

export interface NewWorkspace {
    name: string
    positive?: PromptTag[]
    negative?: PromptTag[]
    tagIds?: string[]
}

export type UpdateWorkspace = Partial<NewWorkspace> & {
    id: string
}
