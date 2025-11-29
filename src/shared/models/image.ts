export interface Image {
    id: string
    fileName: string
    createTime: number
    updateTime: number
}

export interface NewImage {
    fileName: string
}

export interface UpdateImage {
    id: string
    fileName?: string
}
