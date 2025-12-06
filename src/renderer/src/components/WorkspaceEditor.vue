<template>
    <el-dialog
        v-model="isEditingPromptText"
        title="编辑提示词文本"
        @keyup.esc.stop.prevent="isEditingPromptText = false"
        @opened="promptEditorInput?.focus()"
        @open.once="handleOpenEditDialog"
    >
        <div class="flex flex-col gap-2">
            <div class="flex gap-0.5 w-full flex-wrap">
                <el-button size="small" class="ml-0!" @click="handleEditPromptAddCurly">
                    +()
                </el-button>
                <el-button size="small" class="ml-0!" @click="handleEditPromptAddSquare">
                    +[]
                </el-button>
                <el-button size="small" class="ml-0!" @click="handleEditPromptDelete">
                    -()|[]
                </el-button>
                <el-button size="small" class="ml-0!" @click="handleEditPromptClear">
                    括号清空
                </el-button>
                <el-button size="small" class="ml-0!" @click="handleEditPromptAdd">
                    +0.1
                </el-button>
                <el-button size="small" class="ml-0!" @click="handleEditPromptMinus">
                    -0.1
                </el-button>
                <el-button size="small" class="ml-0!" @click="handleEditPromptZero">
                    权重清零
                </el-button>
            </div>
            <el-input
                ref="promptEditorInput"
                v-model="editingPromptText"
                placeholder="编辑提示词"
                @keyup.enter="handleConfirmEditPrompt"
            />
        </div>
        <template #footer>
            <el-button type="primary" @click="handleConfirmEditPrompt"> 确定 </el-button>
            <el-button @click="isEditingPromptText = false"> 取消 </el-button>
        </template>
    </el-dialog>
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
        class="flex flex-col bg-white rounded-lg shadow-md min-h-70"
        :style="{ height: containerHeight + 'px' }"
    >
        <div class="flex flex-col gap-2 p-2 flex-1 min-h-0">
            <!-- 编辑框 -->
            <div class="flex-1 min-h-0">
                <el-input
                    v-if="editMode"
                    v-model="inputText"
                    type="textarea"
                    resize="none"
                    :rows="5"
                    class="example-input h-full"
                />
                <el-scrollbar
                    v-else
                    class="border-none shadow-[0_0_0_1px_#e4e7ed] rounded-lg h-full"
                >
                    <div class="h-full">
                        <vue-draggable
                            v-model="currentEditorMut"
                            :animation="50"
                            class="flex flex-wrap p-2"
                            drag-class="opacity-0"
                            :on-start="onDragStart"
                            :on-end="onDragEnd"
                        >
                            <div v-for="item in currentEditorMut" :key="item.id">
                                <div
                                    v-if="draggingId === item.id"
                                    class="w-0.5 h-5 bg-blue-600 mx-[-1px]"
                                />
                                <el-dropdown
                                    v-else
                                    trigger="hover"
                                    size="small"
                                    placement="top"
                                    :hide-on-click="false"
                                    class="mx-0.5"
                                >
                                    <el-tag
                                        :type="getTagType(item)"
                                        effect="dark"
                                        size="small"
                                        disable-transitions
                                        closable
                                        class="cursor-pointer border! border-transparent hover:border-blue-500! transition-all duration-200"
                                        :class="{
                                            'line-through': item.disabled,
                                            'font-bold': true,
                                        }"
                                        @click.left="handleLeftClickPromptTag(item)"
                                        @click.right="copyText(promptTagToString(item))"
                                        @mousedown.middle.prevent.stop="removePrompt(item.id)"
                                        @close="removePrompt(item.id)"
                                    >
                                        {{ promptTagToString(item) }}
                                    </el-tag>

                                    <template #dropdown>
                                        <el-dropdown-menu
                                            class="flex! flex-row! p-0!"
                                            :item-classes="['px-2', 'py-1', 'whitespace-nowrap']"
                                        >
                                            <el-dropdown-item
                                                :disabled="isPromptTagCollected(item)"
                                                @click="createPrompt(item)"
                                            >
                                                收藏
                                            </el-dropdown-item>
                                            <el-dropdown-item @click="openPromptEditor(item)">
                                                编辑
                                            </el-dropdown-item>
                                            <el-dropdown-item
                                                @click="item.disabled = !item.disabled"
                                            >
                                                {{ item.disabled ? '启用' : '禁用' }}
                                            </el-dropdown-item>
                                        </el-dropdown-menu>
                                    </template>
                                </el-dropdown>
                            </div>
                        </vue-draggable>
                    </div>
                </el-scrollbar>
            </div>

            <!-- 工具栏 -->
            <div class="flex justify-between gap-2">
                <div class="flex gap-2 justify-start">
                    <el-tooltip
                        content="添加为示例"
                        :enterable="false"
                        placement="top-end"
                        :hide-after="0"
                    >
                        <el-button :icon="Plus" />
                    </el-tooltip>
                    <el-tooltip
                        content="选择示例为模板"
                        :enterable="false"
                        placement="top-end"
                        :hide-after="0"
                    >
                        <el-button :icon="Star" class="m-0!" />
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
                        class="[&_.is-text]:font-mono"
                    />
                    <el-tooltip
                        content="复制Lora提示词"
                        :enterable="false"
                        placement="top-start"
                        :hide-after="0"
                    >
                        <el-button class="m-0!"> Lora </el-button>
                    </el-tooltip>
                    <el-tooltip
                        content="添加BREAK"
                        :enterable="false"
                        placement="top-end"
                        :hide-after="0"
                    >
                        <el-button class="m-0!">BREAK</el-button>
                    </el-tooltip>

                    <!-- 切换正向、负向编辑器 -->
                    <el-switch
                        :model-value="isPositiveEditor"
                        inline-prompt
                        active-text="POSITIVE"
                        inactive-text="NEGATIVE"
                        style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
                        class="[&_.is-text]:font-mono"
                        @update:model-value="switchEditor($event as boolean)"
                    />
                </div>

                <el-input
                    v-model="searchText"
                    placeholder="搜索或添加"
                    clearable
                    @keyup.enter="addPromptTag(searchText)"
                >
                    <template #prefix>
                        <el-icon class="cursor-pointer" @click.stop="copySearchText">
                            <copy-document />
                        </el-icon>
                    </template>
                    <template #suffix>
                        <el-icon class="cursor-pointer" @click.stop="addPromptTag(searchText)">
                            <enter-icon />
                        </el-icon>
                    </template>
                </el-input>
            </div>
        </div>
    </div>

    <el-dialog
        v-if="editingPromptId !== null"
        v-model="editingPromptVisible"
        title="编辑提示词"
        class="h-[90vh] mt-[5vh]! mb-0! flex flex-col"
        body-class="flex-1 min-h-0 border-1 rounded-md border-neutral-200 p-2"
    >
        <el-scrollbar>
            <PromptDetail :prompt-id="editingPromptId!" />
        </el-scrollbar>
        <template #footer>
            <el-button type="danger" class="w-full" @click="deletePrompt(editingPromptId!)">
                删除
            </el-button>
        </template>
    </el-dialog>

    <el-dialog
        v-model="examplesDialogVisible"
        title="示例列表"
        fullscreen
        class="h-[100vh] flex flex-col"
        body-class="flex-1 min-h-0 flex flex-col"
    >
        <example-list />
    </el-dialog>
</template>

<script setup lang="ts">
import { CopyDocument, Edit, Plus, Star } from '@element-plus/icons-vue'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { DraggableEvent, SortableEvent, VueDraggable } from 'vue-draggable-plus'
import { useDataStore } from '@renderer/stores/data'
import {
    isLoraPrompt,
    joinBrackets,
    joinWeight,
    stripBrackets,
    stripWeight,
    weightAdd,
} from '@renderer/utils/utils'
import EnterIcon from '@renderer/icons/Enter.vue'
import ExampleList from '@renderer/views/ExampleList.vue'
import { ElInput, ElMessage, ElMessageBox } from 'element-plus'
import { useBracketsWrapElInput } from '@renderer/hooks/useBracketsWrapElInput'
import { clearLoraWeight, modifyLoraWeight } from '@renderer/utils/edit-weight'
import { isNil } from 'lodash'
import {
    editorToString,
    isGroupPromptTag,
    isLoraPromptTag,
    PromptTag,
    promptTagToString,
    stringToEditor,
    stringToMonoPromptTag,
} from '@shared/models/prompt-tag'
import { Nullish } from 'utility-types'
import { notFoundError } from '@renderer/stores/error'
import { useHandleClickGesture } from '@renderer/hooks/useHandleClickGesture'

const props = defineProps<{
    workspaceId: string
}>()
// TODO 处理 workspaceId 不合法的情况

const dataStore = useDataStore()

// 切换正向、负向编辑器
const isPositiveEditor = ref(true)
const currentEditorMut = computed({
    get() {
        {
            const workspace = dataStore.workspace.ref.find((w) => w.id === props.workspaceId)
            if (isNil(workspace)) {
                return []
            }
            return isPositiveEditor.value ? workspace.positive : workspace.negative
        }
    },
    set(newVal: PromptTag[]) {
        const workspace = dataStore.workspace.ref.find((w) => w.id === props.workspaceId)
        if (isNil(workspace)) {
            return
        }
        if (isPositiveEditor.value) {
            workspace.positive = newVal
        } else {
            workspace.negative = newVal
        }
    },
})
// 监听当前编辑器的变化，更新 workspace
watch(currentEditorMut.value, (newVal) => {
    if (isPositiveEditor.value) {
        window.api.workspace.update([
            {
                id: props.workspaceId,
                positive: newVal,
            },
        ])
    } else {
        window.api.workspace.update([
            {
                id: props.workspaceId,
                negative: newVal,
            },
        ])
    }
})

const switchEditor = (value: boolean): void => {
    isPositiveEditor.value = value
}

// 使输入框可以成对输入括号的功能
const promptEditorInput = useTemplateRef<InstanceType<typeof ElInput>>('promptEditorInput')
function handleOpenEditDialog(): void {
    useBracketsWrapElInput(promptEditorInput)
    promptEditorInput.value?.focus()
}

const inputText = ref('')
const editMode = ref(false)

// 是否正在编辑提示词
const isEditingPromptText = ref(false)
const editingPromptTextId = ref<string | null>(null)
const editingPromptText = ref('')

const handleClickGesture = useHandleClickGesture()
function handleLeftClickPromptTag(item: PromptTag): void {
    handleClickGesture(
        () => {
            editPrompt(item)
        },
        () => {
            item.disabled = !item.disabled
        }
    )
}

function editPrompt(item: PromptTag): void {
    editingPromptTextId.value = item.id
    editingPromptText.value = promptTagToString(item)
    isEditingPromptText.value = true
}

function copyText(text: string): void {
    window.api.other.copyToClipboard(text).then((res) => {
        if (res) {
            ElMessage.success('已复制到剪贴板')
        } else {
            ElMessage.error('复制失败，请重试')
        }
    })
}

function handleConfirmEditPrompt(): void {
    //
}

function handleEditPromptAddCurly(): void {
    editingPromptText.value = `(${editingPromptText.value})`
}

function handleEditPromptAddSquare(): void {
    editingPromptText.value = `[${editingPromptText.value}]`
}

function handleEditPromptDelete(): void {
    const stripBracketsRes = stripBrackets(editingPromptText.value)
    if (stripBracketsRes.leftBrackets.length > 0) {
        stripBracketsRes.leftBrackets.shift()
        editingPromptText.value = joinBrackets(
            stripBracketsRes.content,
            stripBracketsRes.leftBrackets
        )
    }
}

function handleEditPromptClear(): void {
    const stripBracketsRes = stripBrackets(editingPromptText.value)
    editingPromptText.value = stripBracketsRes.content
}

function handleEditPromptAdd(): void {
    const stripBracketsRes = stripBrackets(editingPromptText.value)
    const stripWeightRes = stripWeight(stripBracketsRes.content)
    const newWeight = weightAdd(stripWeightRes.weight, 0.1)
    let newStr = joinBrackets(
        joinWeight(stripWeightRes.content, newWeight),
        stripBracketsRes.leftBrackets
    )
    if (!isLoraPrompt(newStr)) {
        newStr = modifyLoraWeight(newStr, 0.1)
    }
    editingPromptText.value = newStr
}

function handleEditPromptMinus(): void {
    const stripBracketsRes = stripBrackets(editingPromptText.value)
    const stripWeightRes = stripWeight(stripBracketsRes.content)
    const newWeight = weightAdd(stripWeightRes.weight, -0.1)
    let newStr = joinBrackets(
        joinWeight(stripWeightRes.content, newWeight),
        stripBracketsRes.leftBrackets
    )
    if (!isLoraPrompt(newStr)) {
        newStr = modifyLoraWeight(newStr, -0.1)
    }
    editingPromptText.value = newStr
}

function handleEditPromptZero(): void {
    const stripBracketsRes = stripBrackets(editingPromptText.value)
    const stripWeightRes = stripWeight(stripBracketsRes.content)
    let newStr = joinBrackets(stripWeightRes.content, stripBracketsRes.leftBrackets)
    if (!isLoraPrompt(newStr)) {
        newStr = clearLoraWeight(newStr)
    }
    editingPromptText.value = newStr
}

// 拖动相关的状态
const containerRef = ref<HTMLElement>()
const dragHandleRef = ref<HTMLElement>()
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
    // 最高 800px，最低 150px

    containerHeight.value = Math.max(150, Math.min(800, startHeight.value + deltaY))
}

function stopDragging(): void {
    isDragging.value = false
    document.removeEventListener('mousemove', onDragging)
    document.removeEventListener('mouseup', stopDragging)
    document.body.style.userSelect = ''
}

defineExpose({
    addText: (_text: string) => {},
})

const promptTextTranslations = ref<Record<string, string>>({})

type TextPart = {
    id: string
    text: string
    searched: boolean
    focused: boolean
}

const searchText = ref('')

function addPromptTag(text: string): void {
    text = text.trim()
    if (text === '') return
    const tag = stringToMonoPromptTag(text)
    if (!isNil(tag)) {
        currentEditorMut.value.push(tag)
    }
}

function switchEditMode(): void {
    if (editMode.value) {
        // 切换到显示模式
        currentEditorMut.value = stringToEditor(inputText.value)
    } else {
        // 切换到编辑模式
        inputText.value = editorToString(currentEditorMut.value, false)
    }
    editMode.value = !editMode.value
}

function removePrompt(id: string): void {
    //
}

async function deletePrompt(id: string): Promise<void> {
    try {
        await ElMessageBox.confirm('确定删除此提示词？', '删除提示词', {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
        })
        await dataStore.prompt.delete(id)
        ElMessage.success('成功删除提示词')
        editingPromptVisible.value = false
    } catch (error) {
        if (error === notFoundError) {
            ElMessage.error('提示词不存在')
            return
        }
        if (error !== 'cancel') {
            ElMessage.error('删除提示词失败')
        }
    }
}

// 去掉 lora 的提示词
const removeLora = ref(false)
async function copyEditor(): Promise<void> {
    let candidates = currentEditorMut.value
    if (removeLora.value) {
        candidates = candidates.filter((item) => !isLoraPromptTag(item))
    }
    const text = editorToString(candidates)
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

async function createPrompt(promptTag: PromptTag): Promise<void> {
    if (isGroupPromptTag(promptTag)) {
        ElMessage.warning('不能添加组提示词')
        return
    }
    const text = promptTagToString(promptTag, false, false)
    if (dataStore.prompt.readonly.some((p) => p.text === text)) {
        ElMessage.warning('提示词已存在')
        return
    }
    const translation = promptTextTranslations.value[promptTagToString(promptTag)]
    const result = await dataStore.prompt.create({
        text,
        translation,
    })
    if (result) {
        ElMessage.success('成功添加提示词')
    } else {
        ElMessage.error('添加提示词失败')
    }
}

const editingPromptVisible = ref(false)
const editingPromptId = ref<string | Nullish>(null)

function openPromptEditor(item: PromptTag): void {
    const promptId = findPromptId(item)
    if (!isNil(promptId)) {
        editingPromptVisible.value = true
        editingPromptId.value = promptId
    } else {
        ElMessage.warning('提示词不存在')
    }
}

const examplesDialogVisible = ref(false)
function handleOpenExamplesDialog(): void {
    examplesDialogVisible.value = true
}

async function handleGetTextTranslation(text: string): Promise<string> {
    //
    return ''
}

// 拖拽tag时显示占位符
const draggingId = ref('')
function onDragStart(event: unknown): void {
    const e = event as DraggableEvent & SortableEvent
    draggingId.value = e.data.id
}
function onDragEnd(): void {
    draggingId.value = ''
}

// 是否已收藏 prompt tag
function isPromptTagCollected(item: PromptTag): boolean {
    return dataStore.prompt.readonly.some((p) => p.text === promptTagToString(item, false, false))
}

function findPromptId(item: PromptTag): string | Nullish {
    const text = promptTagToString(item, false, false)
    return dataStore.prompt.readonly.find((p) => p.text === text)?.id
}

function getTagType(item: PromptTag): 'primary' | 'info' {
    if (isPromptTagCollected(item)) {
        return 'info'
    }
    return 'primary'
}
</script>
