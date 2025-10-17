import { describe, it, expect } from '@jest/globals'
import {
  stripBrackets,
  joinBrackets,
  stripWeight,
  joinWeight,
  weightAdd,
  removeLoraPrompts,
} from './utils'

describe('stripBrackets', () => {
  it('should strip brackets and return content and left brackets', () => {
    const result = stripBrackets('([<test>])')
    expect(result.content).toBe('test')
    expect(result.leftBrackets).toEqual(['(', '[', '<'])
  })

  it('should handle empty string', () => {
    const result = stripBrackets('')
    expect(result.content).toBe('')
    expect(result.leftBrackets).toEqual([])
  })

  it('should handle no brackets', () => {
    const result = stripBrackets('test')
    expect(result.content).toBe('test')
    expect(result.leftBrackets).toEqual([])
  })

  it('should handle only left brackets', () => {
    const result = stripBrackets('([<')
    expect(result.content).toBe('([<')
    expect(result.leftBrackets).toEqual([])
  })
})

describe('addBrackets', () => {
  it('should add brackets to the text', () => {
    const result = joinBrackets('test', ['(', '['])
    expect(result).toBe('([<test>])')
  })

  it('should handle empty text', () => {
    const result = joinBrackets('', ['(', '['])
    expect(result).toBe('([<>])')
  })

  it('should handle no left brackets', () => {
    const result = joinBrackets('test', [])
    expect(result).toBe('test')
  })

  it('should handle single left bracket', () => {
    const result = joinBrackets('test', ['['])
    expect(result).toBe('[test]')
  })
})

describe('getWeight', () => {
  it('should extract weight from text', () => {
    const result = stripWeight('test:1.5')
    expect(result).toStrictEqual({ content: 'test', weight: '1.5' })
  })

  it('should return empty string if no weight found', () => {
    const result = stripWeight('test')
    expect(result).toStrictEqual({ content: 'test', weight: '' })
  })

  it('should handle multiple colons and return last weight', () => {
    const result = stripWeight('test:1.0:2.0')
    expect(result).toStrictEqual({ content: 'test:1.0', weight: '2.0' })
  })

  it('should handle invalid weight format', () => {
    const result = stripWeight('test:abc')
    expect(result).toStrictEqual({ content: 'test:abc', weight: '' })
  })

  it('should handle empty string', () => {
    const result = stripWeight('')
    expect(result).toStrictEqual({ content: '', weight: '' })
  })
})

describe('joinWeight', () => {
  it('should add weight to text', () => {
    const result = joinWeight('test', '1.5')
    expect(result).toBe('test:1.5')
  })

  it('should throw error if weight is empty', () => {
    expect(joinWeight('test', '')).toBe('test')
  })

  it('should throw error if weight is invalid', () => {
    expect(() => joinWeight('test', 'abc')).toThrow(
      'Weight must be a valid number'
    )
  })

  it('should handle negative weight', () => {
    const result = joinWeight('test', '-1.5')
    expect(result).toBe('test:-1.5')
  })

  it('should handle zero weight', () => {
    const result = joinWeight('test', '1')
    expect(result).toBe('test')
  })
})

describe('weightAdd', () => {
  it('should add two weights correctly', () => {
    const result = weightAdd('1.5', 2.5)
    expect(result).toBe('4')
  })

  it('should handle negative weights', () => {
    const result = weightAdd('-1.5', 2.5)
    expect(result).toBe('1')
  })

  it('should handle zero weight', () => {
    const result = weightAdd('0', 2.5)
    expect(result).toBe('2.5')
  })

  it('should return first weight if second is empty', () => {
    const result = weightAdd('1.5', 0)
    expect(result).toBe('1.5')
  })

  it('should return delta as string if weight is empty', () => {
    const result = weightAdd('', 2.5)
    expect(result).toBe('3.5')
  })
})

describe('removeLoraPrompts', () => {
  it('should remove all lora prompts from the string', () => {
    const result = removeLoraPrompts(
      '<lora:name:1.1> some text <lora:another_name:0.5>'
    )
    expect(result).toBe('some text')
  })
  it('should handle strings without lora prompts', () => {
    const result = removeLoraPrompts('no lora prompts here')
    expect(result).toBe('no lora prompts here')
  })

  it('should handle empty strings', () => {
    const result = removeLoraPrompts('')
    expect(result).toBe('')
  })
})
