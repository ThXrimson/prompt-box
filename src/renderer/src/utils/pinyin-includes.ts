import { pinyin } from 'pinyin-pro'

export function pinyinIncludes(input: string, target: string): boolean {
    const normalizedTarget = target.trim().toLowerCase()
    if (normalizedTarget === '') {
        return true
    }

    const inputPinyin = pinyin(input, {
        toneType: 'none',
        type: 'array',
    })
        .join('')
        .toLowerCase()
    return inputPinyin.includes(normalizedTarget)
}

export function pinyinIncludesWithFirstLetter(input: string, target: string): boolean {
    const normalizedTarget = target.trim().toLowerCase()
    if (normalizedTarget === '') {
        return true
    }

    const inputPinyin = pinyin(input, {
        toneType: 'none',
        type: 'array',
    })
        .map((p) => {
            // 只取拼音的首字母
            return p.charAt(0)
        })
        .join('')
        .toLowerCase()
    return inputPinyin.includes(normalizedTarget)
}
