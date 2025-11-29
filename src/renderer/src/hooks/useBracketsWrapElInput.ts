import { onUnmounted, nextTick, useTemplateRef } from 'vue'
import type { ElInput } from 'element-plus'

const bracketsMap: { [key: string]: string } = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
    '<': '>',
}

export function useBracketsWrapElInput(
    inputRef: ReturnType<typeof useTemplateRef<InstanceType<typeof ElInput>>>
): void {
    const handleKeydown = (event: KeyboardEvent): void => {
        // 确保有引用指向el-input的DOM元素
        if (!inputRef.value) return

        const inputElement: HTMLInputElement | HTMLTextAreaElement | null =
            inputRef.value.input || inputRef.value.$el.querySelector('input, textarea') // 兼容el-input内部的input或textarea

        if (!inputElement) return

        const { selectionStart, selectionEnd, value } = inputElement

        if (selectionStart === null || selectionEnd === null) return

        // 检查是否有文本被选中
        const selectedText = value.substring(selectionStart, selectionEnd)
        let newValue = value
        let newCursorPos = selectionEnd

        if (bracketsMap[event.key]) {
            newValue = event.key + selectedText + bracketsMap[event.key]
            newCursorPos++

            // 阻止默认的按键行为（避免替换文本）
            event.preventDefault()

            if (selectedText.length > 0) {
                document.execCommand('delete', false, '')
            }
            if (document.execCommand('insertText', false, newValue)) {
                // 如果 insertText 成功，需要手动调整光标位置
                // 注意：execCommand 会改变 selectionStart/End
                nextTick(() => {
                    inputElement.setSelectionRange(newCursorPos, newCursorPos)
                })
            }

            // inputElement.value = newValue
            // const inputEvent = new Event('input', { bubbles: true })
            // inputElement.dispatchEvent(inputEvent)
            // nextTick(() => {
            //   inputElement.setSelectionRange(newCursorPos, newCursorPos)
            // })
        }
    }

    // 确保组件挂载后，el-input的DOM元素可用
    if (inputRef.value) {
        const inputElement =
            inputRef.value.input || inputRef.value.$el.querySelector('input, textarea')
        if (inputElement) {
            inputElement.addEventListener('keydown', handleKeydown)
        }
    }

    onUnmounted(() => {
        if (inputRef.value) {
            const inputElement =
                inputRef.value.input || inputRef.value.$el.querySelector('input, textarea')
            if (inputElement) {
                inputElement.removeEventListener('keydown', handleKeydown)
            }
        }
    })
}
