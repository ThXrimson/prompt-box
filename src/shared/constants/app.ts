// 应用常量配置

// 定时器配置（毫秒）
export const AUTO_SAVE_INTERVAL = 2 * 60 * 1000 // 2分钟自动保存

// 分页配置
export const DEFAULT_PAGE_SIZE = 10

// 窗口配置
export const WINDOW_CONFIG = {
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
} as const

// 日志配置
export const LOG_CONFIG = {
    template: '[{h}:{i}:{s}.{ms}] [{processType}] [{level}] {text}',
} as const

// 文件配置
export const FILE_CONFIG = {
    imageProtocol: 'image',
    imageProtocolPrefix: 'image://',
} as const

// 数据库文件名
export const DB_FILENAMES = {
    prompt: 'prompt.json',
    tag: 'tag.json',
    example: 'example.json',
    workspace: 'workspace.json',
    image: 'image.json',
} as const
