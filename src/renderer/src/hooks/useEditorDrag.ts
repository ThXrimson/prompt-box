import { ref, onMounted, nextTick, type Ref, type TemplateRef } from 'vue'

const MIN_HEIGHT = 56
const MAX_HEIGHT = 800

export function useEditorDrag(
    containerRef: TemplateRef<HTMLElement | undefined>,
): {
    MIN_HEIGHT: number
    containerHeight: Ref<number>
    startDragging: (event: MouseEvent) => void
    quickHide: () => void
} {
    const containerHeight = ref(200)
    const isDragging = ref(false)
    const startY = ref(0)
    const startHeight = ref(0)
    let lastHeight: number = 200

    onMounted(() => {
        nextTick(() => {
            if (containerRef.value) {
                const height = containerRef.value.clientHeight
                if (height > 0) {
                    containerHeight.value = height
                }
            }
        })
    })

    function startDragging(event: MouseEvent): void {
        isDragging.value = true
        startY.value = event.clientY
        startHeight.value = containerHeight.value

        document.addEventListener('mousemove', onDragging)
        document.addEventListener('mouseup', stopDragging)
        document.body.style.userSelect = 'none'
        event.preventDefault()
    }

    function onDragging(event: MouseEvent): void {
        if (!isDragging.value) return

        const deltaY = startY.value - event.clientY
        containerHeight.value = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight.value + deltaY))
    }

    function stopDragging(): void {
        isDragging.value = false
        document.removeEventListener('mousemove', onDragging)
        document.removeEventListener('mouseup', stopDragging)
        document.body.style.userSelect = ''
    }

    function quickHide(): void {
        if (containerHeight.value === MIN_HEIGHT) {
            containerHeight.value = lastHeight
            return
        }
        lastHeight = containerHeight.value
        containerHeight.value = MIN_HEIGHT
    }

    return {
        MIN_HEIGHT,
        containerHeight,
        startDragging,
        quickHide,
    }
}
