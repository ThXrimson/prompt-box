export type RequireField<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>
export type OptionalField<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>

export interface PromptExample {
  /**
   * @description 数据库表 examples 中的主键 id
   */
  id: number
  /**
   * @description 示例的 prompt
   */
  text: string
  images: string[]
}

export interface Prompt {
  /**
   * @description 数据库表 editors 中的主键 id
   */
  id: number
  text: string
  translation: string
  description: string
  tags: string[]
  examples: PromptExample[]
  insertTime: number
}

export interface EditorState {
  id: number
  prompts: string[]
}

export interface WorkspaceState {
  /**
   * @description 数据库表 workspace_states 中的主键 id
   */
  id: number
  name: string
  positiveEditor: EditorState
  negativeEditor: EditorState
  /**
   * @description 当前 workspace 打开的 tag collections
   */
  tagCollections: string[]
  createTime: string
  updateTime: string
}
