import { ElectronAPI } from '@electron-toolkit/preload'
import type { WindowApiType } from '../preload/index'

declare global {
    interface Window {
        electron: ElectronAPI
        api: WindowApiType
    }
}
