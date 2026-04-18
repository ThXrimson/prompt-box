<template>
    <div class="shrink-0">
        <EditorDragHandle @start-dragging="startDragging" />
        <div
            ref="containerRef"
            class="flex flex-col bg-(--color-bg-card) rounded-(--radius-lg) shadow-(--shadow-md)"
            :style="{ height: containerHeight + 'px' }"
        >
            <div class="flex flex-col gap-2 p-2 flex-1 min-h-0">
                <div class="flex-1 min-h-0">
                    <el-input
                        v-show="editMode"
                        v-model="editorInput"
                        type="textarea"
                        resize="none"
                        :rows="5"
                        spellcheck="false"
                        class="h-full [&_.el-textarea\_\_inner]:h-full"
                    />
                    <el-scrollbar
                        v-show="!editMode"
                        class="border-none shadow-[0_0_0_1px_var(--color-border)] rounded-lg h-full"
                    >
                        <div class="h-full">
                            <keep-alive>
                                <component
                                    :is="DraggableTags"
                                    :key="`${props.workspaceId}-${isPositiveEditor ? 'positive' : 'negative'}`"
                                    ref="draggableTagsRef"
                                    v-model="currentEditor"
                                    :search-text="searchText"
                                    @select-prompt="(promptId: string) => emit('selectPrompt', promptId)"
                                />
                            </keep-alive>
                        </div>
                    </el-scrollbar>
                </div>

                <EditorToolbar
                    :edit-mode="editMode"
                    :remove-lora="removeLora"
                    :is-positive-editor="isPositiveEditor"
                    :search-text="searchText"
                    :search-history="searchHistory"
                    :container-height="containerHeight"
                    :can-undo="draggableTagsRef?.canUndo ?? false"
                    :can-redo="draggableTagsRef?.canRedo ?? false"
                    :min-height="MIN_HEIGHT"
                    @clone="cloneWorkspace"
                    @undo="draggableTagsRef?.undo()"
                    @redo="draggableTagsRef?.redo()"
                    @toggle-edit-mode="switchEditMode"
                    @copy="copyEditor"
                    @update:remove-lora="removeLora = $event"
                    @add-eol="addEolPromptTag"
                    @update:is-positive-editor="isPositiveEditor = $event"
                    @expand-all="draggableTagsRef?.uncollapseAll()"
                    @collapse-all="draggableTagsRef?.collapseAll()"
                    @update:search-text="searchText = $event"
                    @confirm-search="confirmSearch"
                    @copy-search-text="copySearchText(searchText)"
                    @toggle-height="quickHide"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useDataStore } from '@renderer/stores/data'
import { clone, isNil, cloneDeep } from 'lodash'
import {
    PromptTag,
    stringToLoraPromptTag,
    stringToMonoPromptTag,
    stringToSpecialPromptTag,
} from '@shared/models/prompt-tag'
import { Prompt, PromptKind } from '@shared/models/prompt'
import DraggableTags from '@renderer/components/DraggableTags.vue'
import { useRouter } from 'vue-router'
import { handleError } from '@renderer/utils/error-handler'
import EditorDragHandle from '@renderer/components/EditorDragHandle.vue'
import EditorToolbar from '@renderer/components/EditorToolbar.vue'
import { useEditorDrag } from '@renderer/hooks/useEditorDrag'
import { useEditorMode } from '@renderer/hooks/useEditorMode'
import { useEditorShortcuts } from '@renderer/hooks/useEditorShortcuts'
import { useEditorClipboard } from '@renderer/hooks/useEditorClipboard'
import { useEditorSearch } from '@renderer/hooks/useEditorSearch'

const props = defineProps<{
    workspaceId: string
}>()

const emit = defineEmits<{
    selectPrompt: [promptId: string]
}>()

const router = useRouter()
const dataStore = useDataStore()
const workspace = computed(() =>
    dataStore.workspace.readonly.find((w) => w.id === props.workspaceId)
)
if (isNil(workspace.value)) {
    handleError('工作区不存在或已被删除')
    router.push('/workspaces')
}

async function cloneWorkspace(): Promise<void> {
    try {
        const workspace = dataStore.workspace.readonly.find((w) => w.id === props.workspaceId)
        if (isNil(workspace)) {
            handleError('未找到该工作区')
            return
        }
        const { id } = await dataStore.workspace.create({
            name: `${workspace.name} - 副本`,
            positive: cloneDeep(workspace.positive) as PromptTag[],
            negative: cloneDeep(workspace.negative) as PromptTag[],
            tagIds: cloneDeep(workspace.tagIds) as string[],
        })
        router.push(`/workspace/${id}`)
    } catch (error) {
        handleError(error, '克隆工作区失败')
    }
}

const isPositiveEditor = ref(true)
const currentEditor = computed({
    get() {
        const workspace = dataStore.workspace.readonly.find((w) => w.id === props.workspaceId)
        if (isNil(workspace)) {
            return []
        }
        return (
            isPositiveEditor.value ? clone(workspace.positive) : clone(workspace.negative)
        ) as PromptTag[]
    },
    set(newVal: PromptTag[]) {
        const workspace = dataStore.workspace.readonly.find((w) => w.id === props.workspaceId)
        if (isNil(workspace)) {
            return
        }
        if (isPositiveEditor.value) {
            dataStore.workspace.update({
                id: props.workspaceId,
                positive: newVal,
            })
        } else {
            dataStore.workspace.update({
                id: props.workspaceId,
                negative: newVal,
            })
        }
    },
})

const specialTexts = computed(() => {
    const res = [] as string[]
    for (const prompt of dataStore.prompt.readonly) {
        if (prompt.kind === PromptKind.Special) {
            res.push(prompt.text)
        }
    }
    return res
})

const containerRef = useTemplateRef<HTMLElement>('containerRef')
const { MIN_HEIGHT, containerHeight, startDragging, quickHide } = useEditorDrag(containerRef)

const draggableTagsRef = useTemplateRef('draggableTagsRef')

const { editorInput, editMode, switchEditMode } = useEditorMode(
    currentEditor,
    () => specialTexts.value,
    draggableTagsRef,
)

const { removeLora, copyEditor, copySearchText } = useEditorClipboard(currentEditor)

const { searchText, searchHistory, confirmSearch, addEolPromptTag } = useEditorSearch(
    currentEditor,
    () => specialTexts.value,
)

useEditorShortcuts(draggableTagsRef)

defineExpose({
    addPromptTag: (prompt: Prompt) => {
        if (prompt.kind === PromptKind.Lora) {
            const tag = stringToLoraPromptTag(`<lora:${prompt.text}>`)
            if (!isNil(tag)) {
                const editorClone = clone(currentEditor.value)
                editorClone.push(tag)
                currentEditor.value = editorClone
            }
        } else if (prompt.kind === PromptKind.Special) {
            const tag = stringToSpecialPromptTag(prompt.text)
            const editorClone = clone(currentEditor.value)
            editorClone.push(tag)
            currentEditor.value = editorClone
        } else {
            const tag = stringToMonoPromptTag(prompt.text)
            tag.translation = prompt.translation
            const editorClone = clone(currentEditor.value)
            editorClone.push(tag)
            currentEditor.value = editorClone
        }
    },
})
</script>
