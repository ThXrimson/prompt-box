import { IpcChannels } from '@shared/ipc-channel'
import { ipcMain } from 'electron'
import { BrowserWindow } from 'electron/main'
import ExampleLowdbService from '../services/example'

export async function initExampleHandlers(mainWindow: BrowserWindow): Promise<void> {
    // TODO
    const exampleService = ExampleLowdbService.getInstance()
    ipcMain.handle(IpcChannels.CreateExamples, () => {})
    ipcMain.handle(IpcChannels.GetAllExamples, () => {})
    ipcMain.handle(IpcChannels.UpdateExamples, () => {})
    ipcMain.handle(IpcChannels.DeleteExamples, () => {})
    mainWindow.webContents.send(IpcChannels.NotifyExamples, await exampleService.getAll())
}
