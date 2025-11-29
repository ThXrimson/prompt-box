export interface Example {
    /**
     * @description 数据库表 examples 中的主键 id
     */
    id: string
    /**
     * @description 示例的参数
     */
    positive: string
    negative: string
    /**
     * @description 示例的额外信息
     */
    extra: string
    imageIds: string[]
    createTime: number
    updateTime: number
}

export interface NewExample {
    positive?: string
    negative?: string
    extra?: string
    imageIds?: string[]
}

export type UpdateExample = NewExample
