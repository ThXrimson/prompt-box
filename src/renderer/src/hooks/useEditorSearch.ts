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

const SEARCH_HISTORY_KEY = 'prompt-box:search-history'
const SEARCH_HISTORY_LIMIT = 10

function loadSearchHistory(): string[] {
    try {
        const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
        if (raw) {
            return JSON.parse(raw) as string[]
        }
    } catch {
        // localStorage access may fail in restricted environments
    }
    return []
}

function saveSearchHistory(history: string[]): void {
    try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history))
    } catch {
        // localStorage access may fail in restricted environments
    }
}

export function useEditorSearch(
    currentEditor: WritableComputedRef<PromptTag[]>,
    specialTexts: () => string[],
): {
    searchText: Ref<string>
    searchHistory: Ref<string[]>
    createPromptTag: (text: string) => void
    confirmSearch: (text: string) => void
    addEolPromptTag: () => void
} {
    const searchText = ref('')
    const searchHistory = ref<string[]>(loadSearchHistory())

    function addToHistory(text: string): void {
        const trimmed = text.trim()
        if (trimmed === '') return
        const filtered = searchHistory.value.filter((item) => item !== trimmed)
        filtered.unshift(trimmed)
        if (filtered.length > SEARCH_HISTORY_LIMIT) {
            filtered.length = SEARCH_HISTORY_LIMIT
        }
        searchHistory.value = filtered
        saveSearchHistory(filtered)
    }

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

    function confirmSearch(text: string): void {
        const trimmed = text.trim()
        if (trimmed === '') return
        addToHistory(trimmed)
        createPromptTag(trimmed)
        searchText.value = ''
    }

    function addEolPromptTag(): void {
        const editorClone = clone(currentEditor.value)
        editorClone.push(newEolPromptTag())
        currentEditor.value = editorClone
    }

    return {
        searchText,
        searchHistory,
        createPromptTag,
        confirmSearch,
        addEolPromptTag,
    }
}
