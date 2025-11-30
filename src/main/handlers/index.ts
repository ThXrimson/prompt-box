import { initExampleHandlers } from './example'
import { initImageHandlers } from './image'
import { initOtherHandlers } from './other'
import { initPromptHandlers } from './prompt'
import { initTagHandlers } from './tag'
import { initWorkspaceHandlers } from './workspace'

import { BrowserWindow } from 'electron'

export async function initHandlers(mainWindow: BrowserWindow): Promise<void> {
    // TODO 提供一个接口处理数据和文件的一致性
    await initExampleHandlers(mainWindow)
    await initImageHandlers(mainWindow)
    await initPromptHandlers(mainWindow)
    await initTagHandlers(mainWindow)
    await initWorkspaceHandlers(mainWindow)
    await initOtherHandlers(mainWindow)
}
