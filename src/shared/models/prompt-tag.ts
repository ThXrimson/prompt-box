import { isNil } from 'lodash'
import { Nullish } from 'utility-types'

export const EOL = '\n'
export const enum Bracket {
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
    const result = [] as string[]
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
export const enum PromptTagKind {
    Mono = 'mono',
    Group = 'group',
    Lora = 'lora',
    Special = 'special',
    Eol = 'eol',
}
export type PromptTag =
    | MonoPromptTag
    | GroupPromptTag
    | LoraPromptTag
    | SpecialPromptTag
    | EolPromptTag
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
export interface EolPromptTag {
    id: string
    disabled: boolean
    kind: PromptTagKind.Eol
}
export interface GroupPromptTag {
    id: string
    text: string
    subTags: (LoraPromptTag | MonoPromptTag)[]
    disabled: boolean
    kind: PromptTagKind.Group
}
export interface LoraPromptTag {
    id: string
    text: string
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
    s = s.trim()
    return s.startsWith('<lora:') && s.endsWith('>')
}
export function isSpecialPromptTag(tag: PromptTag): tag is SpecialPromptTag {
    return tag.kind === PromptTagKind.Special
}
export function isEolPromptTag(tag: PromptTag): tag is EolPromptTag {
    return tag.kind === PromptTagKind.Eol
}

function isValidNumber(s: string): boolean {
    return /^-?\d+(\.\d+)?$/.test(s)
}
export function promptTagToString(
    tag: PromptTag,
    includeWeight: boolean = true,
    includeBrackets: boolean = true
): string {
    if (isMonoPromptTag(tag)) {
        let prefix = tag.brackets.map((bracket) => openBrackets[bracket]).join('')
        let suffix = tag.brackets.map((bracket) => closeBrackets[bracket]).join('')
        let weightStr = isValidNumber(tag.weight) && prefix.length > 0 ? `:${tag.weight}` : ''
        if (!includeWeight) {
            weightStr = ''
        }
        if (!includeBrackets) {
            prefix = ''
            suffix = ''
        }
        return `${prefix}${tag.text}${weightStr}${suffix}`
    } else if (isGroupPromptTag(tag)) {
        const text = tag.subTags
            .map((sub) => promptTagToString(sub, includeWeight, includeBrackets))
            .join(', ')
        return text
    } else if (isLoraPromptTag(tag)) {
        let weightStr = isValidNumber(tag.weight) ? `:${tag.weight}` : ''
        if (!includeWeight) {
            weightStr = ''
        }
        return `<${tag.text}${weightStr}>`
    } else if (isEolPromptTag(tag)) {
        return '\n'
    } else {
        throw new Error('Unknown prompt tag kind')
    }
}
export function editorToString(
    editor: PromptTag[],
    filterDisabled: boolean = true,
    filterLora: boolean = false
): string {
    const segments = [] as string[]
    for (const tag of editor) {
        if (tag.disabled && filterDisabled) {
            continue
        }
        if (filterLora && isLoraPromptTag(tag)) {
            continue
        }
        if (isSpecialPromptTag(tag)) {
            if (segments.length > 0 && segments[segments.length - 1] === ', ') {
                segments.pop()
                segments.push(' ')
            }
            segments.push(tag.text)
            segments.push('\n')
        } else if (isEolPromptTag(tag)) {
            segments.push('\n')
        } else {
            segments.push(promptTagToString(tag))
            segments.push(', ')
        }
    }
    return segments.join('')
}
export function stringToMonoPromptTag(str: string): MonoPromptTag | Nullish {
    str = str.trim()
    // 获取包裹的括号
    const brackets = [] as Bracket[]
    let left = 0
    let right = str.length - 1
    while (left <= right) {
        const bracket = openBracketToEnum[str[left] as keyof typeof openBracketToEnum]
        if (isNil(bracket)) {
            break
        }
        if (str[right] !== closeBrackets[bracket]) {
            break
        }
        brackets.push(bracket)
        left++
        right--
    }
    // 获取权重
    let rest = str.slice(left, right + 1)
    const totalColonIndex = rest.lastIndexOf(':')
    let totalWeightStr = ''
    if (totalColonIndex >= 0 && isValidNumber(rest.slice(totalColonIndex + 1))) {
        totalWeightStr = rest.slice(totalColonIndex + 1)
        rest = rest.slice(0, totalColonIndex)
    }
    return {
        id: crypto.randomUUID(),
        text: rest,
        weight: totalWeightStr,
        brackets,
        disabled: false,
        kind: PromptTagKind.Mono,
    }
}
export function stringToLoraPromptTag(str: string): LoraPromptTag | Nullish {
    str = str.trim()
    if (!isLoraString(str)) {
        return undefined
    }
    const loraName = str.slice('<lora:'.length, str.length - 1)
    const colonIndex = loraName.lastIndexOf(':')
    let weightStr = ''
    if (colonIndex >= 0 && isValidNumber(loraName.slice(colonIndex + 1))) {
        weightStr = loraName.slice(colonIndex + 1)
    }
    return {
        id: crypto.randomUUID(),
        text: loraName.slice(0, colonIndex),
        weight: weightStr,
        disabled: false,
        kind: PromptTagKind.Lora,
    }
}
export function stringToEditor(str: string, specialWords: string[] = []): PromptTag[] {
    str = str.trim()
    const segments = [] as string[]
    if (specialWords.length > 0) {
        const specialPattern = new RegExp(
            specialWords.map((word) => `\\s*\\b${word}\\b\\s*`).join('|'),
            'g'
        )
        let lastIndex = 0
        for (const match of str.matchAll(specialPattern)) {
            const prefix = str.slice(lastIndex, match.index).trim()
            if (prefix.length > 0) {
                segments.push(prefix)
            }
            if (match[0].trim().length > 0) {
                segments.push(match[0].trim())
            }
            lastIndex = match.index + match[0].length
        }
        const suffix = str.slice(lastIndex).trim()
        if (suffix.length > 0) {
            segments.push(suffix)
        }
    } else {
        segments.push(str)
    }
    const tags = [] as PromptTag[]
    for (const segment of segments) {
        if (specialWords.includes(segment)) {
            tags.push({
                id: crypto.randomUUID(),
                text: segment,
                disabled: false,
                kind: PromptTagKind.Special,
            })
            continue
        }
        const splitEol = segment.split(new RegExp(`(${EOL})`, 'g'))
        for (const subSegment of splitEol) {
            if (subSegment === EOL) {
                tags.push({
                    id: crypto.randomUUID(),
                    disabled: false,
                    kind: PromptTagKind.Eol,
                })
                continue
            }
            for (const s of splitStringIgnoringBrackets(subSegment)) {
                if (isLoraString(s)) {
                    const tag = stringToLoraPromptTag(s)
                    if (!isNil(tag)) {
                        tags.push(tag)
                    }
                    continue
                }
                const tag = stringToMonoPromptTag(s)
                if (!isNil(tag)) {
                    tags.push(tag)
                }
            }
        }
    }
    return tags
}
