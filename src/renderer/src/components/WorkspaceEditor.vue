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
                            v-model="promptList"
                            :animation="50"
                            class="flex flex-wrap p-2"
                            drag-class="opacity-0"
                            :on-start="onDragStart"
                            :on-end="onDragEnd"
                        >
                            <div v-for="item in promptList" :key="item.id">
                                <div
                                    v-if="draggingID === item.id"
                                    class="w-0.5 h-5 bg-blue-600 mx-[-1px]"
                                />
                                <el-dropdown
                                    v-else
                                    trigger="hover"
                                    size="small"
                                    placement="top"
                                    :hide-on-click="false"
                                    :disabled="item.text === BREAK"
                                    class="mx-0.5"
                                >
                                    <el-tag
                                        :type="
                                            item.text === BREAK
                                                ? 'danger'
                                                : item.disabled
                                                  ? 'info'
                                                  : item.existsID !== null
                                                    ? 'success'
                                                    : 'primary'
                                        "
                                        effect="dark"
                                        :color="item.text === BREAK ? '#000' : ''"
                                        size="small"
                                        disable-transitions
                                        closable
                                        class="cursor-pointer border! border-transparent hover:border-blue-500! transition-all duration-200"
                                        :class="{
                                            'line-through': item.disabled,
                                            'font-bold': true,
                                        }"
                                        @click.left="handleClickPromptTag(item)"
                                        @click.right="handleCopyPrompt(item.text)"
                                        @mousedown.middle.prevent.stop="handleRemovePrompt(item.id)"
                                        @close="handleRemovePrompt(item.id)"
                                    >
                                        <span
                                            v-for="part in promptTextView[item.text]"
                                            :key="part.id"
                                            :class="{
                                                'bg-yellow-300': part.searched,
                                                'bg-red-400': part.focused,
                                            }"
                                        >
                                            {{ part.text }}
                                        </span>
                                    </el-tag>

                                    <template #dropdown>
                                        <el-dropdown-menu
                                            class="flex! flex-row! p-0!"
                                            :item-classes="['px-2', 'py-1', 'whitespace-nowrap']"
                                        >
                                            <el-dropdown-item
                                                :disabled="item.text === BREAK"
                                                @click="handleAddPrompt(item.text)"
                                            >
                                                收藏
                                            </el-dropdown-item>
                                            <el-dropdown-item
                                                :disabled="
                                                    item.existsID === null || item.text === BREAK
                                                "
                                                @click="handleOpenPromptEditor(item.existsID!)"
                                            >
                                                编辑
                                            </el-dropdown-item>
                                            <el-dropdown-item
                                                :disabled="item.text === BREAK"
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
                        <el-button :icon="Plus" @click="handleAddExample(joinPrompts(false))" />
                    </el-tooltip>
                    <el-tooltip
                        content="选择示例为模板"
                        :enterable="false"
                        placement="top-end"
                        :hide-after="0"
                    >
                        <el-button :icon="Star" class="m-0!" @click="handleOpenExamplesDialog" />
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
                            @click="handleSwitchEditMode"
                        />
                    </el-tooltip>
                    <el-tooltip
                        content="复制"
                        :enterable="false"
                        placement="top-start"
                        :hide-after="0"
                    >
                        <el-button
                            :icon="CopyDocument"
                            class="m-0!"
                            @click="handleCopyToClipboard"
                        />
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
                        <el-button class="m-0!" @click="handleCopyLoraToClipboard">
                            Lora
                        </el-button>
                    </el-tooltip>
                    <el-tooltip
                        content="添加BREAK"
                        :enterable="false"
                        placement="top-end"
                        :hide-after="0"
                    >
                        <el-button class="m-0!" @click="handleAddBREAK">BREAK</el-button>
                    </el-tooltip>

                    <!-- 切换正向、负向编辑器 -->
                    <el-switch
                        :model-value="isPositiveEditor"
                        inline-prompt
                        active-text="POSITIVE"
                        inactive-text="NEGATIVE"
                        style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
                        class="[&_.is-text]:font-mono"
                        @update:model-value="handleSwitchEditor($event as boolean)"
                    />
                </div>

                <el-input
                    v-model="searchText"
                    placeholder="搜索或添加"
                    clearable
                    @keyup.enter="handleAddPromptToEditor"
                >
                    <template #prefix>
                        <el-icon class="cursor-pointer" @click.stop="handleToCopySearchText">
                            <copy-document />
                        </el-icon>
                    </template>
                    <template #suffix>
                        <el-icon class="cursor-pointer" @click.stop="handleAddPromptToEditor">
                            <enter-icon />
                        </el-icon>
                    </template>
                </el-input>
            </div>
        </div>
    </div>

    <el-dialog
        v-if="editingPromptID !== null"
        v-model="editingPromptVisible"
        title="编辑提示词"
        class="h-[90vh] mt-[5vh]! mb-0! flex flex-col"
        body-class="flex-1 min-h-0 border-1 rounded-md border-neutral-200 p-2"
    >
        <el-scrollbar>
            <prompt-editor :promptId="editingPromptID" />
        </el-scrollbar>
        <template #footer>
            <el-button type="danger" class="w-full" @click="handleDeletePrompt(editingPromptID!)">
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
        <examples />
    </el-dialog>
</template>

<script setup lang="ts">
import { CopyDocument, Edit, Plus, Star } from '@element-plus/icons-vue'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { DraggableEvent, SortableEvent, VueDraggable } from 'vue-draggable-plus'
import { watchArray } from '@vueuse/core'
import { useStorage } from '@renderer/stores/data'
import {
    debounced,
    extractLoraPrompts,
    isLoraPrompt,
    joinBrackets,
    joinWeight,
    LeftBracket,
    removeLoraPrompts,
    stripBrackets,
    stripWeight,
    weightAdd,
} from '@renderer/utils/utils'
import EnterIcon from '@renderer/icons/Enter.vue'
import Examples from '@renderer/views/Examples.vue'
import { ElInput, ElMessage, ElMessageBox } from 'element-plus'
import { useBracketsWrapElInput } from '@renderer/hooks/useBracketsWrapElInput'
import { splitByCommaPlus } from '@renderer/utils/prompts-strings'
import { clearLoraWeight, modifyLoraWeight } from '@renderer/utils/edit-weight'

const BREAK = 'BREAK'
const DISABLED_PREFIX = '(disabled)'

function newBREAK(): PromptView {
    return {
        id: crypto.randomUUID(),
        text: BREAK,
        leftBrackets: [],
        weight: '',
        existsID: null,
        disabled: false,
    }
}

const props = defineProps<{
    positiveEditor: string
    negativeEditor: string
}>()

const storage = useStorage()

const emit = defineEmits<{
    (e: 'update-positive-editor', value: string): void
    (e: 'update-negative-editor', value: string): void
    (e: 'existing-prompt-change', existingIDs: string[]): void
}>()

function emitUpdateEditor(): void {
    if (isPositiveEditor.value) {
        emit('update-positive-editor', joinPrompts(false))
    } else {
        emit('update-negative-editor', joinPrompts(false))
    }
}

// 切换正向、负向编辑器
const isPositiveEditor = ref(true)
const editorText = computed(() =>
    isPositiveEditor.value ? props.positiveEditor : props.negativeEditor
)

const handleSwitchEditor = (value: boolean): void => {
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
const editingPromptTextID = ref<string | null>(null)
const editingPromptText = ref('')

let promptTagClickCount = 0
let promptTagClickTimer: ReturnType<typeof setTimeout> | undefined = undefined
const PROMPT_TAG_CLICK_DELAY = 250 // 定义一个延迟时间，用于区分单击和双击

function handleClickPromptTag(item: PromptView): void {
    promptTagClickCount++
    if (promptTagClickCount === 1) {
        // 第一次点击，设置一个定时器
        promptTagClickTimer = setTimeout(() => {
            // 如果在 DELAY 时间内没有第二次点击，则认为是单次点击
            handleEditPrompt(item.id)
            promptTagClickCount = 0 // 重置点击次数
        }, PROMPT_TAG_CLICK_DELAY)
    } else {
        // 第二次点击，清除定时器，执行双击操作
        clearTimeout(promptTagClickTimer)
        handleDoubleClickPrompt(item)
        promptTagClickCount = 0 // 重置点击次数
    }
}

function handleEditPrompt(id: string): void {
    const p = promptList.value.find((item) => item.id === id)
    if (p) {
        editingPromptTextID.value = id
        editingPromptText.value = joinBrackets(joinWeight(p.text, p.weight), p.leftBrackets)
        isEditingPromptText.value = true
    }
}

function handleDoubleClickPrompt(item: PromptView): void {
    if (item.text !== BREAK) {
        item.disabled = !item.disabled
    }
}

function handleCopyPrompt(text: string): void {
    window.api.copyToClipboard(text).then((res) => {
        if (res) {
            ElMessage.success('已复制到剪贴板')
        } else {
            ElMessage.error('复制失败，请重试')
        }
    })
}

function handleConfirmEditPrompt(): void {
    if (!editingPromptText.value.trim()) return
    const item = promptList.value.find((item) => item.id === editingPromptTextID.value)
    if (item) {
        const showText = editingPromptText.value.trim()
        const stripBracketsRes = stripBrackets(showText)
        const stripWeightRes = stripWeight(stripBracketsRes.content)
        item.text = stripWeightRes.content
        item.weight = stripWeightRes.weight
        item.leftBrackets = stripBracketsRes.leftBrackets
        item.existsID = storage.getPromptIDIfExists(item.text)
        emitUpdateEditor()
        isEditingPromptText.value = false
    }
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

interface PromptView {
    id: string
    text: string
    leftBrackets: LeftBracket[]
    weight: string
    // 是否存在于存储中
    existsID: string | null
    disabled: boolean
}
const promptList = ref<PromptView[]>([])
watch(
    editorText,
    () => {
        promptList.value = splitTextToPromptView(editorText.value)
    },
    { immediate: true }
)
defineExpose({
    addText: (text: string) => {
        promptList.value.push({
            id: crypto.randomUUID(),
            text: text.trim(),
            leftBrackets: text.includes(',') ? ['('] : [],
            weight: '',
            existsID: storage.getPromptIDIfExists(text.trim()),
            disabled: false,
        })
        inputText.value = ''
        emitUpdateEditor()
    },
})

const promptTextTranslations = ref<Record<string, string>>({})
const debouncedUpdate = debounced(() => emitUpdateEditor(), 500)
watchArray(
    () => promptList.value.map(({ text }) => text),
    (_newArr, _oldArr, added) => {
        added.forEach(async (text) => {
            if (text === BREAK || isLoraPrompt(text)) {
                return
            }
            const translation = await handleGetTextTranslation(text)
            if (translation) {
                promptTextTranslations.value[text] = translation
            }
        })
        debouncedUpdate()
    },
    {
        immediate: true,
    }
)

type TextPart = {
    id: string
    text: string
    searched: boolean
    focused: boolean
}

const searchText = ref('')

function handleAddPromptToEditor(): void {
    const text = searchText.value.trim()
    if (text === '') return
    promptList.value.push({
        id: crypto.randomUUID(),
        text,
        leftBrackets: text.includes(',') ? ['('] : [],
        weight: '',
        existsID: storage.getPromptIDIfExists(text),
        disabled: false,
    })
    searchText.value = ''
    emitUpdateEditor()
}

const promptTextView = computed(() => {
    const regex = new RegExp(searchText.value, 'ig')

    const textToView: Record<string, TextPart[]> = {}
    promptList.value.forEach((item) => {
        let text: string
        text = joinBrackets(joinWeight(item.text, item.weight), item.leftBrackets)
        if (promptTextTranslations.value[item.text]) {
            text += ` | ${promptTextTranslations.value[item.text]}`
        }
        const matchesIndices = Array.from(text.matchAll(regex)).map((match) => match.index)

        textToView[item.text] = []
        let prevIndex = 0
        for (const index of matchesIndices) {
            if (prevIndex !== index) {
                textToView[item.text].push({
                    id: item.id,
                    text: text.slice(prevIndex, index),
                    searched: false,
                    focused: false,
                })
            }
            textToView[item.text].push({
                id: item.id,
                text: text.slice(index, index + searchText.value.length),
                searched: true,
                focused: false,
            })
            prevIndex = index + searchText.value.length
        }
        if (prevIndex < text.length) {
            textToView[item.text].push({
                id: item.id,
                text: text.slice(prevIndex),
                searched: false,
                focused: false,
            })
        }
    })
    return textToView
})

function handleSwitchEditMode(): void {
    if (editMode.value) {
        // 切换到显示模式
        promptList.value = splitTextToPromptView(inputText.value)
        emitUpdateEditor()
    } else {
        // 切换到编辑模式
        inputText.value = joinPrompts(false)
    }
    editMode.value = !editMode.value
}

function handleRemovePrompt(id: string): void {
    promptList.value = promptList.value.filter((item) => item.id !== id)
    emitUpdateEditor()
}

async function handleDeletePrompt(id: string): Promise<void> {
    try {
        await ElMessageBox.confirm('确定删除此提示词？', '删除提示词', {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
        })
        const res = await storage.deletePrompt(id)
        if (res) {
            ElMessage.success('成功删除提示词')
            promptList.value.forEach((item) => {
                if (item.existsID === id) {
                    item.existsID = null
                }
            })
            editingPromptVisible.value = false
        } else {
            ElMessage.error('删除提示词失败')
        }
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error('删除提示词失败')
        }
    }
}

const removeLora = ref(false)
async function handleCopyToClipboard(): Promise<void> {
    let textToCopy = joinPrompts(true)
    if (removeLora.value) {
        textToCopy = removeLoraPrompts(textToCopy)
    }
    const res = await window.api.copyToClipboard(textToCopy)
    if (res) {
        ElMessage.success('已复制到剪贴板')
    } else {
        ElMessage.warning('复制失败，请重试')
    }
}

async function handleToCopySearchText(): Promise<void> {
    if (searchText.value === '') return
    const res = await window.api.copyToClipboard(searchText.value)
    if (res) {
        ElMessage.success('已复制到剪贴板')
    } else {
        ElMessage.warning('复制失败，请重试')
    }
}

async function handleCopyLoraToClipboard(): Promise<void> {
    let textToCopy = joinPrompts(true)
    textToCopy = extractLoraPrompts(textToCopy).join(',')
    const res = await window.api.copyToClipboard(textToCopy)
    if (res) {
        ElMessage.success('Lora提示词已复制到剪贴板')
    } else {
        ElMessage.warning('复制失败，请重试')
    }
}

async function handleAddPrompt(text: string): Promise<void> {
    if (text === BREAK) {
        return
    }
    if (storage.prompts.has(text)) {
        ElMessage.warning('提示词已存在')
        return
    }
    const translation = promptTextTranslations.value[text]
    const result = await storage.addPrompt({
        text,
        translation,
    })
    if (result) {
        const index = promptList.value.findIndex((item) => item.text === text)
        if (index !== -1) {
            promptList.value[index].existsID = result.id
        }
        ElMessage.success('成功添加提示词')
    } else {
        ElMessage.success('添加提示词失败')
    }
}

const editingPromptVisible = ref(false)
const editingPromptID = ref<string | null>(null)

function handleOpenPromptEditor(promptID: string): void {
    if (promptID) {
        editingPromptVisible.value = true
        editingPromptID.value = promptID
    } else {
        ElMessage.warning('提示词不存在')
    }
}

const examplesDialogVisible = ref(false)
function handleOpenExamplesDialog(): void {
    examplesDialogVisible.value = true
}

watchArray(
    () => promptList.value.map((item) => item.existsID).filter((id) => id !== null) as string[],
    (newIDs) => {
        emit('existing-prompt-change', newIDs)
    },
    { immediate: true }
)

async function handleGetTextTranslation(text: string): Promise<string> {
    if (text === BREAK) {
        return ''
    }
    for (const item of storage.prompts.values()) {
        if (item.text === text && item.translation) {
            return item.translation
        }
    }
    const result = await window.api.translateByDeepLX(text)
    if (result) return result
    return ''
}

function splitTextToPromptView(text: string): PromptView[] {
    if (text === '') return []
    const tailBREAK = text.trimEnd().endsWith(BREAK)
    const textLines = text.split(/\s+BREAK\s+/).filter((line) => line !== '')
    const results = [] as PromptView[]
    for (const [index, line] of textLines.entries()) {
        const splitText = splitByCommaPlus(line)
            .filter((item) => item !== '')
            .map((item) => {
                const disabled = item.startsWith(DISABLED_PREFIX)
                if (disabled) {
                    item = item.slice(DISABLED_PREFIX.length)
                }
                const { content, leftBrackets } = stripBrackets(item.trim())
                const { content: text, weight } = stripWeight(content)
                if (leftBrackets.length > 0 && leftBrackets[0] !== '(' && text.includes(',')) {
                    leftBrackets.unshift('(')
                }
                return {
                    id: crypto.randomUUID(),
                    text,
                    leftBrackets,
                    weight,
                    existsID: storage.getPromptIDIfExists(text),
                    disabled,
                }
            })
        results.push(...splitText)
        if (index !== textLines.length - 1) {
            results.push(newBREAK())
        }
    }
    if (tailBREAK) {
        results.push(newBREAK())
    }
    return results
}

function joinPrompts(copy: boolean): string {
    const prompts = promptList.value.filter((item) => !(copy && item.disabled))
    const splitByBREAK = prompts.reduce((acc, item) => {
        if (item.text === BREAK) {
            acc.push([])
        } else {
            if (acc.length === 0) {
                acc.push([item])
            } else {
                acc[acc.length - 1].push(item)
            }
        }
        return acc
    }, [] as PromptView[][])
    const joinEveryLine = splitByBREAK.map((line) => {
        if (line.length === 0) return ''
        return line
            .map(
                (item) =>
                    (item.disabled ? DISABLED_PREFIX : '') +
                    joinBrackets(joinWeight(item.text, item.weight), item.leftBrackets)
            )
            .join(',')
    })

    return joinEveryLine.join(` ${BREAK} \n`)
}

function handleAddBREAK(): void {
    promptList.value.push(newBREAK())
    emitUpdateEditor()
}

// 拖拽tag时显示占位符
const draggingID = ref('')
function onDragStart(event: unknown): void {
    const e = event as DraggableEvent & SortableEvent
    draggingID.value = e.data.id
}
function onDragEnd(): void {
    draggingID.value = ''
}

async function handleAddExample(text: string): Promise<void> {
    const example = await storage.addExample({
        id: crypto.randomUUID(),
        [isPositiveEditor.value ? 'positivePrompt' : 'negativePrompt']: text,
    })
    if (example) {
        ElMessage.success('示例添加成功')
    } else {
        ElMessage.error('添加示例失败')
    }
}
</script>
