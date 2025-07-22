import { app, net } from 'electron'
import { join, dirname } from 'path'

/**
 * 获取程序数据目录
 * 在开发环境中使用程序目录，在生产环境中使用程序安装目录的上级目录
 */
export function getAppDir(): string {
  const isDev = !app.isPackaged
  return isDev
    ? app.getAppPath()
    : (process.env.PORTABLE_EXECUTABLE_DIR ?? dirname(app.getPath('exe')))
}

export function getImageDir(): string {
  return join(getAppDir(), 'data', 'images')
}

/**
 * 使用 Electron 的 net 模块获取网络图片并返回 ArrayBuffer
 * @param {string} url 图片的 URL
 * @returns {Promise<ArrayBuffer>} 包含图片数据的 ArrayBuffer
 */
export function getImageAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const request = net.request(url)
    const chunks = [] as Buffer[]
    let totalLength = 0

    request.on('response', (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return reject(new Error(`请求失败，状态码: ${response.statusCode}`))
      }

      response.on('data', (chunk) => {
        // 每个 chunk 都是一个 Buffer
        chunks.push(chunk)
        totalLength += chunk.length
      })

      response.on('end', () => {
        // 将所有 Buffer 合并成一个大的 Buffer
        const fullBuffer = Buffer.concat(chunks, totalLength)
        // 将 Buffer 转换为 ArrayBuffer
        const arrayBuffer = fullBuffer.buffer.slice(
          fullBuffer.byteOffset,
          fullBuffer.byteOffset + fullBuffer.byteLength
        )
        resolve(arrayBuffer)
      })

      response.on('error', (error) => {
        reject(new Error(`响应错误: ${error.message}`))
      })
    })

    request.on('error', (error) => {
      reject(new Error(`请求错误: ${error.message}`))
    })

    request.end()
  })
}
