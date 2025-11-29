import { BrowserWindow, ipcMain } from 'electron/main'
import ImageLowdbService from '../services/image'
import { IpcChannels } from '@shared/ipc-channel'

export async function initImageHandlers(mainWindow: BrowserWindow): Promise<void> {
    // TODO
    const imageService = ImageLowdbService.getInstance()
    ipcMain.handle(IpcChannels.CreateImages, () => {})
    ipcMain.handle(IpcChannels.GetAllImages, () => {})
    ipcMain.handle(IpcChannels.UpdateImages, () => {})
    ipcMain.handle(IpcChannels.DeleteImages, () => {})
    mainWindow.webContents.send(IpcChannels.NotifyImages, await imageService.getAll())
}
