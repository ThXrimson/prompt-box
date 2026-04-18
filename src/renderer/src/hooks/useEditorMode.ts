import { ref, nextTick, type Ref, type WritableComputedRef } from 'vue'
import { editorToString, stringToEditor, type PromptTag } from '@shared/models/prompt-tag'

export function useEditorMode(
    currentEditor: WritableComputedRef<PromptTag[]>,
    specialTexts: () => string[],
    draggableTagsRef: { value: { debouncedCommit: () => void } | null | undefined },
): {
    editorInput: Ref<string>
    editMode: Ref<boolean>
    switchEditMode: () => void
} {
    const editorInput = ref('')
    const editMode = ref(false)
    let beforeEdit = ''

    function switchEditMode(): void {
        if (editMode.value) {
            if (beforeEdit !== editorInput.value) {
                currentEditor.value = stringToEditor(editorInput.value, specialTexts())
                nextTick(() => {
                    draggableTagsRef.value?.debouncedCommit()
                })
            }
        } else {
            editorInput.value = editorToString(currentEditor.value, false)
            beforeEdit = editorInput.value
        }
        editMode.value = !editMode.value
    }

    return {
        editorInput,
        editMode,
        switchEditMode,
    }
}
