import { app, shell, BrowserWindow, protocol, Menu } from 'electron'
import { join, normalize } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import icon from '../../resources/icon.png?asset'
import log from 'electron-log/main'
import dayjs from 'dayjs'
import Storage from './storage'
import { getImageDir, getAppDir } from './utils'
import { registerIpc } from './registerIpc'

Menu.setApplicationMenu(null)

function init(): void {
  {
    // initialize log config
    log.initialize()
    const logTemplate = '[{h}:{i}:{s}.{ms}] [{processType}] [{level}] {text}'
    log.transports.console.format = logTemplate
    log.transports.file.format = logTemplate
    log.transports.file.resolvePathFn = () => {
      return join(getAppDir(), 'logs', `${dayjs().format('YYYY-MM-DD')}.log`)
    }
  }
  {
    Storage.getInstance() // Ensure storage is initialized
  }
}

function cleanup(): void {
  {
    Storage.getInstance().write()
  }
}

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: 'Prompt Box',
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, bypassCSP: true },
  },
])

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  init()

  protocol.handle('image', (request) => {
    const filePath = join(
      getImageDir(),
      request.url.substring('image://'.length, request.url.length)
    )
    // 确保请求路径没有 '../' 等来访问任意路径
    const safePath = normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '')
    if (fs.existsSync(safePath)) {
      return new Response(fs.readFileSync(safePath)) // 直接返回文件内容
    } else {
      return new Response('Not Found', { status: 404 })
    }
  })

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpc()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

app.on('before-quit', () => {
  cleanup()
})
