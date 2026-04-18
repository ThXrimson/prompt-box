import { ref, type Ref, type WritableComputedRef } from 'vue'
import { clone } from 'lodash'
import {
    isLoraString,
    newEolPromptTag,
    type PromptTag,
    stringToEditor,
    stringToLoraPromptTag,
    stringToSpecialPromptTag,
} from '@shared/models/prompt-tag'

export function useEditorSearch(
    currentEditor: WritableComputedRef<PromptTag[]>,
    specialTexts: () => string[],
): {
    searchText: Ref<string>
    createPromptTag: (text: string) => void
    addEolPromptTag: () => void
} {
    const searchText = ref('')

    function createPromptTag(text: string): void {
        text = text.trim()
        if (text === '') return
        if (isLoraString(text)) {
            const tag = stringToLoraPromptTag(text)
            if (tag) {
                const editorClone = clone(currentEditor.value)
                editorClone.push(tag)
                currentEditor.value = editorClone
            }
        } else if (specialTexts().includes(text)) {
            const tag = stringToSpecialPromptTag(text)
            const editorClone = clone(currentEditor.value)
            editorClone.push(tag)
            currentEditor.value = editorClone
        } else {
            const tags = stringToEditor(text)
            const editorClone = clone(currentEditor.value)
            editorClone.push(...tags)
            currentEditor.value = editorClone
        }
    }

    function addEolPromptTag(): void {
        const editorClone = clone(currentEditor.value)
        editorClone.push(newEolPromptTag())
        currentEditor.value = editorClone
    }

    return {
        searchText,
        createPromptTag,
        addEolPromptTag,
    }
}
