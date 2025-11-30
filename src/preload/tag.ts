import { IpcChannel } from '@shared/ipc-channel'
import { Tag, UpdateTag } from '@shared/models/tag'
import { ipcRenderer, IpcRendererEvent } from 'electron/renderer'

export default {
    create(tags: string[]): Promise<Tag[]> {
        return ipcRenderer.invoke(IpcChannel.CreateTags, tags)
    },
    getAll(): Promise<Tag[]> {
        return ipcRenderer.invoke(IpcChannel.GetAllTags)
    },
    update(tags: UpdateTag[]): Promise<Tag[]> {
        return ipcRenderer.invoke(IpcChannel.UpdateTags, tags)
    },
    delete(ids: string[]): Promise<boolean> {
        return ipcRenderer.invoke(IpcChannel.DeleteTags, ids)
    },
    notify(listener: (event: IpcRendererEvent, tags: Tag[]) => void) {
        ipcRenderer.on(IpcChannel.NotifyTags, listener)
    },
}
