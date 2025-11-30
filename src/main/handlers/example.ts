import { IpcChannel } from '@shared/ipc-channel'
import { ipcMain } from 'electron'
import { BrowserWindow } from 'electron/main'
import ExampleLowdbService from '../services/example'
import { NewExample, UpdateExample } from '@shared/models/example'
import PromptLowdbService from '../services/prompt'
import ImageLowdbService from '../services/image'
import { join } from 'path'
import { getImageDir } from '../utils'
import fs from 'fs/promises'

export async function initExampleHandlers(mainWindow: BrowserWindow): Promise<void> {
    const exampleService = ExampleLowdbService.getInstance()
    ipcMain.handle(IpcChannel.CreateExamples, (_event, examples: NewExample[]) => {
        return exampleService.create(examples)
    })
    ipcMain.handle(IpcChannel.GetAllExamples, () => {
        return exampleService.getAll()
    })
    ipcMain.handle(IpcChannel.UpdateExamples, (_event, examples: UpdateExample[]) => {
        return exampleService.update(examples)
    })
    ipcMain.handle(IpcChannel.DeleteExamples, (_event, ids: string[]) => {
        return deleteExamples(ids)
    })
    mainWindow.webContents.send(IpcChannel.NotifyExamples, await exampleService.getAll())
}

/**
 * @description 删除指定 ID 的示例，并从所有提示中移除该示例的引用，并删除示例引用的图片
 */
async function deleteExamples(ids: string[]): Promise<boolean> {
    const exampleService = ExampleLowdbService.getInstance()
    const promptService = PromptLowdbService.getInstance()
    const imageService = ImageLowdbService.getInstance()
    const prompts = await promptService.getAll()
    const newPrompts = prompts.map((prompt) => ({
        ...prompt,
        exampleIds: prompt.exampleIds.filter((id) => !ids.includes(id)),
    }))
    await promptService.update(newPrompts)
    const examples = await exampleService.getAll()
    const images = await imageService.getAll()
    const deleteImageIds = examples
        .filter((example) => ids.includes(example.id))
        .flatMap((example) => example.imageIds)
    const deleteImageFileNames = images
        .filter((image) => deleteImageIds.includes(image.id))
        .map((image) => image.fileName)
    for (const fileName of deleteImageFileNames) {
        await fs.unlink(join(getImageDir(), fileName))
    }
    return exampleService.delete(ids)
}
