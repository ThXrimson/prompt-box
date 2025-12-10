<template>
    <!-- 可拖动的handle -->
    <div
        ref="dragHandleRef"
        class="mt-1 h-1 cursor-ns-resize rounded-t-lg flex items-center justify-center hover:[&>div]:bg-gray-600"
        @mousedown="startDragging"
    >
        <div class="w-8 h-0.5 bg-gray-400 rounded" />
    </div>
    <!-- 编辑框容器 -->
    <div
        ref="containerRef"
        class="flex flex-col bg-white rounded-lg shadow-md min-h-0"
        :style="{ height: containerHeight + 'px' }"
    >
        <div class="flex flex-col gap-2 p-2 flex-1 min-h-0">
            <!-- 编辑框 -->
            <div class="flex-1 min-h-0">
                <el-input
                    v-if="editMode"
                    v-model="editorInput"
                    type="textarea"
                    resize="none"
                    :rows="5"
                    spellcheck="false"
                    class="h-full [&_.el-textarea\_\_inner]:h-full"
                />
                <el-scrollbar
                    v-else
                    class="border-none shadow-[0_0_0_1px_#e4e7ed] rounded-lg h-full"
                >
                    <div class="h-full">
                        <DraggableTags
                            ref="draggableTagsRef"
                            v-model="currentEditor"
                            :search-text="searchText"
                            @select-prompt="(promptId: string) => emit('selectPrompt', promptId)"
                        />
                    </div>
                </el-scrollbar>
            </div>

            <!-- 工具栏 -->
            <div class="flex justify-between gap-2">
                <div class="flex gap-2 justify-start">
                    <!-- TODO 暂时隐藏 -->
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
                    <!-- 去掉lora -->
                    <el-switch
                        v-model="removeLora"
                        inline-prompt
                        active-text="去掉LORA"
                        inactive-text="保留LORA"
                        style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
                        class="[&_.is-text]:font-sans [&_.is-text]:italic"
                    />
                    <!-- TODO 暂时隐藏 -->
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

                    <!-- 切换正向、负向编辑器 -->
                    <el-switch
                        :model-value="isPositiveEditor"
                        inline-prompt
                        active-text="POSITIVE"
                        inactive-text="NEGATIVE"
                        style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
                        class="[&_.is-text]:font-mono [&_.is-text]:italic"
                        @update:model-value="switchEditor($event as boolean)"
                    />

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
                <el-popover title="操作" placement="top-end">
                    左键编辑<br />右键复制<br />中键删除<br />双击左键切换禁用
                    <template #reference>
                        <el-button :icon="Information" circle class="ml-0!" />
                    </template>
                </el-popover>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { CopyDocument, Edit, Plus, Star } from '@element-plus/icons-vue'
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { useDataStore } from '@renderer/stores/data'
import { ElInput, ElMessage } from 'element-plus'
import { clone, isNil } from 'lodash'
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
} from '@vicons/ionicons5'

const props = defineProps<{
    workspaceId: string
}>()
// TODO 处理 workspaceId 不合法的情况

const emit = defineEmits<{
    selectPrompt: [promptId: string]
}>()

const dataStore = useDataStore()

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

// 切换正向、负向编辑器
const switchEditor = (value: boolean): void => {
    isPositiveEditor.value = value
}

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
function switchEditMode(): void {
    if (editMode.value) {
        // 切换到显示模式
        currentEditor.value = stringToEditor(editorInput.value, specialTexts.value)
    } else {
        // 切换到编辑模式
        editorInput.value = editorToString(currentEditor.value, false)
    }
    editMode.value = !editMode.value
}

// 拖动相关的状态
const MIN_HEIGHT = 56
const containerRef = useTemplateRef<HTMLElement>('containerRef')
const containerHeight = ref(200)
onMounted(() => {
    if (containerRef.value) {
        containerHeight.value = containerRef.value.clientHeight
    }
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
            const tag = stringToLoraPromptTag(prompt.text)
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
    let candidates = currentEditor.value
    const text = editorToString(candidates, true, removeLora.value)
    const res = await window.api.other.copyToClipboard(text)
    if (res) {
        ElMessage.success('已复制到剪贴板')
    } else {
        ElMessage.warning('复制失败，请重试')
    }
}

async function copySearchText(): Promise<void> {
    if (searchText.value === '') return
    const res = await window.api.other.copyToClipboard(searchText.value)
    if (res) {
        ElMessage.success('已复制到剪贴板')
    } else {
        ElMessage.warning('复制失败，请重试')
    }
}
</script>
