import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import log from 'electron-log'
import example from './example'
import image from './image'
import prompt from './prompt'
import tag from './tag'
import workspace from './workspace'
import other from './other'

// Custom APIs for renderer
const api = {
    example,
    image,
    prompt,
    tag,
    workspace,
    other,
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        log.error(error)
    }
} else {
    // @ts-ignore (define in dts)
    window.electron = electronAPI
    // @ts-ignore (define in dts)
    window.api = api
}

export type WindowApiType = typeof api
