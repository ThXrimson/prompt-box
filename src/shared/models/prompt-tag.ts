import { isNil } from 'lodash'

const enum Bracket {
    Square = 'square',
    Round = 'round',
}
const openBrackets = {
    [Bracket.Square]: '[',
    [Bracket.Round]: '(',
} as const
const closeBrackets = {
    [Bracket.Square]: ']',
    [Bracket.Round]: ')',
} as const
const openBracketToEnum = {
    '[': Bracket.Square,
    '(': Bracket.Round,
} as const
function splitStringIgnoringBrackets(inputString: string): string[] {
    const result = []
    let currentSegment = ''

    // 跟踪圆括号和方括号的计数
    let roundBracketCount = 0 // ()
    let squareBracketCount = 0 // []
    for (let i = 0; i < inputString.length; i++) {
        const char = inputString[i]
        // 1. 更新括号计数
        if (char === '(') {
            roundBracketCount++
        } else if (char === ')') {
            roundBracketCount--
        } else if (char === '[') {
            squareBracketCount++
        } else if (char === ']') {
            squareBracketCount--
        }
        if (char === ',') {
            if (roundBracketCount === 0 && squareBracketCount === 0) {
                // 找到一个顶层逗号，执行分割
                result.push(currentSegment.trim())
                currentSegment = '' // 重置当前段
                continue // 跳过当前的逗号
            }
        }
        currentSegment += char
    }
    if (currentSegment.length > 0) {
        result.push(currentSegment.trim())
    }
    if (roundBracketCount !== 0 || squareBracketCount !== 0) {
        throw new Error('brackets not balanced')
    }
    return result
}
const enum PromptTagKind {
    Mono = 'mono',
    Group = 'group',
    Lora = 'lora',
    Special = 'special',
}
export type PromptTag = MonoPromptTag | GroupPromptTag | LoraPromptTag | SpecialPromptTag
export interface MonoPromptTag {
    id: string
    text: string
    weight: string
    brackets: Bracket[]
    disabled: boolean
    kind: PromptTagKind.Mono
}
export interface SpecialPromptTag {
    id: string
    text: string
    disabled: boolean
    kind: PromptTagKind.Special
}
export function newEolSpecialPromptTag(): SpecialPromptTag {
    return {
        id: 'eol' + crypto.randomUUID(),
        text: '',
        disabled: false,
        kind: PromptTagKind.Special,
    }
}
export const EOL_STRING = '\n'
export const isEolSpecialPromptTag = (tag: SpecialPromptTag): boolean => tag.id.startsWith('eol')
export interface GroupPromptTag {
    id: string
    subTags: (LoraPromptTag | MonoPromptTag)[]
    weight: string
    brackets: Bracket[]
    disabled: boolean
    kind: PromptTagKind.Group
}
export interface LoraPromptTag {
    id: string
    text: string
    brackets: Bracket[]
    weight: string
    disabled: boolean
    kind: PromptTagKind.Lora
}

export function isMonoPromptTag(tag: PromptTag): tag is MonoPromptTag {
    return tag.kind === PromptTagKind.Mono
}
export function isGroupPromptTag(tag: PromptTag): tag is GroupPromptTag {
    return tag.kind === PromptTagKind.Group
}
export function isLoraPromptTag(tag: PromptTag): tag is LoraPromptTag {
    return tag.kind === PromptTagKind.Lora
}
export function isLoraString(s: string): boolean {
    return s.startsWith('<lora:') && s.endsWith('>')
}
export function isSpecialPromptTag(tag: PromptTag): tag is SpecialPromptTag {
    return tag.kind === PromptTagKind.Special
}

function isValidNumber(s: string): boolean {
    return /^-?\d+(\.\d+)?$/.test(s)
}
export function promptTagToString(tag: PromptTag): string {
    if (isMonoPromptTag(tag)) {
        const prefix = tag.brackets.map((bracket) => openBrackets[bracket]).join('')
        const suffix = tag.brackets.map((bracket) => closeBrackets[bracket]).join('')
        const weightStr = isValidNumber(tag.weight) && prefix.length > 0 ? `:${tag.weight}` : ''
        return `${prefix}${tag.text}${weightStr}${suffix}`
    } else if (isGroupPromptTag(tag)) {
        const prefix = tag.brackets.map((bracket) => openBrackets[bracket]).join('')
        const suffix = tag.brackets.map((bracket) => closeBrackets[bracket]).join('')
        const text = tag.subTags.map(promptTagToString).join(', ')
        const weightStr = isValidNumber(tag.weight) && prefix.length > 0 ? `:${tag.weight}` : ''
        return `${prefix}${text}${weightStr}${suffix}`
    } else if (isLoraPromptTag(tag)) {
        const prefix = tag.brackets.map((bracket) => openBrackets[bracket]).join('')
        const suffix = tag.brackets.map((bracket) => closeBrackets[bracket]).join('')
        const weightStr = isValidNumber(tag.weight) ? `:${tag.weight}` : ''
        return `${prefix}<${tag.text}${weightStr}>${suffix}`
    } else {
        throw new Error('Unknown prompt tag kind')
    }
}
export function editorToString(editor: PromptTag[]): string {
    const segments = [] as string[]
    for (const tag of editor) {
        if (isSpecialPromptTag(tag)) {
            if (segments.length > 0 && segments[segments.length - 1] === ', ') {
                segments.pop()
                segments.push(' ')
            }
            segments.push(tag.text)
            segments.push('\n')
        } else {
            segments.push(promptTagToString(tag))
            segments.push(', ')
        }
    }
    return segments.join('')
}
export function stringToEditor(str: string, specialWords: string[] = []): PromptTag[] {
    str = str.trim()
    specialWords.push(EOL_STRING)
    const specialPattern = new RegExp(
        specialWords.map((word) => `\\s*\\b${word}\\b\\s*`).join('|'),
        'g'
    )
    const segments = [] as string[]
    let lastIndex = 0
    for (const match of str.matchAll(specialPattern)) {
        const prefix = str.slice(lastIndex, match.index).trim()
        if (prefix.length > 0) {
            segments.push(prefix)
        }
        if (match[0].trim().length > 0) {
            segments.push(match[0].trim())
        } else {
            segments.push(EOL_STRING)
        }
        lastIndex = match.index + match[0].length
    }
    const suffix = str.slice(lastIndex).trim()
    if (suffix.length > 0) {
        segments.push(suffix)
    }
    const tags = [] as PromptTag[]
    for (const segment of segments) {
        if (segment === EOL_STRING) {
            tags.push(newEolSpecialPromptTag())
        } else if (specialWords.includes(segment)) {
            tags.push({
                id: crypto.randomUUID(),
                text: segment,
                disabled: false,
                kind: PromptTagKind.Special,
            })
        } else {
            for (const subSegment of splitStringIgnoringBrackets(segment)) {
                const brackets = [] as Bracket[]
                let left = 0
                let right = subSegment.length - 1
                while (left <= right) {
                    const bracket =
                        openBracketToEnum[subSegment[left] as keyof typeof openBracketToEnum]
                    if (isNil(bracket)) {
                        break
                    }
                    if (subSegment[right] !== closeBrackets[bracket]) {
                        break
                    }
                    brackets.push(bracket)
                    left++
                    right--
                }
                let rest = subSegment.slice(left, right + 1)
                const totalColonIndex = rest.lastIndexOf(':')
                let totalWeightStr = ''
                if (totalColonIndex >= 0 && isValidNumber(rest.slice(totalColonIndex + 1))) {
                    totalWeightStr = rest.slice(totalColonIndex + 1)
                    rest = rest.slice(0, totalColonIndex)
                }
                const subTags = [] as (LoraPromptTag | MonoPromptTag)[]
                for (let sub of rest.split(',')) {
                    sub = sub.trim()
                    if (isLoraString(sub)) {
                        sub = sub.slice('<lora:'.length, sub.length - 1)
                        let text = sub
                        const colonIndex = sub.lastIndexOf(':')
                        let weightStr = ''
                        if (colonIndex >= 0 && isValidNumber(sub.slice(colonIndex + 1))) {
                            weightStr = sub.slice(colonIndex + 1)
                            text = sub.slice(0, colonIndex)
                        }
                        if (text.length > 0) {
                            subTags.push({
                                id: crypto.randomUUID(),
                                text,
                                weight: weightStr,
                                disabled: false,
                                kind: PromptTagKind.Lora,
                                brackets: [],
                            })
                        }
                        continue
                    }
                    let text = sub
                    const colonIndex = sub.lastIndexOf(':')
                    let weightStr = ''
                    if (colonIndex >= 0 && isValidNumber(sub.slice(colonIndex + 1))) {
                        weightStr = sub.slice(colonIndex + 1)
                        text = sub.slice(0, colonIndex)
                    }
                    if (text.length > 0) {
                        subTags.push({
                            id: crypto.randomUUID(),
                            text,
                            weight: weightStr,
                            disabled: false,
                            kind: PromptTagKind.Mono,
                            brackets: [],
                        })
                    }
                }
                if (subTags.length <= 0) {
                    continue
                } else if (subTags.length === 1) {
                    subTags[0].brackets = brackets
                    tags.push(subTags[0])
                } else {
                    tags.push({
                        id: crypto.randomUUID(),
                        subTags,
                        weight: totalWeightStr,
                        disabled: false,
                        kind: PromptTagKind.Group,
                        brackets: brackets,
                    })
                    subTags.forEach((tag) => {
                        if (!isLoraPromptTag(tag)) {
                            tag.weight = ''
                        }
                    })
                }
            }
        }
    }
    return tags
}
