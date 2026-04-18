import { ElMessage } from 'element-plus'

export function handleError(error: unknown, context?: string): void {
    let message = '操作失败'
    if (error instanceof Error) {
        message = error.message
    } else if (typeof error === 'string') {
        message = error
    }
    if (context) {
        message = `${context}：${message}`
    }
    ElMessage.error(message)
}
