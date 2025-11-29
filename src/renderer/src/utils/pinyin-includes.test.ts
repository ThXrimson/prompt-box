import { pinyinIncludes, pinyinIncludesWithFirstLetter } from './pinyin-includes'
import { describe, it, expect } from '@jest/globals'

describe('pinyinFilter', () => {
    it('should return all candidates when input is empty', () => {
        const result = pinyinIncludes('北京', '')
        expect(result).toBe(true)
    })

    it('should filter candidates based on pinyin input', () => {
        const result = pinyinIncludes('北京', 'bei')
        expect(result).toBe(true)
    })

    it('should handle mixed case and whitespace in input', () => {
        const result = pinyinIncludes('北京', ' Bei ')
        expect(result).toBe(true)
    })

    it('should return an empty array if no candidates match the input', () => {
        const result = pinyinIncludes('北京', 'shen')
        expect(result).toBe(false)
    })
})

describe('pinyinIncludesWithFirstLetter', () => {
    it('should return all candidates when input is empty', () => {
        const result = pinyinIncludesWithFirstLetter('北京', '')
        expect(result).toBe(true)
    })

    it('should filter candidates based on first letter of pinyin input', () => {
        const result = pinyinIncludesWithFirstLetter('北京', 'bj')
        expect(result).toBe(true)
    })

    it('should handle mixed case and whitespace in input', () => {
        const result = pinyinIncludesWithFirstLetter('北京', ' BJ ')
        expect(result).toBe(true)
    })

    it('should return false if no candidates match the first letter input', () => {
        const result = pinyinIncludesWithFirstLetter('北京', 'sJ')
        expect(result).toBe(false)
    })
})
