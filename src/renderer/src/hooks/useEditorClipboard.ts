import { ref, type Ref, type WritableComputedRef } from 'vue'
import { ElMessage } from 'element-plus'
import { editorToString, type PromptTag } from '@shared/models/prompt-tag'
import { handleError } from '@renderer/utils/error-handler'

export function useEditorClipboard(
    currentEditor: WritableComputedRef<PromptTag[]>,
): {
    removeLora: Ref<boolean>
    copyEditor: () => Promise<void>
    copySearchText: (searchText: string) => Promise<void>
} {
    const removeLora = ref(false)

    async function copyEditor(): Promise<void> {
        try {
            const candidates = currentEditor.value
            const text = editorToString(candidates, true, removeLora.value)
            const res = await window.api.other.copyToClipboard(text)
            if (res) {
                ElMessage.success('已复制到剪贴板')
            } else {
                ElMessage.warning('复制失败，请重试')
            }
        } catch (error) {
            handleError(error, '复制失败')
        }
    }

    async function copySearchText(searchText: string): Promise<void> {
        try {
            if (searchText === '') return
            const res = await window.api.other.copyToClipboard(searchText)
            if (res) {
                ElMessage.success('已复制到剪贴板')
            } else {
                ElMessage.warning('复制失败，请重试')
            }
        } catch (error) {
            handleError(error, '复制失败')
        }
    }

    return {
        removeLora,
        copyEditor,
        copySearchText,
    }
}
