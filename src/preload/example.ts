import { IpcChannel } from '@shared/ipc-channel'
import { Example, NewExample, UpdateExample } from '@shared/models/example'
import { ipcRenderer, IpcRendererEvent } from 'electron/renderer'

export default {
    create(examples: NewExample[]): Promise<Example[]> {
        return ipcRenderer.invoke(IpcChannel.CreateExamples, examples)
    },
    getAll(): Promise<Example[]> {
        return ipcRenderer.invoke(IpcChannel.GetAllExamples)
    },
    update(examples: UpdateExample[]): Promise<Example[]> {
        return ipcRenderer.invoke(IpcChannel.UpdateExamples, examples)
    },
    delete(ids: string[]): Promise<boolean> {
        return ipcRenderer.invoke(IpcChannel.DeleteExamples, ids)
    },
    notify(listener: (event: IpcRendererEvent, examples: Example[]) => void) {
        ipcRenderer.on(IpcChannel.NotifyExamples, listener)
    },
}
