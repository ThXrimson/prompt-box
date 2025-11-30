import { BrowserWindow, ipcMain } from 'electron/main'
import PromptLowdbService from '../services/prompt'
import { IpcChannel } from '@shared/ipc-channel'
import { NewPrompt, UpdatePrompt } from '@shared/models/prompt'

export async function initPromptHandlers(mainWindow: BrowserWindow): Promise<void> {
    const promptService = PromptLowdbService.getInstance()
    ipcMain.handle(IpcChannel.CreatePrompts, (_event, prompts: NewPrompt[]) => {
        return promptService.create(prompts)
    })
    ipcMain.handle(IpcChannel.GetAllPrompts, () => {
        return promptService.getAll()
    })
    ipcMain.handle(IpcChannel.UpdatePrompts, (_event, prompts: UpdatePrompt[]) => {
        return promptService.update(prompts)
    })
    ipcMain.handle(IpcChannel.DeletePrompts, (_event, ids: string[]) => {
        return promptService.delete(ids)
    })
    mainWindow.webContents.send(IpcChannel.NotifyPrompts, await promptService.getAll())
}
