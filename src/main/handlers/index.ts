import { IpcChannel } from '@shared/ipc-channel'
import { initExampleHandlers } from './example'
import { initImageHandlers } from './image'
import { initOtherHandlers } from './other'
import { initPromptHandlers } from './prompt'
import { initTagHandlers } from './tag'
import { initWorkspaceHandlers } from './workspace'

import { BrowserWindow, ipcMain } from 'electron'
import ExampleLowdbService from '../services/example'
import ImageLowdbService from '../services/image'
import PromptLowdbService from '../services/prompt'
import TagLowdbService from '../services/tag'
import WorkspaceLowdbService from '../services/workspace'
import log from 'electron-log/main'
import { UNCATEGORIZED_TAG_ID } from '@shared/models/tag'

export async function initHandlers(mainWindow: BrowserWindow): Promise<void> {
    const initPromise = (async () => {
        await initExampleHandlers(mainWindow)
        await initImageHandlers(mainWindow)
        await initPromptHandlers(mainWindow)
        await initTagHandlers(mainWindow)
        await initWorkspaceHandlers(mainWindow)
        await initOtherHandlers(mainWindow)
        await ensureDataConsistency(mainWindow)
    })()
    ipcMain.once(IpcChannel.DataStoreReady, async () => {
        log.info(`recv data store ready at: ${Date.now()}`)
        await initPromise
        mainWindow.webContents.send(
            IpcChannel.NotifyExamples,
            await ExampleLowdbService.getInstance().getAll()
        )
        mainWindow.webContents.send(
            IpcChannel.NotifyImages,
            await ImageLowdbService.getInstance().getAll()
        )
        mainWindow.webContents.send(
            IpcChannel.NotifyPrompts,
            await PromptLowdbService.getInstance().getAll()
        )
        mainWindow.webContents.send(
            IpcChannel.NotifyTags,
            await TagLowdbService.getInstance().getAll()
        )
        mainWindow.webContents.send(
            IpcChannel.NotifyWorkspaces,
            await WorkspaceLowdbService.getInstance().getAll()
        )
    })
}

export async function ensureDataConsistency(_mainWindow: BrowserWindow): Promise<void> {
    const exampleService = await ExampleLowdbService.getInstance()
    const tagService = await TagLowdbService.getInstance()
    const imageService = await ImageLowdbService.getInstance()
    const promptService = await PromptLowdbService.getInstance()
    const workspaceService = await WorkspaceLowdbService.getInstance()

    const allExamples = await exampleService.getAll()
    const allTags = await tagService.getAll()
    const allPrompts = await promptService.getAll()
    const allWorkspaces = await workspaceService.getAll()
    const allImages = await imageService.getAll()

    const tagIdSet = new Set(allTags.map((tag) => tag.id))
    tagIdSet.add(UNCATEGORIZED_TAG_ID)
    const exampleIdSet = new Set(allExamples.map((example) => example.id))
    const imageIdSet = new Set(allImages.map((image) => image.id))
    for (const example of allExamples) {
        const newImageIds = example.imageIds.filter((id) => imageIdSet.has(id))
        if (newImageIds.length !== example.imageIds.length) {
            const newExample = { ...example, imageIds: newImageIds }
            await exampleService.update([newExample])
        }
    }
    for (const prompt of allPrompts) {
        const newTagIds = prompt.tagIds.filter((id) => tagIdSet.has(id))
        const newExampleIds = prompt.exampleIds.filter((id) => exampleIdSet.has(id))
        if (
            newTagIds.length !== prompt.tagIds.length ||
            newExampleIds.length !== prompt.exampleIds.length
        ) {
            const newPrompt = { ...prompt, tagIds: newTagIds, exampleIds: newExampleIds }
            await promptService.update([newPrompt])
        }
    }
    for (const workspace of allWorkspaces) {
        const newTagIds = workspace.tagIds.filter((id) => tagIdSet.has(id))
        if (newTagIds.length !== workspace.tagIds.length) {
            const newWorkspace = { ...workspace, tagIds: newTagIds }
            await workspaceService.update([newWorkspace])
        }
    }
}
