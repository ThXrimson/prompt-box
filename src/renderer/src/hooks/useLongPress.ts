import { Nullish } from 'utility-types'
import { ref, onMounted, onUnmounted, readonly, Ref } from 'vue'

interface UseLongPressOptions {
    delay?: number // 长按的最小延迟时间 (毫秒)
    onShortPress?: (event: MouseEvent) => void
    onPressing?: (event: MouseEvent) => void // 长按进行中的回调
    onLongPressEnd?: (event: MouseEvent) => void // 长按结束 (不论是否成功) 的回调
}

interface ReturnT {
    isPressing: Readonly<Ref<boolean, boolean>>
    isLongPressed: Readonly<Ref<boolean, boolean>>
}

export function useLongPress(
    element: HTMLElement | Nullish,
    onPressStart: (event: MouseEvent) => void,
    options: UseLongPressOptions = {}
): ReturnT {
    const { delay = 500, onShortPress, onPressing, onLongPressEnd } = options

    const isPressing = ref(false) // 标记是否正在按压
    const isLongPressed = ref(false) // 标记是否已触发长按
    let timeoutId: ReturnType<typeof setTimeout> | Nullish = null // 定时器ID

    // 鼠标按下事件处理
    const handleMouseDown = (event: MouseEvent): void => {
        // 只处理左键点击
        if (event.button !== 0) return

        isPressing.value = true
        isLongPressed.value = false // 重置长按状态

        // 启动定时器
        timeoutId = setTimeout(() => {
            isLongPressed.value = true // 标记为已长按
            onPressStart(event) // 执行长按回调
        }, delay)
    }

    // 鼠标移动事件处理
    const handleMouseMove = (event: MouseEvent): void => {
        if (isPressing.value && !isLongPressed.value) {
            // 如果正在按压但还未长按，且设置了 onPressing 回调，则执行
            if (onPressing) {
                onPressing(event)
            }
        }
    }

    // 鼠标抬起事件处理
    const handleMouseUp = (event: MouseEvent): void => {
        // 清除定时器
        if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
        }

        // 只有当 isPressing 为 true 时才认为是一次有效的点击/长按尝试
        if (isPressing.value) {
            if (onLongPressEnd) {
                onLongPressEnd(event) // 无论是否成功长按，都执行结束回调
            }
            if (
                !isLongPressed.value &&
                (event.target as HTMLElement)?.contains(event.currentTarget as HTMLElement) &&
                onShortPress
            ) {
                // 如果不是长按，且鼠标抬起时还在元素内，可以触发一个短按回调（如果需要）
                onShortPress(event)
            }
        }

        // 重置状态
        isPressing.value = false
        isLongPressed.value = false
    }

    // 鼠标离开元素事件处理
    const handleMouseLeave = (event: MouseEvent): void => {
        // 如果按着鼠标离开了元素，也需要清理定时器
        if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
        }

        if (isPressing.value) {
            if (onLongPressEnd) {
                onLongPressEnd(event) // 鼠标离开也算一种结束
            }
        }

        // 重置状态
        isPressing.value = false
        isLongPressed.value = false
    }

    // 使用 onMounted 和 onUnmounted 来管理事件监听器的生命周期
    onMounted(() => {
        if (element) {
            element.addEventListener('mousedown', handleMouseDown)
            element.addEventListener('mousemove', handleMouseMove) // 注意：mousemove 可能会频繁触发，需谨慎使用
            element.addEventListener('mouseup', handleMouseUp)
            element.addEventListener('mouseleave', handleMouseLeave)
        }
    })

    onUnmounted(() => {
        if (element) {
            element.removeEventListener('mousedown', handleMouseDown)
            element.removeEventListener('mousemove', handleMouseMove)
            element.removeEventListener('mouseup', handleMouseUp)
            element.removeEventListener('mouseleave', handleMouseLeave)
        }
        // 组件卸载时，确保清除任何可能存在的定时器
        if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
        }
    })

    // 返回状态，以便在模板中使用
    return {
        isPressing: readonly(isPressing),
        isLongPressed: readonly(isLongPressed),
    }
}
