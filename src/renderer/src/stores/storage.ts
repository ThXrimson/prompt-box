import type { Example, Prompt, Tag, Image, Workspace } from '@shared/types'
import log from 'electron-log'
import { defineStore } from 'pinia'
import { ref, toRaw } from 'vue'
import { cloneDeep } from 'lodash'

export const useStorage = defineStore('storage', () => {
  const prompts = ref(new Map<string, Prompt>())
  const tags = ref(new Map<string, Tag>())
  const examples = ref(new Map<string, Example>())
  const images = ref(new Map<string, Image>())
  const workspaces = ref(new Map<string, Workspace>())

  const initialized = ref(false)
  const initPromise = ref<Promise<void> | null>(null) // 可以暴露一个 Promise
  async function init(): Promise<void> {
    if (initialized.value) return // 避免重复初始化
    if (initPromise.value) return await initPromise.value // 如果正在初始化，等待它完成

    initPromise.value = (async () => {
      try {
        const allPrompts = await window.api.getAllPrompts()
        const allTags = await window.api.getAllTags()
        const allExamples = await window.api.getAllExamples()
        const allImages = await window.api.getAllImages()
        const allWorkspaces = await window.api.getAllWorkspaces()

        prompts.value = new Map(allPrompts.map((p) => [p.id, p]))
        tags.value = new Map(
          [{ id: uncategorizedTagID, text: '未分类' }, ...allTags].map((t) => [t.id, t])
        )
        examples.value = new Map(allExamples.map((e) => [e.id, e]))
        images.value = new Map(allImages.map((i) => [i.id, i]))
        workspaces.value = new Map(allWorkspaces.map((w) => [w.id, w]))

        initialized.value = true
      } catch (error) {
        log.error('Failed to initialize prompt store:', error)
      } finally {
        initPromise.value = null // 清除 Promise
      }
    })()
    await initPromise.value // 等待初始化完成
  }
  if (!initialized.value && !initPromise.value) {
    // 避免在热更新等情况下反复触发
    init()
  }

  function getPromptsByExampleID(
    exampleID: string
  ): { id: string; text: string }[] {
    return Array.from(cloneDeep(prompts.value).values())
      .filter((prompt) => prompt.exampleIDs.includes(exampleID))
      .map((prompt) => ({
        id: prompt.id,
        text: prompt.text,
      }))
  }

  function getExamplesByPromptID(promptID: string): {
    id: string
    positivePrompt: string
    negativePrompt: string
    extra: string
    images: Image[]
  }[] {
    const tempExamples =
      prompts.value
        .get(promptID)
        ?.exampleIDs.map((id) => examples.value.get(id))
        .filter((e) => e !== undefined) || []
    return tempExamples.map((e) => ({
      id: e.id,
      positivePrompt: e.positivePrompt,
      negativePrompt: e.negativePrompt,
      extra: e.extra,
      images: getImagesByExampleID(e.id) || [],
    }))
  }

  function getImagesByExampleID(exampleID: string): Image[] {
    const example = examples.value.get(exampleID)
    if (!example) return []
    return example.imageIDs
      .map((id) => cloneDeep(images.value.get(id)))
      .filter((i) => i !== undefined)
  }

  function getPromptsByTag(tagID: string): Prompt[] {
    if (tagID === uncategorizedTagID) {
      // 如果是未分类的标签，返回没有任何标签的 prompts
      return cloneDeep(Array.from(prompts.value.values())).filter(
        (prompt) => prompt.tagIDs.length === 0
      )
    }
    return Array.from(cloneDeep(prompts.value).values()).filter((prompt) =>
      prompt.tagIDs.some((id) => id === tagID)
    )
  }

  function getTagByID(tagID: string): Tag | undefined {
    return cloneDeep(tags.value.get(tagID))
  }

  function getWorkspaceByID(workspaceID: string): Workspace | null {
    return cloneDeep(workspaces.value.get(workspaceID)) || null
  }

  //#region 添加内容方法
  async function addPrompt(prompt: {
    id?: string
    text: string
    translation?: string
    description?: string
    tagIDs?: string[]
    exampleIDs?: string[]
  }): Promise<Prompt | null> {
    const newPrompt = await window.api.addPrompt(prompt)
    if (!newPrompt) {
      log.error('Failed to add prompt:', prompt)
      return null
    }
    prompts.value.set(newPrompt.id, newPrompt)
    return newPrompt
  }

  async function addTag(tag: {
    id?: string
    text: string
  }): Promise<Tag | null> {
    const newTag = await window.api.addTag(tag)
    if (!newTag) {
      log.error('Failed to add tag:', tag)
      return null
    }
    tags.value.set(newTag.id, newTag)
    return newTag
  }

  async function addExample(example: {
    id?: string
    positivePrompt?: string
    negativePrompt?: string
    extra?: string
    imageIDs?: string[]
  }): Promise<Example | null> {
    const newExample = await window.api.addExample(example)
    if (!newExample) {
      log.error('Failed to add example:', example)
      return null
    }
    examples.value.set(newExample.id, newExample)
    return newExample
  }

  async function addImageToExample(
    exampleID: string,
    path: string
  ): Promise<Image | null> {
    const example = examples.value.get(exampleID)
    if (example) {
      const res = await window.api.addImageToExample(exampleID, path)
      if (res) {
        images.value.set(res.id, res)
        example.imageIDs.push(res.id)
        return res
      } else {
        log.error('Failed to add image to example:', exampleID, path)
      }
    } else {
      log.error('Example not found for adding image:', exampleID)
    }
    return null
  }

  async function addExampleToPrompt(
    promptID: string,
    example: {
      id?: string
      positivePrompt?: string
      negativePrompt?: string
      extra?: string
      imageIDs?: string[]
    }
  ): Promise<Example | null> {
    const prompt = prompts.value.get(promptID)
    if (!prompt) {
      log.error('Prompt not found for adding example:', promptID)
      return null
    }
    const newExample = await window.api.addExampleToPrompt(promptID, example)
    if (!newExample) {
      log.error('Failed to add example to prompt:', promptID, example)
      return null
    }
    prompt.exampleIDs.unshift(newExample.id)
    examples.value.set(newExample.id, newExample)
    return newExample
  }

  async function addExampleIDToPrompt(
    promptID: string,
    exampleID: string
  ): Promise<Example | null> {
    const prompt = prompts.value.get(promptID)
    if (!prompt) {
      log.error('Prompt not found for adding example:', promptID)
      return null
    }
    const example = examples.value.get(exampleID)
    if (!example) {
      log.error('Example not found for adding to prompt:', exampleID)
      return null
    }
    // 如果已经存在，则不重复添加
    if (prompt.exampleIDs.includes(exampleID)) {
      log.warn('Example already exists in prompt:', promptID, exampleID)
      return null
    }
    const newExample = await window.api.addExampleIDToPrompt(
      promptID,
      exampleID
    )
    if (!newExample) {
      log.error('Failed to add example ID to prompt:', promptID, exampleID)
      return null
    }
    prompt.exampleIDs.unshift(newExample.id)
    examples.value.set(newExample.id, newExample)
    return newExample
  }

  async function addWorkspace(workspace: {
    id?: string
    name: string
    positiveEditor?: string
    negativeEditor?: string
    tagIDs?: string[]
  }): Promise<Workspace | null> {
    const newWorkspace = await window.api.addWorkspace(workspace)
    if (!newWorkspace) {
      log.error('Failed to add workspace:', workspace)
      return null
    }
    workspaces.value.set(newWorkspace.id, newWorkspace)
    return newWorkspace
  }
  //#endregion

  //#region 更新内容方法
  async function updateWorkspace(workspace: {
    id: string
    name?: string
    positiveEditor?: string
    negativeEditor?: string
    tagIDs?: string[]
  }): Promise<Workspace | null> {
    const existingWorkspace = workspaces.value.get(workspace.id)
    if (existingWorkspace) {
      const res = await window.api.updateWorkspace(cloneDeep(workspace))
      if (res) {
        workspaces.value.set(res.id, res)
        return res
      } else {
        log.error('Failed to update workspace:', workspace)
      }
    } else {
      log.error('Workspace not found for update:', workspace.id)
    }
    return null
  }
  async function updateExample(example: {
    id: string
    positivePrompt?: string
    negativePrompt?: string
    extra?: string
    imageIDs?: string[]
  }): Promise<boolean> {
    const existingExample = toRaw(examples.value.get(example.id))
    if (existingExample) {
      const res = await window.api.updateExample({
        id: example.id,
        positivePrompt: example.positivePrompt,
        negativePrompt: example.negativePrompt,
        extra: example.extra,
        imageIDs: cloneDeep(example.imageIDs),
      })
      if (res) {
        examples.value.set(example.id, res)
        return true
      } else {
        log.error('Failed to update example:', example)
      }
    } else {
      log.error('Example not found for update:', example.id)
    }
    return false
  }

  async function updatePromptText(id: string, text: string): Promise<boolean> {
    const prompt = prompts.value.get(id)
    if (prompt) {
      const res = await window.api.updatePrompt({
        id,
        text,
      })
      if (res) {
        prompt.text = text
        return true
      }
      log.error('Failed to update prompt text:', id, text)
    }
    return false
  }

  async function updatePromptTranslation(
    id: string,
    translation: string
  ): Promise<boolean> {
    const prompt = prompts.value.get(id)
    if (prompt) {
      const res = await window.api.updatePrompt({
        id,
        translation,
      })
      if (res) {
        prompt.translation = translation
        return true
      }
      log.error('Failed to update prompt translation:', id, translation)
    }
    return false
  }

  async function updatePromptDescription(
    id: string,
    description: string
  ): Promise<boolean> {
    const prompt = prompts.value.get(id)
    if (prompt) {
      const res = await window.api.updatePrompt({
        id,
        description,
      })
      if (res) {
        prompt.description = description
        return true
      }
      log.error('Failed to update prompt description:', id, description)
    }
    return false
  }

  async function updatePromptTags(
    exampleID: string,
    tagIDs: string[]
  ): Promise<boolean> {
    const prompt = prompts.value.get(exampleID)
    if (prompt) {
      const res = await window.api.updatePrompt({
        id: prompt.id,
        tagIDs: toRaw(tagIDs),
      })
      if (res) {
        prompt.tagIDs = cloneDeep(tagIDs)
        return true
      } else {
        log.error('Failed to update prompt tags:', exampleID, tags)
      }
    }
    return false
  }

  async function updatePromptExampleIDs(
    promptID: string,
    exampleIDs: string[]
  ): Promise<boolean> {
    const prompt = prompts.value.get(promptID)
    if (prompt) {
      const res = await window.api.updatePrompt({
        id: prompt.id,
        exampleIDs: toRaw(exampleIDs),
      })
      if (res) {
        prompt.exampleIDs = cloneDeep(exampleIDs)
        return true
      } else {
        log.error('Failed to update prompt example IDs:', promptID, exampleIDs)
      }
    }
    return false
  }
  //#endregion

  //#region 删除内容方法

  async function deleteWorkspace(workspaceID: string): Promise<boolean> {
    const res = await window.api.deleteWorkspace(workspaceID)
    if (res) {
      workspaces.value.delete(workspaceID)
      return true
    } else {
      log.error('Failed to delete workspace:', workspaceID)
      return false
    }
  }

  async function deleteExample(exampleID: string): Promise<boolean> {
    const res = await window.api.deleteExample(exampleID)
    if (res) {
      examples.value.delete(exampleID)
      return true
    } else {
      log.error('Failed to delete example:', exampleID)
      return false
    }
  }

  async function deleteExampleFromPrompt(
    promptID: string,
    exampleID: string
  ): Promise<boolean> {
    const prompt = prompts.value.get(promptID)
    if (prompt) {
      try {
        const res = await window.api.deleteExampleFromPrompt(
          promptID,
          exampleID
        )
        if (!res) {
          log.error(
            'Failed to delete example from prompt:',
            promptID,
            exampleID
          )
          return false
        }
        prompt.exampleIDs = prompt.exampleIDs.filter((id) => id !== exampleID)
        examples.value.delete(exampleID) // 删除 example
        return true
      } catch (error) {
        log.error(
          'Failed to delete example from prompt:',
          promptID,
          exampleID,
          error
        )
        return false
      }
    } else {
      log.error('Prompt not found for deleting example:', promptID)
      return false
    }
  }

  async function deleteExampleIDFromPrompt(
    promptID: string,
    exampleID: string
  ): Promise<boolean> {
    const prompt = prompts.value.get(promptID)
    if (prompt) {
      try {
        const res = await window.api.deleteExampleIDFromPrompt(
          promptID,
          exampleID
        )
        if (!res) {
          log.error(
            'Failed to delete example ID from prompt:',
            promptID,
            exampleID
          )
          return false
        }
        prompt.exampleIDs = prompt.exampleIDs.filter((id) => id !== exampleID)
        return true
      } catch (error) {
        log.error(
          'Failed to delete example ID from prompt:',
          promptID,
          exampleID,
          error
        )
        return false
      }
    } else {
      log.error('Prompt not found for deleting example ID:', promptID)
      return false
    }
  }

  async function deleteImageFromExample(
    exampleID: string,
    imageID: string
  ): Promise<boolean> {
    const example = examples.value.get(exampleID)
    if (example) {
      const res = await window.api.deleteImageFromExample(exampleID, imageID)
      if (res) {
        example.imageIDs = example.imageIDs.filter((id) => id !== imageID)
        images.value.delete(imageID) // 删除 image
        return true
      } else {
        log.error(
          'Failed to delete image %s from example %s',
          exampleID,
          imageID
        )
      }
    } else {
      log.error('Example not found for deleting image:', exampleID)
    }
    return false
  }

  async function deletePrompt(promptID: string): Promise<boolean> {
    const res = await window.api.deletePrompt(promptID)
    if (res) {
      prompts.value.delete(promptID)
      return true
    } else {
      log.error('Failed to delete prompt:', promptID)
      return false
    }
  }

  async function deleteTag(tagID: string): Promise<boolean> {
    const res = await window.api.deleteTag(tagID)
    if (res) {
      tags.value.delete(tagID)
      prompts.value.forEach((prompt) => {
        prompt.tagIDs = prompt.tagIDs.filter((id) => id !== tagID)
      })
      return true
    } else {
      log.error('Failed to delete tag:', tagID)
      return false
    }
  }

  async function deleteTagIDFromPrompt(
    tagID: string,
    promptID: string
  ): Promise<boolean> {
    const prompt = prompts.value.get(promptID)
    if (prompt) {
      const res = await updatePromptTags(
        promptID,
        prompt.tagIDs.filter((id) => id !== tagID)
      )
      if (res) {
        prompt.tagIDs = prompt.tagIDs.filter((id) => id !== tagID)
        return true
      } else {
        log.error('Failed to delete tag ID from prompt:', promptID, tagID)
      }
    } else {
      log.error('Prompt not found for deleting tag ID:', promptID)
    }
    return false
  }

  async function updateTag(tag: {
    id: string
    text: string
  }): Promise<Tag | null> {
    const existingTag = toRaw(tags.value.get(tag.id))
    if (existingTag) {
      const res = await window.api.updateTag(tag)
      if (res) {
        tags.value.set(res.id, res)
        return res
      } else {
        log.error('Failed to update tag:', tag)
      }
    } else {
      log.error('Tag not found for update:', tag.id)
    }
    return null
  }
  //#endregion

  function checkPromptExists(text: string): boolean {
    for (const prompt of prompts.value.values()) {
      if (prompt.text === text) {
        return true
      }
    }
    return false
  }

  function checkTagExists(text: string): boolean {
    for (const tag of tags.value.values()) {
      if (tag.text === text) {
        return true
      }
    }
    return false
  }

  async function write(): Promise<void> {
    await window.api.writeStorage()
  }

  return {
    initialized,
    prompts,
    tags,
    examples,
    images,
    workspaces,
    write,
    checkPromptExists,
    checkTagExists,
    // 查找
    getPromptsByExampleID,
    getExamplesByPromptID,
    getImagesByExampleID,
    getPromptsByTag,
    getTagByID,
    getWorkspaceByID,
    // 添加
    addImageToExample,
    addExampleToPrompt,
    addExampleIDToPrompt,
    addExample,
    addPrompt,
    addTag,
    addWorkspace,
    // 更新
    updateExample,
    updatePromptText,
    updatePromptTranslation,
    updatePromptDescription,
    updatePromptTags,
    updatePromptExampleIDs,
    updateTag,
    updateWorkspace,
    // 删除
    deleteExampleFromPrompt,
    deleteExampleIDFromPrompt,
    deleteImageFromExample,
    deletePrompt,
    deleteExample,
    deleteTag,
    deleteTagIDFromPrompt,
    deleteWorkspace,
  }
})

export const uncategorizedTagID = '0'
