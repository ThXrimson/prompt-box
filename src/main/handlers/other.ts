import { IpcChannel } from '@shared/ipc-channel'
import log from 'electron-log/main'
import { clipboard } from 'electron/common'
import { BrowserWindow, dialog, ipcMain, net } from 'electron/main'
import { Nullish } from 'utility-types'

export function initOtherHandlers(_mainWindow: BrowserWindow): void {
    ipcMain.handle(IpcChannel.OpenImageDialog, async () => {
        return openImageDialog()
    })
    ipcMain.handle(IpcChannel.CopyToClipboard, async (_event, text: string) => {
        return copyToClipboard(text)
    })
    ipcMain.handle(IpcChannel.TranslateByDeepLX, async (_event, text: string) => {
        return translateByDeepLX(text)
    })
}
async function openImageDialog(): Promise<string | Nullish> {
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
}

function copyToClipboard(text: string): boolean {
    try {
        clipboard.writeText(text)
        return true
    } catch (error) {
        log.error('Failed to copy to clipboard:', error)
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
                    new Error(`Translation failed with status code: ${response.statusCode}`)
                )
            }
            let data = ''
            response.on('data', (chunk) => {
                data += chunk.toString()
            })
            response.on('end', () => {
                try {
                    const result = JSON.parse(data)
                    if (typeof result.data !== 'string') {
                        reject(new Error('Invalid translation response format'))
                    }
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
