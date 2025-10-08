/**
 * 按逗号分割字符串，但括号包裹的作为一个整体
 * @param input
 * @return {string[]}
 */
export function splitByCommaPlus(input: string): string[] {
  const result: string[] = []
  const pushResult = (part: string): void => {
    const trimmed = part.trim()
    if (trimmed.length > 0) {
      result.push(trimmed)
    }
  }
  let currentSegment = ''
  let parenthesesCount = 0
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (char === '(') {
      parenthesesCount++
    } else if (char === ')') {
      parenthesesCount--
      // 可以在这里添加错误处理，例如当 parenthesesCount < 0 时表示括号不匹配
      // if (parenthesesCount < 0) {
      //     throw new Error('Unmatched closing parenthesis');
      // }
    }
    if (char === ',' && parenthesesCount === 0) {
      // 遇到逗号且不在括号内部时，将当前片段添加到结果中，并重置当前片段
      pushResult(currentSegment)
      currentSegment = ''
    } else {
      // 否则，将字符添加到当前片段
      currentSegment += char
    }
  }
  // 将最后一个片段添加到结果中
  pushResult(currentSegment)
  return result
}
