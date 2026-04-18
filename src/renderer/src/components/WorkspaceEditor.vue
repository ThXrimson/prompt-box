<template>
    <div class="shrink-0">
    <!-- 可拖动的handle -->
    <div
        ref="dragHandleRef"
        class="mt-1 h-2 cursor-ns-resize rounded-t-lg flex items-center justify-center hover:[&>div]:bg-(--color-primary)"
        @mousedown="startDragging"
    >
        <div class="w-8 h-1 bg-(--color-gray-400) rounded" />
    </div>
    <!-- 编辑框容器 -->
    <div
        ref="containerRef"
        class="flex flex-col bg-(--color-bg-card) rounded-(--radius-lg) shadow-(--shadow-md)"
        :style="{ height: containerHeight + 'px' }"
    >
        <div class="flex flex-col gap-2 p-2 flex-1 min-h-0">
            <!-- 编辑框 -->
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
                                :key="isPositiveEditor ? 'positive' : 'negative'"
                                ref="draggableTagsRef"
                                v-model="currentEditor"
                                :search-text="searchText"
                                @select-prompt="
                                    (promptId: string) => emit('selectPrompt', promptId)
                                "
                            />
                        </keep-alive>
                    </div>
                </el-scrollbar>
            </div>

            <!-- 工具栏 -->
            <div class="flex justify-between gap-2">
                <div class="flex gap-2 justify-start">
                    <el-tooltip
                        v-if="false"
                        content="添加为示例"
                        :enterable="false"
                        placement="top-end"
                        :hide-after="0"
                    >
                        <el-button :icon="Plus" />
                    </el-tooltip>
                    <el-tooltip
                        v-if="false"
                        content="选择示例为模板"
                        :enterable="false"
                        placement="top-end"
                        :hide-after="0"
                    >
                        <el-button :icon="Star" class="m-0!" />
                    </el-tooltip>
                    <el-tooltip
                        content="克隆工作区"
                        :enterable="false"
                        placement="top-end"
                        :hide-after="0"
                    >
                        <el-button :icon="DuplicateOutline" @click="cloneWorkspace" />
                    </el-tooltip>
                    <el-tooltip
                        content="撤回"
                        :enterable="false"
                        placement="top-end"
                        :hide-after="0"
                    >
                        <el-button
                            :icon="ArrowUndoOutline"
                            class="m-0!"
                            :disabled="!draggableTagsRef?.canUndo"
                            @click="draggableTagsRef?.undo()"
                        />
                    </el-tooltip>
                    <el-tooltip
                        content="重做"
                        :enterable="false"
                        placement="top-end"
                        :hide-after="0"
                    >
                        <el-button
                            :icon="ArrowRedoOutline"
                            class="m-0!"
                            :disabled="!draggableTagsRef?.canRedo"
                            @click="draggableTagsRef?.redo()"
                        />
                    </el-tooltip>
                    <div class="w-px h-6 bg-(--color-border) self-center mx-1"></div>
                    <el-tooltip
                        :content="!editMode ? '编辑模式' : '显示模式'"
                        :enterable="false"
                        placement="top-start"
                        :hide-after="0"
                    >
                        <el-button
                            :icon="Edit"
                            :type="!editMode ? 'default' : 'success'"
                            class="m-0!"
                            @click="switchEditMode"
                        />
                    </el-tooltip>
                    <el-tooltip
                        content="复制"
                        :enterable="false"
                        placement="top-start"
                        :hide-after="0"
                    >
                        <el-button :icon="CopyDocument" class="m-0!" @click="copyEditor" />
                    </el-tooltip>
                    <div class="w-px h-6 bg-(--color-border) self-center mx-1"></div>
                    <el-switch
                        v-model="removeLora"
                        inline-prompt
                        active-text="去掉LORA"
                        inactive-text="保留LORA"
                        style="
                            --el-switch-on-color: var(--color-success);
                            --el-switch-off-color: var(--color-danger);
                        "
                        class="[&_.is-text]:font-sans [&_.is-text]:italic"
                    />
                    <div class="w-px h-6 bg-(--color-border) self-center mx-1"></div>
                    <el-tooltip
                        v-if="false"
                        content="复制Lora提示词"
                        :enterable="false"
                        placement="top-start"
                        :hide-after="0"
                    >
                        <el-button class="m-0!"> Lora </el-button>
                    </el-tooltip>
                    <el-tooltip
                        content="添加换行"
                        :enterable="false"
                        placement="top-end"
                        :hide-after="0"
                    >
                        <el-button class="m-0! italic" @click="addEolPromptTag">EOL</el-button>
                    </el-tooltip>
                    <el-switch
                        v-model="isPositiveEditor"
                        inline-prompt
                        active-text="POSITIVE"
                        inactive-text="NEGATIVE"
                        style="
                            --el-switch-on-color: var(--color-success);
                            --el-switch-off-color: var(--color-danger);
                        "
                        class="[&_.is-text]:font-mono [&_.is-text]:italic"
                    />
                    <div class="w-px h-6 bg-(--color-border) self-center mx-1"></div>
                    <el-tooltip
                        content="展开所有"
                        :enterable="false"
                        placement="top-end"
                        :hide-after="0"
                    >
                        <el-button
                            :icon="Expand"
                            class="m-0!"
                            @click="draggableTagsRef?.uncollapseAll()"
                        />
                    </el-tooltip>
                    <el-tooltip
                        content="折叠所有"
                        :enterable="false"
                        placement="top-end"
                        :hide-after="0"
                    >
                        <el-button
                            :icon="Contract"
                            class="m-0!"
                            @click="draggableTagsRef?.collapseAll()"
                        />
                    </el-tooltip>
                </div>
                <el-input
                    v-model="searchText"
                    placeholder="搜索或添加"
                    clearable
                    spellcheck="false"
                    @keyup.enter="createPromptTag(searchText)"
                    @keyup.esc="searchText = ''"
                >
                    <template #prefix>
                        <el-icon class="cursor-pointer" @click.stop="copySearchText">
                            <copy-document />
                        </el-icon>
                    </template>
                </el-input>
                <el-button
                    :icon="containerHeight === MIN_HEIGHT ? CaretUp : CaretDown"
                    circle
                    @click="quickHide"
                />
                <el-popover title="操作说明" placement="top-end" :width="200">
                    <div class="text-sm leading-6">
                        <div>🖱️ 单击 — 编辑标签</div>
                        <div>🖱️ 双击 — 切换禁用</div>
                        <div>🖱️ 右键 — 复制文本</div>
                        <div>🖱️ 中键 — 删除标签</div>
                        <div>⌨️ Ctrl+Z — 撤销</div>
                        <div>⌨️ Ctrl+Y — 重做</div>
                    </div>
                    <template #reference>
                        <el-button :icon="Information" circle class="ml-0!" />
                    </template>
                </el-popover>
            </div>
        </div>
    </div>
    </div>
</template>

<script setup lang="ts">
import { CopyDocument, Edit, Plus, Star } from '@element-plus/icons-vue'
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useDataStore } from '@renderer/stores/data'
import { ElInput, ElMessage } from 'element-plus'
import { clone, isNil, cloneDeep } from 'lodash'
import {
    editorToString,
    isLoraString,
    newEolPromptTag,
    PromptTag,
    stringToEditor,
    stringToLoraPromptTag,
    stringToMonoPromptTag,
    stringToSpecialPromptTag,
} from '@shared/models/prompt-tag'
import { Prompt, PromptKind } from '@shared/models/prompt'
import DraggableTags from '@renderer/components/DraggableTags.vue'
import {
    Information,
    CaretUp,
    CaretDown,
    ArrowUndoOutline,
    ArrowRedoOutline,
    Expand,
    Contract,
    DuplicateOutline,
} from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import { handleError } from '@renderer/utils/error-handler'

const props = defineProps<{
    workspaceId: string
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

const emit = defineEmits<{
    selectPrompt: [promptId: string]
}>()

const draggableTagsRef = useTemplateRef('draggableTagsRef')

// 切换正向、负向编辑器
const isPositiveEditor = ref(true)
const currentEditor = computed({
    get() {
        {
            const workspace = dataStore.workspace.readonly.find((w) => w.id === props.workspaceId)
            if (isNil(workspace)) {
                return []
            }
            return (
                isPositiveEditor.value ? clone(workspace.positive) : clone(workspace.negative)
            ) as PromptTag[]
        }
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

// 编辑模式输入文字
const specialTexts = computed(() => {
    const res = [] as string[]
    for (const prompt of dataStore.prompt.readonly) {
        if (prompt.kind === PromptKind.Special) {
            res.push(prompt.text)
        }
    }
    return res
})
const editorInput = ref('')
const editMode = ref(false)
let beforeEdit = ''
function switchEditMode(): void {
    if (editMode.value) {
        if (beforeEdit !== editorInput.value) {
            // 切换到显示模式
            currentEditor.value = stringToEditor(editorInput.value, specialTexts.value)
            nextTick(() => {
                draggableTagsRef.value?.debouncedCommit()
            })
        }
    } else {
        // 切换到编辑模式
        editorInput.value = editorToString(currentEditor.value, false)
        beforeEdit = editorInput.value
    }
    editMode.value = !editMode.value
}

// 拖动相关的状态
const MIN_HEIGHT = 56
const containerRef = useTemplateRef<HTMLElement>('containerRef')
const containerHeight = ref(200)
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
const isDragging = ref(false)
const startY = ref(0)
const startHeight = ref(0)
// 拖动功能
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
    // 最高 800px，最低 56px

    containerHeight.value = Math.max(MIN_HEIGHT, Math.min(800, startHeight.value + deltaY))
}
function stopDragging(): void {
    isDragging.value = false
    document.removeEventListener('mousemove', onDragging)
    document.removeEventListener('mouseup', stopDragging)
    document.body.style.userSelect = ''
}
let lastHeight: number
function quickHide(): void {
    if (containerHeight.value === MIN_HEIGHT) {
        containerHeight.value = lastHeight
        return
    }
    lastHeight = containerHeight.value
    containerHeight.value = MIN_HEIGHT
}
// 拖动相关的状态

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

const searchText = ref('')

function createPromptTag(text: string): void {
    text = text.trim()
    if (text === '') return
    if (isLoraString(text)) {
        const tag = stringToLoraPromptTag(text)
        if (!isNil(tag)) {
            const editorClone = clone(currentEditor.value)
            editorClone.push(tag)
            currentEditor.value = editorClone
        }
    } else if (specialTexts.value.includes(text)) {
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

// 去掉 lora 的提示词
const removeLora = ref(false)
async function copyEditor(): Promise<void> {
    try {
        let candidates = currentEditor.value
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

async function copySearchText(): Promise<void> {
    try {
        if (searchText.value === '') return
        const res = await window.api.other.copyToClipboard(searchText.value)
        if (res) {
            ElMessage.success('已复制到剪贴板')
        } else {
            ElMessage.warning('复制失败，请重试')
        }
    } catch (error) {
        handleError(error, '复制失败')
    }
}

function handleEditorKeydown(e: KeyboardEvent): void {
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

onMounted(() => {
    document.addEventListener('keydown', handleEditorKeydown)
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleEditorKeydown)
})
</script>
