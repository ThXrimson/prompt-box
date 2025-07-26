import { describe, it, expect } from '@jest/globals'
import { addWeight, clearWeight } from './editWeight'

describe('addWeight', () => {
  it('should add 0.1 to existing number after colon', () => {
    const result = addWeight('([(asdfsadf:1.1)])')
    expect(result).toBe('([(asdfsadf:1.2)])')
  })

  it('should add :1.1 when no number exists', () => {
    const result = addWeight('(high quality)')
    expect(result).toBe('(high quality:1.1)')
  })

  it('should work with square brackets and add to existing number', () => {
    const result = addWeight('[(test:2.5)]')
    expect(result).toBe('[(test:2.6)]')
  })

  it('should only process the last number after colon', () => {
    const result = addWeight('(multiple:1.0:2.0)')
    expect(result).toBe('(multiple:1.0:2.1)')
  })

  it('should return original string if not matching bracket pair format', () => {
    const result = addWeight('{not a match}')
    expect(result).toBe('{not a match}')
  })

  it('should add :1.1 when colon exists but no valid number after it', () => {
    const result = addWeight('(no num here:)')
    expect(result).toBe('(no num here::1.1)')
  })

  it('should handle empty content in brackets', () => {
    const result = addWeight('([])')
    expect(result).toBe('([:1.1])')
  })

  it('should handle whitespace content in brackets', () => {
    const result = addWeight('(  )')
    expect(result).toBe('(  :1.1)')
  })

  it('should add new number when existing content after colon is not a valid number', () => {
    const result = addWeight('[(test:abc)]')
    expect(result).toBe('[(test:abc:1.1)]')
  })

  it('should work with custom delta value', () => {
    const result = addWeight('(custom delta)', 0.5)
    expect(result).toBe('(custom delta:1.5)')
  })

  it('should add custom delta to existing number', () => {
    const result = addWeight('(value:2.0)', 0.3)
    expect(result).toBe('(value:2.3)')
  })

  it('should handle negative delta', () => {
    const result = addWeight('(value:2.0)', -0.1)
    expect(result).toBe('(value:1.9)')
  })

  it('should handle integer numbers', () => {
    const result = addWeight('(test:1)')
    expect(result).toBe('(test:1.1)')
  })

  it('should handle mixed brackets correctly', () => {
    const result = addWeight('[(mixed)]')
    expect(result).toBe('[(mixed:1.1)]')
  })
})

describe('clearWeight', () => {
  it('should remove all weights from the string', () => {
    const result = clearWeight('[(test:1.1)]')
    expect(result).toBe('[(test)]')
  })

  it('should handle empty strings', () => {
    const result = clearWeight('')
    expect(result).toBe('')
  })

  it('should handle strings without weights', () => {
    const result = clearWeight('(no weights here)')
    expect(result).toBe('(no weights here)')
  })

  it('should remove weights without brackets', () => {
    const result = clearWeight('another:2.2')
    expect(result).toBe('another')
  })
})
