import { IpcChannel } from '@shared/ipc-channel'
import { Image, UpdateImage } from '@shared/models/image'
import { ipcRenderer, IpcRendererEvent } from 'electron/renderer'

export default {
    create(paths: string[]): Promise<Image[]> {
        return ipcRenderer.invoke(IpcChannel.CreateImages, paths)
    },
    getAll(): Promise<Image[]> {
        return ipcRenderer.invoke(IpcChannel.GetAllImages)
    },
    update(images: UpdateImage[]): Promise<Image[]> {
        return ipcRenderer.invoke(IpcChannel.UpdateImages, images)
    },
    delete(ids: string[]): Promise<boolean> {
        return ipcRenderer.invoke(IpcChannel.DeleteImages, ids)
    },
    notify(listener: (event: IpcRendererEvent, images: Image[]) => void) {
        ipcRenderer.on(IpcChannel.NotifyImages, listener)
    },
}
