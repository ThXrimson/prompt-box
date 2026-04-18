import { cloneDeep, isNil } from 'lodash'
import { DeepReadonly, Nullish } from 'utility-types'
import { Decimal } from 'decimal.js'

export const DEFAULT_WEIGHT = '1'
export function weightIsDefault(weight: string): boolean {
    try {
        const w = new Decimal(weight)
        return w.equals(DEFAULT_WEIGHT)
    } catch {
        return false
    }
}
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
export type WeightedPromptTag = PromptTag & { weight: string }
export type BracketedPromptTag = PromptTag & { brackets: Bracket[] }
export type SubTagPromptTag = MonoPromptTag | LoraPromptTag
export interface MonoPromptTag {
    id: string
    text: string
    translation: string
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
export function newEolPromptTag(): EolPromptTag {
    return {
        id: crypto.randomUUID(),
        disabled: false,
        kind: PromptTagKind.Eol,
    }
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

export function isMonoPromptTag(tag: DeepReadonly<PromptTag>): tag is MonoPromptTag {
    return tag.kind === PromptTagKind.Mono
}
export function isGroupPromptTag(tag: DeepReadonly<PromptTag>): tag is GroupPromptTag {
    return tag.kind === PromptTagKind.Group
}
export function isLoraPromptTag(tag: DeepReadonly<PromptTag>): tag is LoraPromptTag {
    return tag.kind === PromptTagKind.Lora
}
export function isLoraString(s: string): boolean {
    s = s.trim()
    return s.startsWith('<lora:') && s.endsWith('>')
}
export function isSpecialPromptTag(tag: DeepReadonly<PromptTag>): tag is SpecialPromptTag {
    return tag.kind === PromptTagKind.Special
}
export function isEolPromptTag(tag: DeepReadonly<PromptTag>): tag is EolPromptTag {
    return tag.kind === PromptTagKind.Eol
}

function isValidNumber(s: string): boolean {
    try {
        new Decimal(s)
        return true
    } catch {
        return false
    }
}
export function promptTagToString(
    tag: PromptTag,
    includeWeight: boolean = true,
    hideWeightIfDefault: boolean = true,
    includeBrackets: boolean = true,
    ignoreDisabled: boolean = false,
    useTranslation: boolean = false
): string {
    if (ignoreDisabled && tag.disabled) {
        return ''
    }
    const modifyWeight = (weight: string): string => {
        if (
            !isValidNumber(weight) ||
            (hideWeightIfDefault && weightIsDefault(weight)) ||
            !includeWeight
        ) {
            return ''
        }
        return weight
    }
    if (isMonoPromptTag(tag)) {
        let prefix = tag.brackets.map((bracket) => openBrackets[bracket]).join('')
        let suffix = tag.brackets.map((bracket) => closeBrackets[bracket]).join('')
        const weight = modifyWeight(tag.weight)
        const weightStr = prefix.length > 0 && isValidNumber(weight) ? `:${weight}` : ''
        if (!includeBrackets) {
            prefix = ''
            suffix = ''
        }
        const text = useTranslation && tag.translation.length > 0 ? tag.translation : tag.text
        return `${prefix}${text}${weightStr}${suffix}`
    } else if (isGroupPromptTag(tag)) {
        const text = tag.subTags
            .map((sub) =>
                promptTagToString(
                    sub,
                    includeWeight,
                    hideWeightIfDefault,
                    includeBrackets,
                    ignoreDisabled
                )
            )
            .filter((s) => s.length > 0)
            .join(', ')
        return text
    } else if (isLoraPromptTag(tag)) {
        const weight = modifyWeight(tag.weight)
        const weightStr = weight.length > 0 ? `:${weight}` : ''
        return `<lora:${tag.text}${weightStr}>`
    } else if (isEolPromptTag(tag)) {
        return '\n'
    } else if (isSpecialPromptTag(tag)) {
        return tag.text
    } else {
        throw new Error('Unknown prompt tag kind')
    }
}
export function editorToString(
    editor: PromptTag[],
    removeDisabled: boolean = true,
    removeLora: boolean = false,
    includeGroupPattern: boolean = true
): string {
    const segments = [] as string[]
    for (const tag of editor) {
        if (tag.disabled && removeDisabled) {
            continue
        }
        if (removeLora && isLoraPromptTag(tag)) {
            continue
        }
        if (isGroupPromptTag(tag)) {
            const subTexts = tag.subTags
                .filter((sub) => !(sub.disabled && removeDisabled))
                .map((sub) => {
                    const s = promptTagToString(sub, true, true, true, removeDisabled)
                    if (sub.disabled && !removeDisabled && s.length > 0) {
                        return `${DISABLE_MARKER}${s}${DISABLE_MARKER}`
                    }
                    return s
                })
                .filter((s) => s.length > 0)
            if (subTexts.length > 0) {
                if (includeGroupPattern) {
                    let groupText = `【${tag.text}】${subTexts.join(', ')}【/】`
                    if (tag.disabled && !removeDisabled) {
                        groupText = `${DISABLE_MARKER}${groupText}${DISABLE_MARKER}`
                    }
                    segments.push(groupText)
                } else {
                    segments.push(subTexts.join(', '))
                }
                segments.push(', ')
            }
        } else if (isSpecialPromptTag(tag)) {
            if (segments.length > 0 && segments[segments.length - 1] === ', ') {
                segments.pop()
                segments.push(' ')
            }
            const text = tag.disabled && !removeDisabled ? `${DISABLE_MARKER}${tag.text}${DISABLE_MARKER}` : tag.text
            segments.push(text)
            segments.push('\n')
        } else if (isEolPromptTag(tag)) {
            segments.push('\n')
        } else {
            const s = promptTagToString(tag, true, true, true, removeDisabled)
            if (s.length > 0) {
                if (tag.disabled && !removeDisabled) {
                    segments.push(`${DISABLE_MARKER}${s}${DISABLE_MARKER}`)
                } else {
                    segments.push(s)
                }
                segments.push(', ')
            }
        }
    }
    if (segments.length > 0 && segments[segments.length - 1] === ', ') {
        segments.pop()
    }
    return segments.join('')
}
export function stringToMonoPromptTag(str: string): MonoPromptTag {
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
        translation: '',
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
    let text = loraName
    if (colonIndex >= 0 && isValidNumber(loraName.slice(colonIndex + 1))) {
        weightStr = loraName.slice(colonIndex + 1)
        text = loraName.slice(0, colonIndex)
    }
    return {
        id: crypto.randomUUID(),
        text,
        weight: weightStr,
        disabled: false,
        kind: PromptTagKind.Lora,
    }
}
export function stringToSpecialPromptTag(str: string): SpecialPromptTag {
    return {
        id: crypto.randomUUID(),
        text: str,
        disabled: false,
        kind: PromptTagKind.Special,
    }
}
const GROUP_OPEN_RE = /【(.+?)】/
const GROUP_CLOSE = '【/】'
const DISABLE_MARKER = '~~'

function stripDisablePattern(s: string): { text: string; disabled: boolean } {
    const trimmed = s.trim()
    if (
        trimmed.startsWith(DISABLE_MARKER) &&
        trimmed.endsWith(DISABLE_MARKER) &&
        trimmed.length > DISABLE_MARKER.length * 2
    ) {
        return { text: trimmed.slice(DISABLE_MARKER.length, -DISABLE_MARKER.length), disabled: true }
    }
    return { text: trimmed, disabled: false }
}

interface TextSegment {
    type: 'text' | 'group'
    text: string
    groupName?: string
    disabled?: boolean
}

function splitGroupSpans(str: string): TextSegment[] {
    const result = [] as TextSegment[]
    let remaining = str
    while (remaining.length > 0) {
        const openMatch = remaining.match(GROUP_OPEN_RE)
        if (!openMatch || openMatch.index === undefined) {
            const text = remaining.replace(/^[, ]+/, '').replace(/[, ]+$/, '')
            if (text.length > 0) {
                result.push({ type: 'text', text })
            }
            break
        }
        if (openMatch.index > 0) {
            const before = remaining.slice(0, openMatch.index).replace(/[, ]+$/, '')
            if (before.length > 0) {
                result.push({ type: 'text', text: before })
            }
        }
        const groupName = openMatch[1]
        const afterOpen = remaining.slice(openMatch.index + openMatch[0].length)
        const closeIndex = afterOpen.indexOf(GROUP_CLOSE)
        if (closeIndex === -1) {
            const text = remaining.replace(/^[, ]+/, '').replace(/[, ]+$/, '')
            if (text.length > 0) {
                result.push({ type: 'text', text })
            }
            break
        }
        const content = afterOpen.slice(0, closeIndex).trim()
        let afterClose = afterOpen.slice(closeIndex + GROUP_CLOSE.length)
        let isDisabled = false
        const lastResult = result[result.length - 1]
        if (
            lastResult &&
            lastResult.type === 'text' &&
            lastResult.text.endsWith(DISABLE_MARKER) &&
            afterClose.startsWith(DISABLE_MARKER)
        ) {
            isDisabled = true
            lastResult.text = lastResult.text.slice(0, -DISABLE_MARKER.length).replace(/[, ]+$/, '')
            if (lastResult.text.length === 0) {
                result.pop()
            }
            afterClose = afterClose.slice(DISABLE_MARKER.length)
        }
        result.push({ type: 'group', text: content, groupName, disabled: isDisabled })
        remaining = afterClose.replace(/^[, ]+/, '')
    }
    return result
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
        if (segment.length <= 0) {
            continue
        }
        if (specialWords.includes(segment)) {
            tags.push({
                id: crypto.randomUUID(),
                text: segment,
                disabled: false,
                kind: PromptTagKind.Special,
            })
            continue
        }
        const { text: strippedSegment, disabled: isSegmentDisabled } = stripDisablePattern(segment)
        if (isSegmentDisabled && specialWords.includes(strippedSegment)) {
            tags.push({
                id: crypto.randomUUID(),
                text: strippedSegment,
                disabled: true,
                kind: PromptTagKind.Special,
            })
            continue
        }
        const textSegments = splitGroupSpans(segment)
        for (const seg of textSegments) {
            if (seg.type === 'group' && seg.groupName && seg.groupName.length > 0) {
                const subTags = parseContentToSubTags(seg.text)
                if (seg.disabled) {
                    for (const sub of subTags) {
                        sub.disabled = true
                    }
                }
                tags.push({
                    id: crypto.randomUUID(),
                    text: seg.groupName,
                    subTags,
                    disabled: seg.disabled ?? false,
                    kind: PromptTagKind.Group,
                })
            } else {
                const parsedTags = parseContentToTags(seg.text)
                tags.push(...parsedTags)
            }
        }
    }
    return tags
}

function parseContentToSubTags(content: string): (LoraPromptTag | MonoPromptTag)[] {
    const subTags = [] as (LoraPromptTag | MonoPromptTag)[]
    for (const s of splitStringIgnoringBrackets(content.trim())) {
        const { text, disabled } = stripDisablePattern(s)
        if (isLoraString(text)) {
            const tag = stringToLoraPromptTag(text)
            if (!isNil(tag)) {
                if (disabled) tag.disabled = true
                subTags.push(tag)
            }
        } else {
            const tag = stringToMonoPromptTag(text)
            if (!isNil(tag)) {
                if (disabled) tag.disabled = true
                subTags.push(tag)
            }
        }
    }
    return subTags
}

function parseContentToTags(content: string): PromptTag[] {
    const tags = [] as PromptTag[]
    const splitEol = content.split(new RegExp(`(${EOL})`, 'g'))
    for (let subSegment of splitEol) {
        if (subSegment === EOL) {
            tags.push({
                id: crypto.randomUUID(),
                disabled: false,
                kind: PromptTagKind.Eol,
            })
            continue
        }
        subSegment = subSegment.trim()
        for (const s of splitStringIgnoringBrackets(subSegment)) {
            const { text, disabled } = stripDisablePattern(s)
            if (isLoraString(text)) {
                const tag = stringToLoraPromptTag(text)
                if (!isNil(tag)) {
                    if (disabled) tag.disabled = true
                    tags.push(tag)
                }
                continue
            }
            const tag = stringToMonoPromptTag(text)
            if (!isNil(tag)) {
                if (disabled) tag.disabled = true
                tags.push(tag)
            }
        }
    }
    return tags
}

export function addWeightString(weight: string, delta: number = 0.1): string {
    let num = new Decimal(1)
    try {
        num = new Decimal(weight)
    } catch {
        // ignore
    }
    return num
        .plus(delta)
        .toFixed(2)
        .replace(/\.?0+$/, '')
}

export function addWeight(promptTag: PromptTag, delta: number = 0.1): PromptTag {
    if (isSpecialPromptTag(promptTag) || isEolPromptTag(promptTag)) {
        return promptTag
    }
    if (isMonoPromptTag(promptTag) || isLoraPromptTag(promptTag)) {
        const newWeight = addWeightString(promptTag.weight, delta)
        const newTag = { ...promptTag, weight: newWeight }
        if (isMonoPromptTag(promptTag) && promptTag.brackets.length === 0) {
            ;(newTag as MonoPromptTag).brackets = [Bracket.Round]
        }
        return newTag
    }
    if (isGroupPromptTag(promptTag)) {
        const newSubTags = cloneDeep(promptTag.subTags)
        for (const [index, sub] of newSubTags.entries()) {
            const newSub = addWeight(sub, delta)
            if (!isMonoPromptTag(newSub) && !isLoraPromptTag(newSub)) {
                continue
            }
            newSubTags[index] = newSub
        }
        return {
            ...promptTag,
            subTags: newSubTags,
        }
    }
    return promptTag
}

export function clearWeight(promptTag: PromptTag): PromptTag {
    if (isSpecialPromptTag(promptTag) || isEolPromptTag(promptTag)) return promptTag
    if (isMonoPromptTag(promptTag)) {
        return {
            ...promptTag,
            weight: '',
            brackets: [],
        }
    }
    if (isLoraPromptTag(promptTag)) {
        return { ...promptTag, weight: '' }
    }
    if (isGroupPromptTag(promptTag)) {
        const newTag = {
            ...promptTag,
            weight: '',
        }
        ;(newTag as GroupPromptTag).subTags = promptTag.subTags.map(
            (sub) => clearWeight(sub) as SubTagPromptTag
        )
        return newTag
    }
    return promptTag
}

export function addBrackets(promptTag: PromptTag, ...brackets: Bracket[]): PromptTag {
    if (isGroupPromptTag(promptTag)) {
        return {
            ...promptTag,
            subTags: promptTag.subTags.map((sub) =>
                addBrackets(sub, ...brackets)
            ) as SubTagPromptTag[],
        }
    }
    if (!isMonoPromptTag(promptTag)) {
        return promptTag
    }
    return { ...promptTag, brackets: [...brackets, ...promptTag.brackets] }
}

export function clearBrackets(promptTag: PromptTag): PromptTag {
    if (isMonoPromptTag(promptTag)) {
        return { ...promptTag, brackets: [], weight: '' }
    } else if (isGroupPromptTag(promptTag)) {
        return {
            ...promptTag,
            subTags: promptTag.subTags.map(clearBrackets) as SubTagPromptTag[],
        }
    }
    return promptTag
}
