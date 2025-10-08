import { describe, it, expect } from '@jest/globals'
import { splitByCommaPlus } from './prompts-strings'

describe('splitByCommaPlus', () => {
  // Test Case 1: 基本情况，不含括号
  it('should split a simple comma-separated string', () => {
    const input = 'foo,bar,baz'
    const expected = ['foo', 'bar', 'baz']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 2: 包含单层括号，内部有逗号
  it('should keep content inside parentheses with commas as one part', () => {
    const input = 'foo,(bar,baz),qux'
    const expected = ['foo', '(bar,baz)', 'qux']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 3: 字符串以括号开始
  it('should handle string starting with a parenthesized part', () => {
    const input = '(alpha,beta),gamma'
    const expected = ['(alpha,beta)', 'gamma']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 4: 字符串以括号结束
  it('should handle string ending with a parenthesized part', () => {
    const input = 'delta, (epsilon,zeta)'
    const expected = ['delta', '(epsilon,zeta)']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 5: 多个括号部分
  it('should handle multiple parenthesized parts', () => {
    const input = '(a,b),c,(d,e),f'
    const expected = ['(a,b)', 'c', '(d,e)', 'f']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 6: 仅包含一个括号部分
  it('should return a single parenthesized part if no outer commas', () => {
    const input = '(only,one,part)'
    const expected = ['(only,one,part)']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 7: 仅包含一个非括号部分
  it('should return a single non-parenthesized part if no outer commas', () => {
    const input = 'just_one_item'
    const expected = ['just_one_item']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 8: 空字符串
  it('should return an empty array for an empty string', () => {
    const input = ''
    const expected = []
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 9: 仅包含空格的字符串
  it('should return an empty array for a string with only spaces', () => {
    const input = '   '
    const expected = []
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 10: 逗号后有空格
  it('should correctly trim parts even with spaces after comma', () => {
    const input = 'one, two, (three,four) , five'
    const expected = ['one', 'two', '(three,four)', 'five']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 11: 括号内部有空格
  it('should retain internal spaces within parentheses', () => {
    const input = 'item, (with space inside), another'
    const expected = ['item', '(with space inside)', 'another']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 12: 复杂混合情况
  it('should handle complex mixed cases', () => {
    const input = 'A, (B, C 123), D-E, (F, G H)'
    const expected = ['A', '(B, C 123)', 'D-E', '(F, G H)']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 13: 值中包含逗号但不含括号
  it('should split normally if value contains comma but no parentheses', () => {
    const input = 'A,B,C,D'
    const expected = ['A', 'B', 'C', 'D']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 14: 连续逗号（这通常在split中会产生空字符串，但我们的正则设计不同）
  it('should handle consecutive commas (resulting in empty strings if not trimmed)', () => {
    // 我们的正则表达式设计倾向于匹配非空内容，所以连续逗号可能会被处理为跳过
    // 或者根据具体匹配逻辑，可能会有空字符串产出
    // 这里的期望是基于当前正则实现，如果存在空字符串，也要注意测试
    const input = 'a,,b'
    const expected = ['a', 'b'] // 我们的正则倾向于匹配非空字符，所以会跳过中间的空项
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // Test Case 15: 字符串以逗号结尾
  it('should handle strings ending with a comma', () => {
    const input = 'a,b,'
    const expected = ['a', 'b']
    // 原始正则 `(?:,\s*|$)` 会在最后一个逗号后匹配 `$` 产生一个空字符串。
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // ----- 针对正则对嵌套支持的局限性的测试 -----
  // 注意：这个正则表达式设计为只处理单层括号。
  // 对于 `(nested(a,b), c)` 它会将整个字符串 `(nested(a,b), c)` 视为一个部分
  // 这符合这个特定正则表达式的预期行为，如果需要深层解析，则需更复杂的逻辑。
  it('should treat nested parentheses as part of the outer parenthesis', () => {
    const input = 'start, (outer(inner,again), value), end'
    const expected = ['start', '(outer(inner,again), value)', 'end']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  // 更多边缘情况
  it('should handle string with only a comma', () => {
    const input = ','
    const expected = []
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  it('should handle string with only a parenthesized part and no outer commas', () => {
    const input = '(data)'
    const expected = ['(data)']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })

  it('should handle string with mixed spaces', () => {
    const input = ' item1 ,  ( item2,item3 ) ,item4 '
    const expected = ['item1', '( item2,item3 )', 'item4']
    expect(splitByCommaPlus(input)).toEqual(expected)
  })
})
