import { IpcChannel } from '@shared/ipc-channel'
import { initExampleHandlers } from './example'
import { initImageHandlers } from './image'
import { initOtherHandlers } from './other'
import { initPromptHandlers } from './prompt'
import { initTagHandlers } from './tag'
import { initWorkspaceHandlers } from './workspace'

import { BrowserWindow, ipcMain } from 'electron'
import ExampleLowdbService from '../services/example'
import ImageLowdbService from '../services/image'
import PromptLowdbService from '../services/prompt'
import TagLowdbService from '../services/tag'
import WorkspaceLowdbService from '../services/workspace'
import log from 'electron-log/main'

export async function initHandlers(mainWindow: BrowserWindow): Promise<void> {
    // TODO 提供一个接口处理数据和文件的一致性
    await initExampleHandlers(mainWindow)
    await initImageHandlers(mainWindow)
    await initPromptHandlers(mainWindow)
    await initTagHandlers(mainWindow)
    await initWorkspaceHandlers(mainWindow)
    await initOtherHandlers(mainWindow)
    ipcMain.once(IpcChannel.DataStoreReady, async () => {
        log.info(`recv data store ready at: ${Date.now()}`)
        mainWindow.webContents.send(
            IpcChannel.NotifyExamples,
            await ExampleLowdbService.getInstance().getAll()
        )
        mainWindow.webContents.send(
            IpcChannel.NotifyImages,
            await ImageLowdbService.getInstance().getAll()
        )
        mainWindow.webContents.send(
            IpcChannel.NotifyPrompts,
            await PromptLowdbService.getInstance().getAll()
        )
        mainWindow.webContents.send(
            IpcChannel.NotifyTags,
            await TagLowdbService.getInstance().getAll()
        )
        mainWindow.webContents.send(
            IpcChannel.NotifyWorkspaces,
            await WorkspaceLowdbService.getInstance().getAll()
        )
    })
}
