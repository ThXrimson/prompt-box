export type RequireField<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>
export type OptionalField<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>

export interface Image {
  id: string
  fileName: string
}

export interface Example {
  /**
   * @description 数据库表 examples 中的主键 id
   */
  id: string
  /**
   * @description 示例的参数
   */
  positivePrompt: string
  negativePrompt: string
  imageIDs: string[]
}

export interface Tag {
  id: string
  text: string
}

export interface Prompt {
  /**
   * @description 数据库表 editors 中的主键 id
   */
  id: string
  text: string
  translation: string
  description: string
  tagIDs: string[]
  exampleIDs: string[]
  insertTime: number
}

export interface Workspace {
  /**
   * @description 数据库表 workspace_states 中的主键 id
   */
  id: string
  name: string
  positiveEditor: string
  negativeEditor: string
  /**
   * @description 当前 workspace 打开的 tag collections
   */
  tagIDs: string[]
  createTime: number
  updateTime: number
}
