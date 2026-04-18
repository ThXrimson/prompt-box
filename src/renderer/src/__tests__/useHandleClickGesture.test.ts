import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useHandleClickGesture } from '../hooks/useHandleClickGesture'

describe('useHandleClickGesture', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('should trigger single click after delay', () => {
        const handleClick = useHandleClickGesture(100)
        const singleClickFn = vi.fn()
        const doubleClickFn = vi.fn()

        handleClick(singleClickFn, doubleClickFn)

        expect(singleClickFn).not.toHaveBeenCalled()
        expect(doubleClickFn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(100)

        expect(singleClickFn).toHaveBeenCalledTimes(1)
        expect(doubleClickFn).not.toHaveBeenCalled()
    })

    it('should trigger double click immediately on second click', () => {
        const handleClick = useHandleClickGesture(100)
        const singleClickFn = vi.fn()
        const doubleClickFn = vi.fn()

        handleClick(singleClickFn, doubleClickFn)
        handleClick(singleClickFn, doubleClickFn)

        expect(doubleClickFn).toHaveBeenCalledTimes(1)
        expect(singleClickFn).not.toHaveBeenCalled()
    })

    it('should not trigger single click when double click occurs', () => {
        const handleClick = useHandleClickGesture(100)
        const singleClickFn = vi.fn()
        const doubleClickFn = vi.fn()

        handleClick(singleClickFn, doubleClickFn)
        vi.advanceTimersByTime(50)
        handleClick(singleClickFn, doubleClickFn)

        expect(doubleClickFn).toHaveBeenCalledTimes(1)
        expect(singleClickFn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(100)
        expect(singleClickFn).not.toHaveBeenCalled()
    })

    it('should handle rapid triple clicks as double + single', () => {
        const handleClick = useHandleClickGesture(100)
        const singleClickFn = vi.fn()
        const doubleClickFn = vi.fn()

        handleClick(singleClickFn, doubleClickFn)
        handleClick(singleClickFn, doubleClickFn)
        handleClick(singleClickFn, doubleClickFn)

        expect(doubleClickFn).toHaveBeenCalledTimes(1)

        vi.advanceTimersByTime(100)
        expect(singleClickFn).toHaveBeenCalledTimes(1)
    })

    it('should use default delay of 100ms', () => {
        const handleClick = useHandleClickGesture()
        const singleClickFn = vi.fn()
        const doubleClickFn = vi.fn()

        handleClick(singleClickFn, doubleClickFn)

        vi.advanceTimersByTime(99)
        expect(singleClickFn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(1)
        expect(singleClickFn).toHaveBeenCalledTimes(1)
    })
})
