export function getImageUrl(path: string): string {
    return `image://${path}`
}

export function isValidUrl(s: string): boolean {
    try {
        new URL(s)
        return true
    } catch {
        return false
    }
}
