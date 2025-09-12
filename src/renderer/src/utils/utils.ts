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
  let content = text

  // 从左到右遍历字符串
  for (let i = 0; i < text.length; i++) {
    const char = text[i] as LeftBracket
    if (char in brackets && text[text.length - 1 - i] === brackets[char]) {
      leftBrackets.push(char)
      continue
    }
    break
  }

  content = text.slice(leftBrackets.length, text.length - leftBrackets.length)

  return { content, leftBrackets }
}

// 添加括号到字符串的开头和结尾
export function joinBrackets(
  text: string,
  leftBrackets: LeftBracket[]
): string {
  const rightBrackets = leftBrackets.map((b) => brackets[b])
  return leftBrackets.join('') + text + rightBrackets.reverse().join('')
}

export function stripWeight(text: string): { content: string; weight: string } {
  const match = text.match(/(?<=:)[+-]?(\d+(\.\d*)?)$/)
  if (match) {
    const weight = match[0]
    const content = text.slice(0, -weight.length - 1).trim()
    return { content, weight }
  }
  return { content: text, weight: '' }
}

export function joinWeight(text: string, weight: string): string {
  if (weight) {
    if (!/^[+-]?(\d+(\.\d*)?)$/.test(weight)) {
      throw new Error('Weight must be a valid number')
    }
    if (weight === '1') {
      return text.trim()
    }
    return `${text.trim()}:${weight}`
  }
  return text.trim()
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
