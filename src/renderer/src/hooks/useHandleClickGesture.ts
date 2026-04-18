export function useHandleClickGesture(
    delayMs: number = 100
): (handleSingleClick: () => void, handleDoubleClick: () => void) => void {
    let clickCount = 0
    let clickTimer: ReturnType<typeof setTimeout> | undefined = undefined
    return (handleSingleClick: () => void, handleDoubleClick: () => void) => {
        clickCount++
        if (clickCount === 1) {
            // 第一次点击，设置一个定时器
            clickTimer = setTimeout(() => {
                // 如果在 DELAY 时间内没有第二次点击，则认为是单次点击
                handleSingleClick()
                clickCount = 0 // 重置点击次数
            }, delayMs)
        } else {
            // 第二次点击，清除定时器，执行双击操作
            clearTimeout(clickTimer)
            handleDoubleClick()
            clickCount = 0 // 重置点击次数
        }
    }
}
