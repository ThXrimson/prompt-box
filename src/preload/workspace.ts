import { IpcChannel } from '@shared/ipc-channel'
import { NewWorkspace, UpdateWorkspace, Workspace } from '@shared/models/workspace'
import { ipcRenderer, IpcRendererEvent } from 'electron/renderer'

export default {
    create(workspaces: NewWorkspace[]): Promise<Workspace[]> {
        return ipcRenderer.invoke(IpcChannel.CreateWorkspaces, workspaces)
    },
    getAll(): Promise<Workspace[]> {
        return ipcRenderer.invoke(IpcChannel.GetAllWorkspaces)
    },
    update(workspaces: UpdateWorkspace[]): Promise<Workspace[]> {
        return ipcRenderer.invoke(IpcChannel.UpdateWorkspaces, workspaces)
    },
    delete(ids: string[]): Promise<boolean> {
        return ipcRenderer.invoke(IpcChannel.DeleteWorkspaces, ids)
    },
    notify(listener: (event: IpcRendererEvent, workspaces: Workspace[]) => void) {
        ipcRenderer.on(IpcChannel.NotifyWorkspaces, listener)
    },
}
