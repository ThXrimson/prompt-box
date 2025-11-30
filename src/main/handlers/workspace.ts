import { BrowserWindow } from 'electron'
import WorkspaceLowdbService from '../services/workspace'
import { IpcChannel } from '@shared/ipc-channel'
import { ipcMain } from 'electron/main'
import { NewWorkspace, UpdateWorkspace } from '@shared/models/workspace'

export async function initWorkspaceHandlers(mainWindow: BrowserWindow): Promise<void> {
    const workspaceService = WorkspaceLowdbService.getInstance()
    ipcMain.handle(IpcChannel.CreateWorkspaces, (_event, workspaces: NewWorkspace[]) => {
        return workspaceService.create(workspaces)
    })
    ipcMain.handle(IpcChannel.GetAllWorkspaces, () => {
        return workspaceService.getAll()
    })
    ipcMain.handle(IpcChannel.UpdateWorkspaces, (_event, workspaces: UpdateWorkspace[]) => {
        return workspaceService.update(workspaces)
    })
    ipcMain.handle(IpcChannel.DeleteWorkspaces, (_event, ids: string[]) => {
        return workspaceService.delete(ids)
    })
    mainWindow.webContents.send(IpcChannel.NotifyWorkspaces, await workspaceService.getAll())
}
