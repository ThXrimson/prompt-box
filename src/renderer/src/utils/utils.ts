export function getImageUrl(path: string): string {
    return `image://${path}`
}

export type LeftBracket = '(' | '['
export type RightBracket = ')' | ']'

export const brackets: Record<LeftBracket, RightBracket> = {
    '(': ')',
    '[': ']',
}

// 剥离字符串的括号，返回括号和内容
export function stripBrackets(text: string): {
    content: string
    leftBrackets: LeftBracket[]
} {
    const leftBrackets: LeftBracket[] = []

    // 从左到右遍历字符串
    for (let i = 0; i < text.length; i++) {
        const char = text[i] as LeftBracket
        if (char in brackets && text[text.length - 1 - i] === brackets[char]) {
            leftBrackets.push(char)
            continue
        }
        break
    }

    const content = text.slice(leftBrackets.length, text.length - leftBrackets.length)

    return { content, leftBrackets }
}

// 添加括号到字符串的开头和结尾
export function joinBrackets(text: string, leftBrackets: LeftBracket[]): string {
    const rightBrackets = leftBrackets.map((b) => brackets[b])
    return leftBrackets.join('') + text + rightBrackets.reverse().join('')
}

export function stripWeight(text: string): { content: string; weight: string } {
    let newText = text
    const angled = textIsAngled(text)
    if (angled) {
        newText = text.slice(1, -1).trim()
    }
    const match = newText.match(/(?<=:)[+-]?(\d+(\.\d*)?)$/)
    if (match) {
        const weight = match[0]
        let content = newText.slice(0, -weight.length - 1).trim()
        if (angled) {
            content = `<${content}>`
        }
        return { content, weight }
    }
    return { content: text, weight: '' }
}

export function joinWeight(text: string, weight: string): string {
    if (weight) {
        if (!/^[+-]?(\d+(\.\d*)?)$/.test(weight)) {
            throw new Error('Weight must be a valid number')
        }
        if (textIsAngled(text)) {
            text = text.slice(1, -1).trim()
            return `<${text.trim()}:${weight}>`
        }
        return `${text.trim()}:${weight}`
    }
    return text.trim()
}

function textIsAngled(text: string): boolean {
    return text.length > 0 && text[0] === '<' && text[text.length - 1] === '>'
}

export function weightAdd(weight: string, delta: number): string {
    if (weight === '') {
        return (1 + delta).toFixed(1).replace(/\.?0+$/, '')
    }
    if (!/^[+-]?(\d+(\.\d*)?)$/.test(weight)) {
        throw new Error('Invalid weight format')
    }
    const num = parseFloat(weight)
    if (isNaN(num)) {
        throw new Error('Invalid weight format')
    }
    return (num + delta).toFixed(1).replace(/\.?0+$/, '')
}

/**
 * 创建一个防抖函数，该函数会延迟调用提供的函数，
 * 直到自上次调用以来经过了指定的时间。
 *
 * @template T 被防抖的函数类型。
 * @param func 要防抖的函数。
 * @param delay 延迟时间（毫秒）。
 * @returns 返回一个新的防抖函数，该函数接受与原函数相同的参数并返回 void。
 */
export function debounced<T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
        // 每次调用时都清除之前的定时器
        if (timeoutId !== null) {
            clearTimeout(timeoutId)
        }
        // 设置新的定时器
        timeoutId = setTimeout(() => {
            // 使用 `apply` 确保 `this` 上下文和参数正确传递
            func.apply(this, args)
            timeoutId = null // 执行后将定时器ID重置
        }, delay)
    }
}

export function isLoraPrompt(text: string): boolean {
    return /^<lora:.+>$/.test(text)
}

export function removeLoraPrompts(text: string): string {
    return text.replace(/<lora:[^>]+>/g, '').trim()
}

export function extractLoraPrompts(text: string): string[] {
    const matches = text.match(/<lora:[^>]+>/g)
    return matches ? matches : []
}
