import { BrowserWindow } from 'electron'
import WorkspaceLowdbService from '../services/workspace'
import { IpcChannels } from '@shared/ipc-channel'
import { ipcMain } from 'electron/main'

export async function initWorkspaceHandlers(mainWindow: BrowserWindow): Promise<void> {
    // TODO
    const workspaceService = WorkspaceLowdbService.getInstance()
    ipcMain.handle(IpcChannels.CreateWorkspaces, () => {})
    ipcMain.handle(IpcChannels.GetAllWorkspaces, () => {})
    ipcMain.handle(IpcChannels.UpdateWorkspaces, () => {})
    ipcMain.handle(IpcChannels.DeleteWorkspaces, () => {})
    mainWindow.webContents.send(IpcChannels.NotifyWorkspaces, await workspaceService.getAll())
}
