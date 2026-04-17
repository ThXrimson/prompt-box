// 应用常量配置

export const AUTO_SAVE_INTERVAL = 2 * 60 * 1000

export const DEFAULT_PAGE_SIZE = 10

export const WINDOW_CONFIG = {
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
} as const

export const LOG_CONFIG = {
    template: '[{h}:{i}:{s}.{ms}] [{processType}] [{level}] {text}',
} as const

export const FILE_CONFIG = {
    imageProtocol: 'image',
    imageProtocolPrefix: 'image://',
} as const

export const DB_FILENAMES = {
    prompt: 'prompt.json',
    tag: 'tag.json',
    example: 'example.json',
    workspace: 'workspace.json',
    image: 'image.json',
} as const

export interface BuildInfo {
    version: string
    buildNumber: string
    buildTime: string
    gitCommit: string
    gitBranch: string
}

export const SHOW_BUILD_INFO = true
