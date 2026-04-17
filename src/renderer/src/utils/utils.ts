import { FILE_CONFIG } from '@shared/constants/app'

export function getImageUrl(path: string): string {
    return `${FILE_CONFIG.imageProtocolPrefix}${path}`
}

export function isValidUrl(s: string): boolean {
    try {
        new URL(s)
        return true
    } catch {
        return false
    }
}
