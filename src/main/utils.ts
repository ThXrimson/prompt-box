import { app } from 'electron'
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
