import { onActivated, onDeactivated } from 'vue'
import { useRoute } from 'vue-router'

export function useEditorShortcuts(
    draggableTagsRef: { value: { canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void } | null | undefined },
): void {
    const route = useRoute()

    function handleEditorKeydown(e: KeyboardEvent): void {
        if (!route.path.startsWith('/workspace/')) return
        if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
            e.preventDefault()
            if (draggableTagsRef.value?.canUndo) {
                draggableTagsRef.value.undo()
            }
        }
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault()
            if (draggableTagsRef.value?.canRedo) {
                draggableTagsRef.value.redo()
            }
        }
    }

    onActivated(() => {
        document.addEventListener('keydown', handleEditorKeydown)
    })

    onDeactivated(() => {
        document.removeEventListener('keydown', handleEditorKeydown)
    })
}
