import { dirname, join } from 'node:path'
import type { Example, Image, Prompt, Tag, Workspace } from '@shared/types'
import { mkdirSync } from 'node:fs'
import { JSONFileSyncPreset } from 'lowdb/node'
import { cloneDeep } from 'lodash'
import { getAppDir } from './utils'

export default class Storage {
  private db: ReturnType<
    typeof JSONFileSyncPreset<{
      prompts: Prompt[]
      examples: Example[]
      tags: Tag[]
      images: Image[]
      workspaces: Workspace[]
    }>
  >

  private static instance: Storage

  static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage()
    }
    return Storage.instance
  }

  private constructor() {
    const dbPath = join(getAppDir(), 'data', 'db.json')
    mkdirSync(dirname(dbPath), { recursive: true })
    this.db = JSONFileSyncPreset<{
      prompts: Prompt[]
      examples: Example[]
      tags: Tag[]
      images: Image[]
      workspaces: Workspace[]
    }>(dbPath, {
      prompts: [],
      examples: [],
      tags: [],
      images: [],
      workspaces: [],
    })
  }

  write(): void {
    this.db.write()
  }

  getAllPrompts(): Prompt[] {
    return cloneDeep(this.db.data.prompts)
  }

  getAllTags(): Tag[] {
    return cloneDeep(this.db.data.tags)
  }

  getAllImages(): Image[] {
    return cloneDeep(this.db.data.images)
  }

  getAllExamples(): Example[] {
    return cloneDeep(this.db.data.examples)
  }

  getAllWorkspaces(): Workspace[] {
    return cloneDeep(this.db.data.workspaces)
  }

  getWorkspaceByID(workspaceID: string): Workspace | null {
    return (
      cloneDeep(
        this.db.data.workspaces.find(
          (workspace) => workspace.id === workspaceID
        )
      ) || null
    )
  }

  getPromptByID(promptID: string): Prompt | null {
    return (
      cloneDeep(
        this.db.data.prompts.find((prompt) => prompt.id === promptID)
      ) || null
    )
  }

  getTagByID(tagID: string): Tag | null {
    return cloneDeep(this.db.data.tags.find((tag) => tag.id === tagID)) || null
  }

  getExampleByID(exampleID: string): Example | null {
    return (
      cloneDeep(
        this.db.data.examples.find((example) => example.id === exampleID)
      ) || null
    )
  }

  getImageByID(imageID: string): Image | null {
    return (
      cloneDeep(this.db.data.images.find((image) => image.id === imageID)) ||
      null
    )
  }

  addPrompt(prompt: {
    id?: string
    text: string
    translation?: string
    description?: string
    tagIDs?: string[]
    exampleIDs?: string[]
  }): Prompt {
    const id =
      !prompt.id || this.db.data.prompts.some((p) => p.id === prompt.id)
        ? crypto.randomUUID()
        : prompt.id
    const newPrompt: Prompt = {
      id,
      text: prompt.text,
      translation: prompt.translation ?? '',
      description: prompt.description ?? '',
      tagIDs: prompt.tagIDs ?? [],
      exampleIDs: prompt.exampleIDs ?? [],
      insertTime: Date.now(),
    }
    this.db.data.prompts.unshift(newPrompt)
    this.write()
    return cloneDeep(newPrompt)
  }
  /**
   * @description 删除指定 ID 的图片，并从所有示例中移除该图片的引用
   */
  deleteImage(imageID: string): void {
    const imageIndex = this.db.data.images.findIndex(
      (image) => image.id === imageID
    )
    if (imageIndex !== -1) {
      this.db.data.images.splice(imageIndex, 1)
      this.db.data.examples.forEach((example) => {
        example.imageIDs = example.imageIDs.filter((id) => id !== imageID)
      })
      this.write()
    }
  }

  addImageToExample(exampleID: string, imageID: string): Image {
    const example = this.db.data.examples.find(
      (example) => example.id === exampleID
    )
    if (!example) {
      throw new Error(`Example with ID ${exampleID} not found`)
    }
    const image = this.getImageByID(imageID)
    if (!image) {
      throw new Error(`Image with ID ${imageID} not found`)
    }
    if (!example.imageIDs.includes(imageID)) {
      example.imageIDs.push(imageID)
    }
    this.write()
    return image
  }

  addImage(imageFileName: string): Image {
    const newImage: Image = {
      id: crypto.randomUUID(),
      fileName: imageFileName,
    }
    this.db.data.images.unshift(newImage)
    this.write()
    return cloneDeep(newImage)
  }

  deleteImageFromExample(exampleID: string, imageID: string): void {
    const example = this.getExampleByID(exampleID)
    if (!example) {
      return
    }
    example.imageIDs = example.imageIDs.filter((id) => id !== imageID)
    this.write()
  }

  updateExample(example: {
    id: string
    positivePrompt?: string
    negativePrompt?: string
    extra?: string
    imageIDs?: string[]
  }): Example | null {
    const existingExampleIndex = this.db.data.examples.findIndex(
      (e) => e.id === example.id
    )
    if (existingExampleIndex !== -1) {
      const existingExample = this.db.data.examples[existingExampleIndex]
      if (example.positivePrompt !== undefined)
        existingExample.positivePrompt = example.positivePrompt
      if (example.negativePrompt !== undefined)
        existingExample.negativePrompt = example.negativePrompt
      if (example.extra !== undefined) existingExample.extra = example.extra
      if (example.imageIDs !== undefined) {
        existingExample.imageIDs = example.imageIDs
      }
      this.db.data.examples[existingExampleIndex] = existingExample
      this.write()
      return cloneDeep(existingExample)
    }
    return null
  }

  addExample(example: {
    id?: string
    positivePrompt?: string
    negativePrompt?: string
    extra?: string
    imageIDs?: string[]
  }): Example {
    const id =
      !example.id || this.db.data.examples.some((e) => e.id === example.id)
        ? crypto.randomUUID()
        : example.id
    const newExample: Example = {
      id,
      positivePrompt: example.positivePrompt ?? '',
      negativePrompt: example.negativePrompt ?? '',
      extra: example.extra ?? '',
      imageIDs: example.imageIDs ?? [],
    }
    this.db.data.examples.unshift(newExample)
    this.write()
    return cloneDeep(newExample)
  }

  /**
   * @description 删除指定 ID 的示例，并从所有提示词中移除该示例的引用，并删除示例引用的图片
   */
  deleteExample(exampleID: string): void {
    const exampleIndex = this.db.data.examples.findIndex(
      (example) => example.id === exampleID
    )
    if (exampleIndex !== -1) {
      // Remove example from all prompts
      this.db.data.prompts.forEach((prompt) => {
        prompt.exampleIDs = prompt.exampleIDs.filter((id) => id !== exampleID)
      })
      // Remove images associated with the example
      const example = this.db.data.examples[exampleIndex]
      example.imageIDs.forEach((imageID) => {
        this.deleteImageFromExample(exampleID, imageID)
      })
      // Finally, remove the example itself
      this.db.data.examples.splice(exampleIndex, 1)
      this.write()
    }
  }

  addExampleToPrompt(
    promptID: string,
    example: {
      id?: string
      positivePrompt?: string
      negativePrompt?: string
      extra?: string
      imageIDs?: string[]
    }
  ): Example {
    const prompt = this.getPromptByID(promptID)
    if (!prompt) {
      throw new Error(`Prompt with ID ${promptID} not found`)
    }
    const newExample = this.addExample(example)
    prompt.exampleIDs.unshift(newExample.id)
    this.write()
    return newExample
  }

  addExampleIDToPrompt(promptID: string, exampleID: string): Example {
    const prompt = this.getPromptByID(promptID)
    if (!prompt) {
      throw new Error(`Prompt with ID ${promptID} not found`)
    }
    const newExample = this.getExampleByID(exampleID)
    if (!newExample) {
      throw new Error(`Example with ID ${exampleID} not found`)
    }
    prompt.exampleIDs.unshift(newExample.id)
    this.write()
    return newExample
  }

  deleteExampleIDFromPrompt(promptID: string, exampleID: string): void {
    const prompt = this.getPromptByID(promptID)
    if (!prompt) {
      return
    }
    prompt.exampleIDs = prompt.exampleIDs.filter((id) => id !== exampleID)
    this.write()
  }

  deleteExampleFromPrompt(promptID: string, exampleID: string): void {
    const prompt = this.getPromptByID(promptID)
    if (!prompt) {
      return
    }
    this.deleteExample(exampleID)
    prompt.exampleIDs = prompt.exampleIDs.filter((id) => id !== exampleID)
    this.write()
  }

  updatePrompt(prompt: {
    id: string
    text?: string
    translation?: string
    description?: string
    tagIDs?: string[]
    exampleIDs?: string[]
  }): void {
    const p = this.db.data.prompts.find((p) => p.id === prompt.id)
    if (!p) {
      throw new Error(`Prompt with ID ${prompt.id} not found`)
    }
    if (prompt.text !== undefined) p.text = prompt.text
    if (prompt.translation !== undefined) p.translation = prompt.translation
    if (prompt.description !== undefined) p.description = prompt.description
    if (prompt.tagIDs !== undefined) p.tagIDs = prompt.tagIDs
    if (prompt.exampleIDs !== undefined) p.exampleIDs = prompt.exampleIDs
    this.write()
  }

  addTag(tag: { id?: string; text: string }): Tag {
    const id =
      !tag.id || this.db.data.tags.some(({ id }) => id === tag.id)
        ? crypto.randomUUID()
        : tag.id
    const newTag: Tag = {
      id,
      text: tag.text,
    }
    this.db.data.tags.push(newTag)
    this.write()
    return cloneDeep(newTag)
  }

  /**
   * @description 删除指定 ID 的标签，并从所有提示中移除该标签的引用
   */
  deleteTag(tagID: string): void {
    const tagIndex = this.db.data.tags.findIndex((tag) => tag.id === tagID)
    if (tagIndex !== -1) {
      this.db.data.tags.splice(tagIndex, 1)
      // Remove tag from all prompts
      this.db.data.prompts.forEach((prompt) => {
        prompt.tagIDs = prompt.tagIDs.filter((id) => id !== tagID)
      })
      this.write()
    }
  }

  updateTag(tag: { id: string; text: string }): Tag {
    const existingTag = this.db.data.tags.find((t) => t.id === tag.id)
    if (!existingTag) {
      throw new Error(`Tag with ID ${tag.id} not found`)
    }
    existingTag.text = tag.text
    this.write()
    return cloneDeep(existingTag)
  }

  updateWorkspace(workspace: {
    id: string
    name?: string
    positiveEditor?: string
    negativeEditor?: string
    tagIDs?: string[]
  }): Workspace {
    const existingWorkspace = this.db.data.workspaces.find(
      (w) => w.id === workspace.id
    )
    if (!existingWorkspace) {
      throw new Error(`Workspace with ID ${workspace.id} not found`)
    }
    if (workspace.name !== undefined) existingWorkspace.name = workspace.name
    if (workspace.positiveEditor !== undefined)
      existingWorkspace.positiveEditor = workspace.positiveEditor
    if (workspace.negativeEditor !== undefined)
      existingWorkspace.negativeEditor = workspace.negativeEditor
    if (workspace.tagIDs !== undefined)
      existingWorkspace.tagIDs = workspace.tagIDs
    existingWorkspace.updateTime = Date.now()
    this.write()
    return cloneDeep(existingWorkspace)
  }

  /**
   * @description 检查标签是否被引用，如果没有引用则删除该标签
   */
  checkAndDeleteTagWithoutReferences(tagID: string): void {
    const isReferenced = this.db.data.prompts.some((prompt) =>
      prompt.tagIDs.some((id) => id === tagID)
    )
    if (isReferenced) {
      return
    }
    this.deleteTag(tagID)
  }

  deletePrompt(promptID: string): void {
    const promptIndex = this.db.data.prompts.findIndex(
      (prompt) => prompt.id === promptID
    )
    if (promptIndex !== -1) {
      this.db.data.prompts.splice(promptIndex, 1)
      this.write()
    }
  }

  addWorkspace(workspace: {
    id?: string
    name: string
    positiveEditor?: string
    negativeEditor?: string
    tagIDs?: string[]
  }): Workspace {
    const id =
      !workspace.id ||
      this.db.data.workspaces.some((w) => w.id === workspace.id)
        ? crypto.randomUUID()
        : workspace.id
    const newWorkspace: Workspace = {
      id,
      name: workspace.name,
      positiveEditor: workspace.positiveEditor ?? '',
      negativeEditor: workspace.negativeEditor ?? '',
      tagIDs: workspace.tagIDs ?? [],
      createTime: Date.now(),
      updateTime: Date.now(),
    }
    this.db.data.workspaces.unshift(newWorkspace)
    this.write()
    return cloneDeep(newWorkspace)
  }

  deleteWorkspace(workspaceID: string): void {
    const workspaceIndex = this.db.data.workspaces.findIndex(
      (workspace) => workspace.id === workspaceID
    )
    if (workspaceIndex !== -1) {
      this.db.data.workspaces.splice(workspaceIndex, 1)
      this.write()
    }
  }
}
