import { BrowserWindow, clipboard, dialog, ipcMain, net } from 'electron'
import fs from 'fs/promises'
import fileType from 'file-type'
import { getImageAsArrayBuffer, getImageDir } from './utils'
import { join } from 'path'
import * as ipcChannels from '@shared/ipc-channels'
import log from 'electron-log/main'
import Storage from './storage'
import type { Image } from '@shared/types'

export function registerIpc(): void {
  ipcMain.handle(ipcChannels.getAllPrompts, () =>
    Storage.getInstance().getAllPrompts()
  )
  ipcMain.handle(ipcChannels.getAllTags, () =>
    Storage.getInstance().getAllTags()
  )
  /**
   * @ignore
   */
  ipcMain.handle(ipcChannels.addImage, (_event, path: string) => addImage(path))
  /**
   * @ignore
   */
  ipcMain.handle(ipcChannels.deleteImage, (_event, imageID: string) => {
    try {
      Storage.getInstance().deleteImage(imageID)
    } catch (error) {
      log.error('Failed to delete image:', error)
      return false
    }
    return true
  })
  ipcMain.handle(ipcChannels.getPromptByID, (_event, promptID: string) => {
    return Storage.getInstance().getPromptByID(promptID)
  })
  ipcMain.handle(ipcChannels.openImageDialog, async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) {
      throw new Error('No focused window found for dialog')
    }
    const result = await dialog.showOpenDialog(window, {
      title: '选择图片文件',
      properties: ['openFile'], // 只能打开文件
      filters: [
        {
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    // 如果用户取消了选择，result.canceled 为 true
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0] // 返回第一个选中的文件路径
    }
    return null // 用户取消或没有选择文件
  })
  ipcMain.handle(ipcChannels.getAllExamples, () =>
    Storage.getInstance().getAllExamples()
  )
  ipcMain.handle(ipcChannels.getAllImages, () =>
    Storage.getInstance().getAllImages()
  )
  ipcMain.handle(ipcChannels.writeStorage, () => Storage.getInstance().write())
  ipcMain.handle(
    ipcChannels.addImageToExample,
    async (_event, exampleID: string, path: string) =>
      addImageToExample(exampleID, path)
  )
  ipcMain.handle(
    ipcChannels.deleteImageFromExample,
    (_event, exampleID: string, imageID: string) =>
      deleteImageFromExample(exampleID, imageID)
  )
  ipcMain.handle(
    ipcChannels.addExample,
    (
      _event,
      example: {
        id?: string
        positivePrompt?: string
        negativePrompt?: string
        extra?: string
        imageIDs?: string[]
      }
    ) => {
      try {
        return Storage.getInstance().addExample(example)
      } catch (error) {
        log.error('Failed to add example:', error)
        return null
      }
    }
  )
  ipcMain.handle(ipcChannels.deleteExample, async (_event, exampleID: string) =>
    deleteExample(exampleID)
  )
  ipcMain.handle(
    ipcChannels.updateExample,
    (
      _event,
      example: {
        id: string
        positivePrompt?: string
        negativePrompt?: string
        extra?: string
        imageIDs?: string[]
      }
    ) => {
      try {
        return Storage.getInstance().updateExample(example)
      } catch (error) {
        log.error('Failed to update example:', error)
        return null
      }
    }
  )
  ipcMain.handle(
    ipcChannels.addPrompt,
    (
      _event,
      prompt: {
        id?: string
        text: string
        translation?: string
        description?: string
        tagIDs?: string[]
        exampleIDs?: string[]
      }
    ) => {
      try {
        return Storage.getInstance().addPrompt(prompt)
      } catch (error) {
        log.error('Failed to add prompt:', error)
        return null
      }
    }
  )
  ipcMain.handle(
    ipcChannels.updatePrompt,
    (
      _event,
      prompt: {
        id: string
        text?: string
        translation?: string
        description?: string
        tagIDs?: string[]
        exampleIDs?: string[]
      }
    ) => {
      try {
        Storage.getInstance().updatePrompt(prompt)
        return true
      } catch (error) {
        log.error('Failed to update prompt:', error)
        return false
      }
    }
  )
  ipcMain.handle(
    ipcChannels.addTag,
    (_event, tag: { id?: string; text: string }) => {
      try {
        return Storage.getInstance().addTag(tag)
      } catch (error) {
        log.error('Failed to add tag:', error)
        return null
      }
    }
  )
  ipcMain.handle(ipcChannels.deletePrompt, (_event, promptID: string) => {
    try {
      Storage.getInstance().deletePrompt(promptID)
      return true
    } catch (error) {
      log.error('Failed to delete prompt:', error)
      return false
    }
  })
  ipcMain.handle(
    ipcChannels.addExampleToPrompt,
    (
      _event,
      promptID: string,
      example: {
        id?: string
        positivePrompt?: string
        negativePrompt?: string
        extra?: string
        imageIDs?: string[]
      }
    ) => {
      try {
        return Storage.getInstance().addExampleToPrompt(promptID, example)
      } catch (error) {
        log.error('Failed to add example to prompt:', error)
        return null
      }
    }
  )
  ipcMain.handle(
    ipcChannels.deleteExampleFromPrompt,
    async (_event, promptID: string, exampleID: string) => {
      try {
        const example = Storage.getInstance().getExampleByID(exampleID)
        if (!example) {
          log.error(`Example with ID ${exampleID} not found`)
          return false
        }
        for (const imageID of example.imageIDs) {
          const imageFileName =
            Storage.getInstance().getImageByID(imageID)?.fileName
          if (imageFileName) {
            await fs.unlink(join(getImageDir(), imageFileName))
          }
        }
        Storage.getInstance().deleteExampleFromPrompt(promptID, exampleID)
        return true
      } catch (error) {
        log.error('Failed to delete example from prompt:', error)
        return false
      }
    }
  )
  ipcMain.handle(ipcChannels.deleteTag, (_event, tagID: string) => {
    try {
      Storage.getInstance().deleteTag(tagID)
      return true
    } catch (error) {
      log.error('Failed to delete tag:', error)
      return false
    }
  })
  ipcMain.handle(
    ipcChannels.updateTag,
    (_event, tag: { id: string; text: string }) => {
      try {
        return Storage.getInstance().updateTag(tag)
      } catch (error) {
        log.error('Failed to update tag:', error)
        return null
      }
    }
  )
  ipcMain.handle(ipcChannels.getAllWorkspaces, () =>
    Storage.getInstance().getAllWorkspaces()
  )
  ipcMain.handle(
    ipcChannels.updateWorkspace,
    (
      _event,
      workspace: {
        id: string
        name?: string
        positiveEditor?: string
        negativeEditor?: string
        tagIDs?: string[]
      }
    ) => {
      try {
        return Storage.getInstance().updateWorkspace(workspace)
      } catch (error) {
        log.error('Failed to update workspace:', error)
        return null
      }
    }
  )
  ipcMain.handle(ipcChannels.copyToClipboard, (_event, text: string) => {
    try {
      clipboard.writeText(text)
      return true
    } catch (error) {
      log.error('Failed to copy to clipboard:', error)
      return false
    }
  })
  ipcMain.handle(ipcChannels.saveImageTo, async (_event, imageID: string) => {
    try {
      const window = BrowserWindow.getFocusedWindow()
      if (!window) {
        log.error('No focused window found for dialog')
        return false
      }
      const image = Storage.getInstance().getImageByID(imageID)
      if (!image) {
        log.error(`Image with ID ${imageID} not found`)
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
  })
  ipcMain.handle(
    ipcChannels.addExampleIDToPrompt,
    (_event, promptID: string, exampleID: string) => {
      try {
        return Storage.getInstance().addExampleIDToPrompt(promptID, exampleID)
      } catch (error) {
        log.error('Failed to add example ID to prompt:', error)
        return null
      }
    }
  )
  ipcMain.handle(
    ipcChannels.deleteExampleIDFromPrompt,
    (_event, promptID: string, exampleID: string) => {
      try {
        Storage.getInstance().deleteExampleIDFromPrompt(promptID, exampleID)
        return true
      } catch (error) {
        log.error('Failed to delete example ID from prompt:', error)
        return false
      }
    }
  )
  ipcMain.handle(ipcChannels.deleteWorkspace, (_event, workspaceID: string) => {
    try {
      Storage.getInstance().deleteWorkspace(workspaceID)
      return true
    } catch (error) {
      log.error('Failed to delete workspace:', error)
      return false
    }
  })
  ipcMain.handle(
    ipcChannels.addWorkspace,
    (
      _event,
      workspace: {
        id?: string
        name: string
        positiveEditor?: string
        negativeEditor?: string
        tagIDs?: string[]
      }
    ) => {
      try {
        return Storage.getInstance().addWorkspace(workspace)
      } catch (error) {
        log.error('Failed to add workspace:', error)
        return null
      }
    }
  )
  ipcMain.handle(
    ipcChannels.translateByDeepLX,
    async (_event, text: string) => {
      try {
        const result = await translateByDeepLX(text)
        return result
      } catch (error) {
        log.error('Failed to translate by deeplx:', error)
        return null
      }
    }
  )
}

async function addImage(path: string): Promise<Image | null> {
  let imageFileName = ''
  let fileCreated = false
  // 确保目录存在
  await fs.mkdir(getImageDir(), { recursive: true })
  try {
    const fileStat = await fs.stat(path)
    if (fileStat.isFile()) {
      const t = await fileType.fileTypeFromFile(path)
      if (t && t.mime.startsWith('image/')) {
        imageFileName = `${crypto.randomUUID()}.${t.ext}`
        await fs.copyFile(path, join(getImageDir(), imageFileName))
        fileCreated = true
        return Storage.getInstance().addImage(imageFileName)
      }
    }
  } catch (error) {
    if (!(error as Error).message.startsWith('ENOENT:')) {
      log.error('Failed to add image (%s) from file: %s', path, error)
      if (fileCreated) {
        // Clean up the file if it was created but not valid
        await fs.unlink(join(getImageDir(), imageFileName))
      }
      return null
    }
  }
  try {
    const imageUrl = new URL(path)
    const data = await getImageAsArrayBuffer(imageUrl.toString())
    if (!data) {
      log.error('Failed to fetch image from URL:', path)
      return null
    }
    const t = await fileType.fileTypeFromBuffer(data)
    if (t && t.mime.startsWith('image/')) {
      imageFileName = `${crypto.randomUUID()}.${t.ext}`
      await fs.writeFile(join(getImageDir(), imageFileName), Buffer.from(data))
      fileCreated = true
      return Storage.getInstance().addImage(imageFileName)
    }
  } catch (error) {
    log.error('Failed to add image (%s) from URL:', path, error)
    if (fileCreated) {
      // Clean up the file if it was created but not valid
      await fs.unlink(join(getImageDir(), imageFileName))
    }
  }
  return null
}

/**
 * @description 添加图片到示例，先添加图片到存储，再将图片添加到示例中
 */
async function addImageToExample(
  exampleID: string,
  path: string
): Promise<Image | null> {
  let image: Image | null = null
  try {
    image = await addImage(path)
    if (!image) {
      log.error('Failed to add image to example: Invalid image')
      return null
    }
    return Storage.getInstance().addImageToExample(exampleID, image.id)
  } catch (error) {
    if (image) {
      // Clean up the image if it was created but not valid
      await fs.unlink(join(getImageDir(), image.fileName))
      Storage.getInstance().deleteImage(image.id)
    }
    log.error('Failed to add example image:', error)
    return null
  }
}

/**
 * @description 删除指定 ID 的图片，并从所有示例中移除该图片的引用，并删除图片文件
 */
async function deleteImageFromExample(
  exampleID: string,
  imageID: string
): Promise<boolean> {
  try {
    const fileName = Storage.getInstance().getImageByID(imageID)?.fileName
    if (!fileName) {
      log.error(`Image with ID ${imageID} not found`)
      return false
    }
    fs.unlink(join(getImageDir(), fileName))
    Storage.getInstance().deleteImageFromExample(exampleID, imageID)
    Storage.getInstance().deleteImage(imageID)
  } catch (error) {
    log.error(
      'Failed to delete image %s from example %s: %s',
      imageID,
      imageID,
      error
    )
    return false
  }
  return true
}

/**
 * @description 删除指定 ID 的示例，并从所有提示中移除该示例的引用，并删除示例引用的图片
 */
async function deleteExample(exampleID: string): Promise<boolean> {
  try {
    const example = Storage.getInstance().getExampleByID(exampleID)
    if (!example) {
      log.error(`Example with ID ${exampleID} not found`)
      return false
    }
    for (const imageID of example.imageIDs) {
      const imageFileName =
        Storage.getInstance().getImageByID(imageID)?.fileName
      if (imageFileName) {
        await fs.unlink(join(getImageDir(), imageFileName))
      }
    }
    Storage.getInstance().deleteExample(exampleID)
    return true
  } catch (error) {
    log.error('Failed to delete example:', error)
    return false
  }
}

function translateByDeepLX(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'POST',
      url: 'https://deepl.deno.dev/translate',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    request.write(
      JSON.stringify({
        text,
        target_lang: 'zh',
        source_lang: 'auto',
      }),
      'UTF-8'
    )
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        return reject(
          new Error(
            `Translation failed with status code: ${response.statusCode}`
          )
        )
      }
      let data = ''
      response.on('data', (chunk) => {
        data += chunk.toString()
      })
      response.on('end', () => {
        try {
          const result = JSON.parse(data)
          resolve(result.data)
        } catch (error) {
          reject(new Error(`Failed to parse translation response: ${error}`))
        }
      })
    })
    request.on('error', (error) => {
      reject(new Error(`Translation request failed: ${error.message}`))
    })
    request.end()
  })
}
