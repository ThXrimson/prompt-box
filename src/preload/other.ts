import { IpcChannel } from '@shared/ipc-channel'
import { ipcRenderer, webUtils } from 'electron/renderer'
import { Nullish } from 'utility-types'

export default {
    openImageDialog(): Promise<string | Nullish> {
        return ipcRenderer.invoke(IpcChannel.OpenImageDialog)
    },
    copyToClipboard(text: string): Promise<boolean> {
        return ipcRenderer.invoke(IpcChannel.CopyToClipboard, text)
    },
    translateByDeepLX(text: string): Promise<string> {
        return ipcRenderer.invoke(IpcChannel.TranslateByDeepLX, text)
    },
    getPathForFile(file: File): string {
        return webUtils.getPathForFile(file)
    },
}
