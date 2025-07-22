import { contextBridge, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import log from 'electron-log'
import {
  type Example,
  type Image,
  type Prompt,
  type Tag,
  type Workspace,
} from '../shared/types'
import { ipcRenderer } from 'electron/renderer'
import * as ipcChannels from '@shared/ipc-channels'

// Custom APIs for renderer
const api = {
  getAllPrompts: async (): Promise<Prompt[]> => {
    return ipcRenderer.invoke(ipcChannels.getAllPrompts)
  },
  getAllTags: async (): Promise<Tag[]> => {
    return ipcRenderer.invoke(ipcChannels.getAllTags)
  },
  getAllExamples: async (): Promise<Example[]> => {
    return ipcRenderer.invoke(ipcChannels.getAllExamples)
  },
  getAllImages: async (): Promise<Image[]> => {
    return ipcRenderer.invoke(ipcChannels.getAllImages)
  },
  getAllWorkspaces: async (): Promise<Workspace[]> => {
    return ipcRenderer.invoke(ipcChannels.getAllWorkspaces)
  },
  getPathForFile: (file: File): string => {
    return webUtils.getPathForFile(file)
  },
  /**
   * @ignore
   */
  addImage: async (path: string): Promise<Image | null> => {
    return ipcRenderer.invoke(ipcChannels.addImage, path)
  },
  /**
   * @ignore
   */
  deleteImage: async (imageID: string): Promise<boolean> => {
    return ipcRenderer.invoke(ipcChannels.deleteImage, imageID)
  },
  getPromptByID: async (promptID: string): Promise<Prompt | null> => {
    return ipcRenderer.invoke(ipcChannels.getPromptByID, promptID)
  },
  openImageDialog: async (): Promise<string | null> => {
    const result = await ipcRenderer.invoke(ipcChannels.openImageDialog)
    if (result && typeof result === 'string') {
      return result
    }
    return null
  },
  writeStorage: async (): Promise<void> => {
    await ipcRenderer.invoke(ipcChannels.writeStorage)
  },
  addImageToExample: async (
    exampleID: string,
    path: string
  ): Promise<Image | null> => {
    return await ipcRenderer.invoke(
      ipcChannels.addImageToExample,
      exampleID,
      path
    )
  },
  deleteImageFromExample: async (
    exampleID: string,
    imageID: string
  ): Promise<boolean> => {
    return await ipcRenderer.invoke(
      ipcChannels.deleteImageFromExample,
      exampleID,
      imageID
    )
  },
  updateExample: async (example: {
    id: string
    positivePrompt?: string
    negativePrompt?: string
    extra?: string
    imageIDs?: string[]
  }): Promise<Example | null> => {
    return await ipcRenderer.invoke(ipcChannels.updateExample, example)
  },
  addExample: async (example: {
    id?: string
    positivePrompt?: string
    negativePrompt?: string
    extra?: string
    imageIDs?: string[]
  }): Promise<Example | null> => {
    return await ipcRenderer.invoke(ipcChannels.addExample, example)
  },
  deleteExample: async (exampleID: string): Promise<boolean> => {
    return await ipcRenderer.invoke(ipcChannels.deleteExample, exampleID)
  },
  addPrompt: async (prompt: {
    id?: string
    text: string
    translation?: string
    description?: string
    tagIDs?: string[]
    exampleIDs?: string[]
  }): Promise<Prompt | null> => {
    return await ipcRenderer.invoke(ipcChannels.addPrompt, prompt)
  },
  updatePrompt: async (prompt: {
    id: string
    text?: string
    translation?: string
    description?: string
    tagIDs?: string[]
    exampleIDs?: string[]
  }): Promise<boolean> => {
    return await ipcRenderer.invoke(ipcChannels.updatePrompt, prompt)
  },
  addTag: async (tag: { id?: string; text: string }): Promise<Tag | null> => {
    return await ipcRenderer.invoke(ipcChannels.addTag, tag)
  },
  deleteTag: async (tagID: string): Promise<boolean> => {
    return await ipcRenderer.invoke(ipcChannels.deleteTag, tagID)
  },
  updateTag: async (tag: { id: string; text: string }): Promise<Tag | null> => {
    return await ipcRenderer.invoke(ipcChannels.updateTag, tag)
  },
  deletePrompt: async (promptID: string): Promise<boolean> => {
    return await ipcRenderer.invoke(ipcChannels.deletePrompt, promptID)
  },
  addExampleToPrompt: async (
    promptID: string,
    example: {
      id?: string
      positivePrompt?: string
      negativePrompt?: string
      extra?: string
      imageIDs?: string[]
    }
  ): Promise<Example | null> => {
    return await ipcRenderer.invoke(
      ipcChannels.addExampleToPrompt,
      promptID,
      example
    )
  },
  addExampleIDToPrompt: async (
    promptID: string,
    exampleID: string
  ): Promise<Example | null> => {
    return await ipcRenderer.invoke(
      ipcChannels.addExampleIDToPrompt,
      promptID,
      exampleID
    )
  },
  addWorkspace: async (workspace: {
    id?: string
    name: string
    positiveEditor?: string
    negativeEditor?: string
    tagIDs?: string[]
  }): Promise<Workspace | null> => {
    return await ipcRenderer.invoke(ipcChannels.addWorkspace, workspace)
  },
  deleteWorkspace: async (workspaceID: string): Promise<boolean> => {
    return await ipcRenderer.invoke(ipcChannels.deleteWorkspace, workspaceID)
  },
  deleteExampleIDFromPrompt: async (
    promptID: string,
    exampleID: string
  ): Promise<boolean> => {
    return await ipcRenderer.invoke(
      ipcChannels.deleteExampleIDFromPrompt,
      promptID,
      exampleID
    )
  },
  deleteExampleFromPrompt: async (
    promptID: string,
    exampleID: string
  ): Promise<boolean> => {
    return await ipcRenderer.invoke(
      ipcChannels.deleteExampleFromPrompt,
      promptID,
      exampleID
    )
  },
  updateWorkspace: async (workspace: {
    id: string
    name?: string
    positiveEditor?: string
    negativeEditor?: string
    tagIDs?: string[]
  }): Promise<Workspace | null> => {
    return await ipcRenderer.invoke(ipcChannels.updateWorkspace, workspace)
  },
  copyToClipboard: async (text: string): Promise<boolean> => {
    return await ipcRenderer.invoke(ipcChannels.copyToClipboard, text)
  },
  saveImageTo: async (imageID: string): Promise<boolean> => {
    return await ipcRenderer.invoke(ipcChannels.saveImageTo, imageID)
  },
  translateByDeepLX: (text: string): Promise<string | null> => {
    return ipcRenderer.invoke(ipcChannels.translateByDeepLX, text)
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    log.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

export type WindowApiType = typeof api
