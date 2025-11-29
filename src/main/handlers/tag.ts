import { BrowserWindow, ipcMain } from 'electron/main'
import TagLowdbService from '../services/tag'
import { IpcChannels } from '@shared/ipc-channel'

export async function initTagHandlers(mainWindow: BrowserWindow): Promise<void> {
    // TODO
    const tagService = TagLowdbService.getInstance()
    ipcMain.handle(IpcChannels.CreateTags, () => {})
    ipcMain.handle(IpcChannels.GetAllTags, () => {})
    ipcMain.handle(IpcChannels.UpdateTags, () => {})
    ipcMain.handle(IpcChannels.DeleteTags, () => {})
    mainWindow.webContents.send(IpcChannels.NotifyTags, await tagService.getAll())
}
