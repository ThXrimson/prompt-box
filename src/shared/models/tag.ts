export interface Tag {
    id: string
    text: string
    createTime: number
    updateTime: number
}

const UNCATEGORIZED_TAG_ID = 'uncategorized'
export function NewUncategorizedTag(): Tag {
    return {
        id: UNCATEGORIZED_TAG_ID,
        text: '未分类',
        createTime: Date.now(),
        updateTime: Date.now(),
    }
}
