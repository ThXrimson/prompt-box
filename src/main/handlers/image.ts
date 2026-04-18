import { BrowserWindow, dialog, ipcMain } from 'electron/main'
import ImageLowdbService from '../services/image'
import { IpcChannel } from '@shared/ipc-channel'
import { Image, UpdateImage } from '@shared/models/image'
import ExampleLowdbService from '../services/example'
import { getImageAsArrayBuffer, getImageDir, UrlKind, whichUrl } from '../utils'
import { join } from 'path'
import fileType from 'file-type'
import fs from 'fs/promises'
import { isNil } from 'lodash'
import log from 'electron-log'

export async function initImageHandlers(_mainWindow: BrowserWindow): Promise<void> {
    const imageService = ImageLowdbService.getInstance()
    ipcMain.handle(IpcChannel.CreateImages, (_event, paths: string[]) => {
        return createImages(paths)
    })
    ipcMain.handle(IpcChannel.GetAllImages, () => {
        return imageService.getAll()
    })
    ipcMain.handle(IpcChannel.UpdateImages, (_event, images: UpdateImage[]) => {
        return imageService.update(images)
    })
    ipcMain.handle(IpcChannel.DeleteImages, (_event, ids: string[]) => {
        return deleteImages(ids)
    })
    ipcMain.handle(IpcChannel.SaveImage, (_event, id: string) => {
        return saveImage(id)
    })
}

async function processSingleImage(path: string): Promise<string | null> {
    let imageFileName = ''
    let fileCreated = false
    switch (whichUrl(path)) {
        case UrlKind.Http:
            try {
                const data = await getImageAsArrayBuffer(path)
                const t = await fileType.fileTypeFromBuffer(data)
                if (t && t.mime.startsWith('image/')) {
                    imageFileName = `${crypto.randomUUID()}.${t.ext}`
                    await fs.writeFile(join(getImageDir(), imageFileName), Buffer.from(data))
                    fileCreated = true
                    return imageFileName
                }
            } catch (error) {
                log.error('Failed to add image (%s) from URL:', path, error)
                if (fileCreated) {
                    await fs.unlink(join(getImageDir(), imageFileName))
                }
            }
            break
        case UrlKind.File:
            try {
                const fileStat = await fs.stat(path)
                if (fileStat.isFile()) {
                    const t = await fileType.fileTypeFromFile(path)
                    if (!isNil(t) && t.mime.startsWith('image/')) {
                        imageFileName = `${crypto.randomUUID()}.${t.ext}`
                        await fs.copyFile(path, join(getImageDir(), imageFileName))
                        fileCreated = true
                        return imageFileName
                    }
                }
            } catch (error) {
                log.error('Failed to add image (%s) from file: %s', path, error)
                if (fileCreated) {
                    await fs.unlink(join(getImageDir(), imageFileName))
                }
            }
            break
        case UrlKind.Unknown:
            log.warn('Unknown URL kind for path: %s', path)
            break
    }
    return null
}

async function createImages(paths: string[]): Promise<Image[]> {
    await fs.mkdir(getImageDir(), { recursive: true })

    const MAX_CONCURRENCY = 3
    const results: string[] = []
    let index = 0

    async function processNext(): Promise<void> {
        while (index < paths.length) {
            const currentIndex = index++
            const path = paths[currentIndex]
            const fileName = await processSingleImage(path)
            if (fileName) {
                results.push(fileName)
            }
        }
    }

    const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, paths.length) }, () => processNext())
    await Promise.all(workers)

    const imageService = ImageLowdbService.getInstance()
    return imageService.create(results.map((fileName) => ({ fileName })))
}

/**
 * @description 删除指定 ID 的图片，并从所有示例中移除该图片的引用，并删除图片文件
 */
async function deleteImages(ids: string[]): Promise<boolean> {
    const imageService = ImageLowdbService.getInstance()
    const exampleService = ExampleLowdbService.getInstance()
    const examples = await exampleService.getAll()
    const newExamples = examples.map((example) => ({
        ...example,
        imageIds: example.imageIds.filter((id) => !ids.includes(id)),
    }))
    await exampleService.update(newExamples)
    const images = await imageService.getAll()
    const fileNames = images
        .filter((image) => ids.includes(image.id))
        .map((image) => image.fileName)
    fileNames.forEach(async (fileName) => {
        await fs.unlink(join(getImageDir(), fileName))
    })
    return imageService.delete(ids)
}

async function saveImage(id: string): Promise<boolean> {
    const imageService = ImageLowdbService.getInstance()
    const images = await imageService.getAll()
    try {
        const window = BrowserWindow.getFocusedWindow()
        if (!window) {
            log.error('No focused window found for dialog')
            return false
        }
        const image = images.find((img) => img.id === id)
        if (isNil(image)) {
            log.error(`Image with ID ${id} not found`)
            return false
        }
        const result = await dialog.showSaveDialog(window, {
            title: '保存图片',
            defaultPath: image.fileName,
            filters: [
                {
                    name: 'Images',
                    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
                },
                { name: 'All Files', extensions: ['*'] },
            ],
        })
        if (result.canceled) {
            log.info('Image save dialog was canceled')
            return false
        }
        if (result.filePath) {
            const imagePath = join(getImageDir(), image.fileName)
            await fs.copyFile(imagePath, result.filePath)
            log.info(`Image saved to ${result.filePath}`)
            return true
        }
        return false
    } catch (error) {
        log.error('Failed to copy image to clipboard:', error)
        return false
    }
}
