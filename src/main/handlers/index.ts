import { initExampleHandlers } from './example'
import { initImageHandlers } from './image'
import { initPromptHandlers } from './prompt'
import { initTagHandlers } from './tag'
import { initWorkspaceHandlers } from './workspace'

import { BrowserWindow } from 'electron'

export async function initHandlers(mainWindow: BrowserWindow): Promise<void> {
    await initExampleHandlers(mainWindow)
    await initImageHandlers(mainWindow)
    await initPromptHandlers(mainWindow)
    await initTagHandlers(mainWindow)
    await initWorkspaceHandlers(mainWindow)
}
