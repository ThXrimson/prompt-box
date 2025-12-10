import { clone } from 'lodash'

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

export function cloneModify<T>(obj: T, modifier: (a: T) => void): T {
    const newObj = clone(obj)
    modifier(newObj)
    return newObj
}
