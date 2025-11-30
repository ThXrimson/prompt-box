import { BrowserWindow, ipcMain } from 'electron/main'
import TagLowdbService from '../services/tag'
import { IpcChannel } from '@shared/ipc-channel'
import { UpdateTag } from '@shared/models/tag'
import PromptLowdbService from '../services/prompt'
import { intersection } from 'lodash'

export async function initTagHandlers(mainWindow: BrowserWindow): Promise<void> {
    const tagService = TagLowdbService.getInstance()
    ipcMain.handle(IpcChannel.CreateTags, (_event, tags: string[]) => {
        return tagService.create(tags.map((tag) => ({ text: tag })))
    })
    ipcMain.handle(IpcChannel.GetAllTags, () => {
        return tagService.getAll()
    })
    ipcMain.handle(IpcChannel.UpdateTags, (_event, tags: UpdateTag[]) => {
        return tagService.update(tags)
    })
    ipcMain.handle(IpcChannel.DeleteTags, (_event, ids: string[]) => {
        return deleteTags(ids)
    })
    mainWindow.webContents.send(IpcChannel.NotifyTags, await tagService.getAll())
}
async function deleteTags(ids: string[]): Promise<boolean> {
    const tagService = TagLowdbService.getInstance()
    const promptService = PromptLowdbService.getInstance()
    const prompts = await promptService.getAll()
    const promptsWithTag = prompts.filter((prompt) => intersection(prompt.tagIds, ids).length > 0)
    const updatePrompts = promptsWithTag.map((prompt) => ({
        ...prompt,
        tagIds: intersection(prompt.tagIds, ids),
    }))
    await promptService.update(updatePrompts)
    return tagService.delete(ids)
}
