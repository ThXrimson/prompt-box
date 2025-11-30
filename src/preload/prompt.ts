import { IpcChannel } from '@shared/ipc-channel'
import { NewPrompt, Prompt, UpdatePrompt } from '@shared/models/prompt'
import { ipcRenderer, IpcRendererEvent } from 'electron/renderer'

export default {
    create(prompts: NewPrompt[]): Promise<Prompt[]> {
        return ipcRenderer.invoke(IpcChannel.CreatePrompts, prompts)
    },
    getAll(): Promise<Prompt[]> {
        return ipcRenderer.invoke(IpcChannel.GetAllPrompts)
    },
    update(prompts: UpdatePrompt[]): Promise<Prompt[]> {
        return ipcRenderer.invoke(IpcChannel.UpdatePrompts, prompts)
    },
    delete(ids: string[]): Promise<boolean> {
        return ipcRenderer.invoke(IpcChannel.DeletePrompts, ids)
    },
    notify(listener: (event: IpcRendererEvent, prompts: Prompt[]) => void) {
        ipcRenderer.on(IpcChannel.NotifyPrompts, listener)
    },
}
