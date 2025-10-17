/**
 * 匹配类似方括号或圆括号包围的字符串，并处理其中的数字。
 * 如果存在最后一个冒号后的数字，则在其基础上加上delta。
 * 如果没有冒号或数字，则添加 `:1.1` (假设delta为0.1，初始值为1)。
 *
 * @param input 原始字符串，例如 "([(asdfsadf:1.1)])" 或 "(high quality)"
 * @param delta 每次增加的步长，默认为 0.1
 * @returns 处理后的字符串
 */
export function addWeight(input: string, delta: number = 0.1): string {
  // 正则表达式解释：
  // ^                     - 字符串开始
  // ([\(\[])             - 捕获组1：匹配开头的 '(' 或 '['
  // (.*?)                 - 捕获组2：非贪婪匹配，匹配括号内的任意内容，直到下一个模式
  // (?:                   - 非捕获组：为了可选地匹配冒号和数字
  //     :                  - 匹配冒号
  //     (\d+(?:\.\d+)?)    - 捕获组3：匹配一个数字，可以是整数或小数（如 1 或 1.1）。
  //                         - 注意：这里我们只关心最后一个冒号后的数字，但由于我们使用`replace`配合回调，
  //                           我们可以处理整个字符串，并在回调中判断。
  //                           实际上，一个更直接的方式是先判断是否存在冒号进行分类。
  // )?                    - 非捕获组可选，表示可能没有冒号和数字
  // ([\)\]])             - 捕获组4：匹配结尾的 ')' 或 ']'
  // $                     - 字符串结束

  // 考虑到复杂性，我们最好分两步：
  // 1. 匹配整个括号对的内容。
  // 2. 在匹配到的内容中寻找最后一个冒号和数字。

  // 正则表达式匹配括号对，以及内部内容
  // eslint-disable-next-line no-useless-escape
  const outerRegex = /^([\(\[]+)(.*?)([\)\]]+)$/
  const match = input.match(outerRegex)

  if (!match) {
    // 如果输入字符串不符合括号对的格式，则原样返回
    return input
  }

  const openingBracket = match[1] // 例如 '(' 或 '['
  let innerContent = match[2] // 例如 "asdfsadf:1.1" 或 "high quality"
  const closingBracket = match[3] // 例如 ')' 或 ']'

  // 现在处理 innerContent
  // 寻找最后一个冒号和数字
  const numberRegex = /:(\d+(\.\d+)?)$/ // 匹配最后一个冒号后的数字，且该数字在字符串末尾
  const numberMatch = innerContent.match(numberRegex)

  if (numberMatch) {
    // 找到了最后一个冒号和数字
    const originalNumberStr = numberMatch[1]
    const originalNumber = parseFloat(originalNumberStr)

    // 计算新数字
    const newNumber = originalNumber + delta

    // 使用replace替换匹配到的部分
    innerContent = innerContent.replace(
      numberRegex,
      `:${newNumber.toFixed(2).replace(/\.?0+$/, '')}`
    ) // 确保保留两位小数
  } else {
    // 没有找到冒号和数字，或者数字不在末尾，或者不是最后一个冒号后的数字
    // 此时，我们需要在末尾添加 :1.1 (based on 1 + delta)
    const initialValue = 1.0 // 假设没有冒号时，初始值为1
    const newNumber = initialValue + delta
    innerContent = `${innerContent}:${newNumber.toFixed(1).replace(/\.?0+$/, '')}` // 确保保留一位小数
  }

  return `${openingBracket}${innerContent}${closingBracket}`
}

export function clearWeight(input: string): string {
  // 清除所有括号内的权重信息
  return input.replace(/:\d+(\.\d+)?/g, '').replace(/:\s*$/, '')
}

export function modifyLoraWeight(input: string, delta: number = 0.1): string {
  // 匹配类似 "<lora:name:1.1>" 或 "<lora:name>" 的字符串
  const loraRegex = /<lora:([^:>]+)(?<weight>:(-?\d+(\.\d+)?))?>/g
  const weightRegex = /:(-?\d+(\.\d+)?)>/g
  let output = input
  for (const res of input.matchAll(loraRegex)) {
    // 判断是否有 weight 捕获组
    if (res.groups && res.groups.weight) {
      const offset = res[0].search(weightRegex)
      if (offset !== -1) {
        const originalWeightStr = res[0].substring(
          offset + 1,
          res[0].length - 1
        ) // 提取数字字符串
        const originalWeight = parseFloat(originalWeightStr)
        const newWeight = originalWeight + delta
        const resultWeight = newWeight.toFixed(2).replace(/\.?0+$/, '') // 保留两位小数，去除多余的0
        // 替换原字符串中的权重部分
        output = output.replace(
          res[0],
          res[0].replace(`:${originalWeightStr}>`, `:${resultWeight}>`)
        )
      }
      continue
    }
    // 如果没有 weight 捕获组，说明没有权重，添加默认权重 1 + delta
    const resultWeight = (1 + delta).toFixed(1).replace(/\.?0+$/, '') // 保留一位小数，去除多余的0
    output = output.replace(
      res[0],
      `${res[0].substring(0, res[0].length - 1)}:${resultWeight}>`
    )
  }
  return output
}

export function clearLoraWeight(input: string): string {
  // 匹配类似 "<lora:name:1.1>" 或 "<lora:name>" 的字符串
  const loraRegex = /<lora:([^:>]+)(?<weight>:(-?\d+(\.\d+)?))?>/g
  const weightRegex = /:(-?\d+(\.\d+)?)>/g
  let output = input
  for (const res of input.matchAll(loraRegex)) {
    // 判断是否有 weight 捕获组
    if (res.groups && res.groups.weight) {
      const offset = res[0].search(weightRegex)
      if (offset !== -1) {
        // 替换原字符串中的权重部分
        output = output.replace(res[0], res[0].replace(weightRegex, '>'))
      }
    }
  }
  return output
}
