import { BrowserWindow, ipcMain } from 'electron/main'
import PromptLowdbService from '../services/prompt'
import { IpcChannels } from '@shared/ipc-channel'

export async function initPromptHandlers(mainWindow: BrowserWindow): Promise<void> {
    // TODO
    const promptService = PromptLowdbService.getInstance()
    ipcMain.handle(IpcChannels.CreatePrompts, () => {})
    ipcMain.handle(IpcChannels.GetAllPrompts, () => {})
    ipcMain.handle(IpcChannels.UpdatePrompts, () => {})
    ipcMain.handle(IpcChannels.DeletePrompts, () => {})
    mainWindow.webContents.send(IpcChannels.NotifyPrompts, await promptService.getAll())
}
