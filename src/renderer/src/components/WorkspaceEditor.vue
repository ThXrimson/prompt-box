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
        <el-button size="small" class="ml-0!" @click="handleEditPromptAddCurly"
          >+()</el-button
        >
        <el-button size="small" class="ml-0!" @click="handleEditPromptAddSquare"
          >+[]</el-button
        >
        <el-button size="small" class="ml-0!" @click="handleEditPromptAddAngle"
          >+&lt;&gt;</el-button
        >
        <el-button size="small" class="ml-0!" @click="handleEditPromptDelete"
          >-()|[]|&lt;&gt;</el-button
        >
        <el-button size="small" class="ml-0!" @click="handleEditPromptClear"
          >括号清空</el-button
        >
        <el-button size="small" class="ml-0!" @click="handleEditPromptAdd"
          >+0.1</el-button
        >
        <el-button size="small" class="ml-0!" @click="handleEditPromptMinus"
          >-0.1</el-button
        >
        <el-button size="small" class="ml-0!" @click="handleEditPromptZero"
          >权重清零</el-button
        >
      </div>
      <el-input
        ref="promptEditorInput"
        v-model="editingPromptText"
        placeholder="编辑提示词"
        @keyup.enter="handleConfirmEditPrompt"
      />
    </div>
    <template #footer>
      <el-button type="primary" @click="handleConfirmEditPrompt">
        确定
      </el-button>
      <el-button @click="isEditingPromptText = false"> 取消 </el-button>
    </template>
  </el-dialog>
  <!-- 可拖动的handle -->
  <div
    ref="dragHandleRef"
    class="h-1 cursor-ns-resize rounded-t-lg flex items-center justify-center hover:[&>div]:bg-gray-600"
    @mousedown="startDragging"
  >
    <div class="w-8 h-0.5 bg-gray-400 rounded"></div>
  </div>
  <!-- 编辑框容器 -->
  <div
    ref="containerRef"
    class="flex flex-col bg-white rounded-lg shadow-md min-h-50"
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
              :animation="100"
              class="flex flex-wrap gap-1 gap-y-0 p-2"
            >
              <div v-for="item in promptList" :key="item.id">
                <el-tooltip placement="bottom" :hide-after="0">
                  <template #content>
                    点击编辑该词
                    <br />
                    按住拖动顺序
                  </template>
                  <el-dropdown
                    trigger="hover"
                    size="small"
                    placement="top"
                    :hide-on-click="false"
                  >
                    <el-tag
                      :type="
                        item.disabled
                          ? 'info'
                          : item.existsID !== null
                            ? 'success'
                            : 'primary'
                      "
                      size="small"
                      disable-transitions
                      closable
                      class="cursor-pointer"
                      :class="item.disabled ? 'line-through' : ''"
                      @click="handleEditPrompt(item.id)"
                      @close="handleRemovePrompt(item.id)"
                    >
                      <!-- {{ promptTextView[item.text] }} -->
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
                      <el-dropdown-menu>
                        <el-dropdown-item @click="handleAddPrompt(item.text)">
                          收藏提示词
                        </el-dropdown-item>
                        <el-dropdown-item
                          :disabled="item.existsID === null"
                          @click="handleOpenPromptEditor(item.existsID!)"
                        >
                          编辑提示词
                        </el-dropdown-item>
                        <el-dropdown-item
                          @click="item.disabled = !item.disabled"
                        >
                          {{ item.disabled ? '启用' : '禁用' }}提示词
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </el-tooltip>
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
            <el-button
              :icon="Plus"
              @click="emit('add-example', joinPrompts())"
            />
          </el-tooltip>
          <el-tooltip
            content="选择示例为模板"
            :enterable="false"
            placement="top-end"
            :hide-after="0"
          >
            <el-button
              :icon="Star"
              class="m-0!"
              @click="handleOpenExamplesDialog"
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
          <el-tooltip
            content="撤销"
            :enterable="false"
            placement="top-end"
            :hide-after="0"
          >
            <el-button
              :icon="Back"
              :disabled="!canUndo"
              class="m-0!"
              @click="handleUndoEditor"
            />
          </el-tooltip>
          <el-tooltip
            content="重做"
            :enterable="false"
            placement="top-end"
            :hide-after="0"
          >
            <el-button
              :icon="Right"
              :disabled="!canRedo"
              class="m-0!"
              @click="handleRedoEditor"
            />
          </el-tooltip>
        </div>

        <el-input
          v-model="searchText"
          placeholder="搜索或添加"
          :prefix-icon="Search"
          clearable
          @keyup.enter="handleAddPromptToEditor"
        >
          <template #suffix>
            <el-icon
              class="cursor-pointer"
              @click.stop="handleAddPromptToEditor"
            >
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
  >
    <prompt-editor :prompt-i-d="editingPromptID" />
    <template #footer>
      <el-popconfirm
        title="确定删除此提示词？"
        :hide-after="0"
        @confirm="
          () => {
            handleDeletePrompt(editingPromptID!)
            editingPromptVisible = false
          }
        "
      >
        <template #reference>
          <el-button type="danger" class="w-full"> 删除 </el-button>
        </template>
      </el-popconfirm>
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
// TODO 添加从示例添加提示词的功能，和撤回和重做的功能
// TODO 点击tag有添加prompt功能

// TODO 搜索框
// 3、enter键跳转到下一个搜索，当前focus的搜索为红色高亮

// FIXME 编辑提示词后，tag里没有更新
import {
  Edit,
  CopyDocument,
  Star,
  Plus,
  Back,
  Right,
  Search,
} from '@element-plus/icons-vue'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useManualRefHistory, watchArray } from '@vueuse/core'
import { cloneDeep } from 'lodash'
import { useStorage } from '@renderer/stores/storage'
import {
  stripWeight,
  joinWeight,
  LeftBracket,
  stripBrackets,
  joinBrackets,
  weightAdd,
} from '@renderer/utils/utils'
import EnterIcon from '@renderer/icons/Enter.vue'
import Examples from '@renderer/views/Examples.vue'
import { ElInput } from 'element-plus'
import { useBracketsWrapElInput } from '@renderer/hooks/useBracketsWrapElInput'

const props = defineProps<{
  modelValue: string
}>()

const storage = useStorage()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'add-example', text: string): void
  (e: 'existing-prompt-change', existingIDs: string[]): void
}>()

// 使输入框可以成对输入括号的功能
const promptEditorInput =
  useTemplateRef<InstanceType<typeof ElInput>>('promptEditorInput')
const handleOpenEditDialog = (): void => {
  useBracketsWrapElInput(promptEditorInput)
  promptEditorInput.value?.focus()
}

const inputText = ref('')
const editMode = ref(false)

// 是否正在编辑提示词
const isEditingPromptText = ref(false)
const editingPromptTextID = ref<string | null>(null)
const editingPromptText = ref('')

function handleEditPrompt(id: string): void {
  const p = promptList.value.find((item) => item.id === id)
  if (p) {
    editingPromptTextID.value = id
    const showText = joinBrackets(joinWeight(p.text, p.weight), p.leftBrackets)
    editingPromptText.value = showText
    isEditingPromptText.value = true
  }
}

function handleConfirmEditPrompt(): void {
  if (!editingPromptText.value.trim()) return
  const item = promptList.value.find(
    (item) => item.id === editingPromptTextID.value
  )
  if (item) {
    const showText = editingPromptText.value.trim()
    const stripBracketsRes = stripBrackets(showText)
    const stripWeightRes = stripWeight(stripBracketsRes.content)
    item.text = stripWeightRes.content
    item.weight = stripWeightRes.weight
    item.leftBrackets = stripBracketsRes.leftBrackets
    emit('update:modelValue', joinPrompts())
    isEditingPromptText.value = false
  }
}

function handleEditPromptAddCurly(): void {
  editingPromptText.value = `(${editingPromptText.value})`
}

function handleEditPromptAddSquare(): void {
  editingPromptText.value = `[${editingPromptText.value}]`
}

function handleEditPromptAddAngle(): void {
  editingPromptText.value = `<${editingPromptText.value}>`
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
  editingPromptText.value = joinBrackets(
    joinWeight(stripWeightRes.content, newWeight),
    stripBracketsRes.leftBrackets
  )
}

function handleEditPromptMinus(): void {
  const stripBracketsRes = stripBrackets(editingPromptText.value)
  const stripWeightRes = stripWeight(stripBracketsRes.content)
  const newWeight = weightAdd(stripWeightRes.weight, -0.1)
  editingPromptText.value = joinBrackets(
    joinWeight(stripWeightRes.content, newWeight),
    stripBracketsRes.leftBrackets
  )
}

function handleEditPromptZero(): void {
  const stripBracketsRes = stripBrackets(editingPromptText.value)
  const stripWeightRes = stripWeight(stripBracketsRes.content)
  editingPromptText.value = joinBrackets(
    stripWeightRes.content,
    stripBracketsRes.leftBrackets
  )
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
const startDragging = (event: MouseEvent): void => {
  isDragging.value = true
  startY.value = event.clientY
  startHeight.value = containerHeight.value

  document.addEventListener('mousemove', onDragging)
  document.addEventListener('mouseup', stopDragging)
  document.body.style.userSelect = 'none'
  event.preventDefault()
}

const onDragging = (event: MouseEvent): void => {
  if (!isDragging.value) return

  const deltaY = startY.value - event.clientY
  // 最高 800px，最低 150px
  const newHeight = Math.max(150, Math.min(800, startHeight.value + deltaY))
  containerHeight.value = newHeight
}

const stopDragging = (): void => {
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
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      promptList.value = splitTextToPromptView(newValue)
    } else {
      promptList.value = []
    }
  },
  { immediate: true }
)
defineExpose({
  addText: (text: string) => {
    promptList.value.push({
      id: crypto.randomUUID(),
      text: text.trim(),
      leftBrackets: [],
      weight: '',
      existsID: storage.getPromptIDIfExists(text.trim()),
      disabled: false,
    })
    inputText.value = ''
    emit('update:modelValue', joinPrompts())
  },
})

const { undo, redo, canUndo, canRedo } = useManualRefHistory(promptList, {
  clone: cloneDeep,
})

const promptTextTranslations = ref<Record<string, string>>({})
watchArray(
  () => promptList.value.map(({ text }) => text),
  (_newArr, _oldArr, added) => {
    added.forEach(async (text) => {
      const translation = await handleGetTextTranslation(text)
      if (translation) {
        promptTextTranslations.value[text] = translation
      }
    })
    emit('update:modelValue', joinPrompts())
  },
  {
    immediate: true,
    deep: true,
  }
)

type TextPart = {
  id: string
  text: string
  searched: boolean
  focused: boolean
}

const searchText = ref('')

const handleAddPromptToEditor = (): void => {
  const text = searchText.value.trim()
  if (text === '') return
  promptList.value.push({
    id: crypto.randomUUID(),
    text,
    leftBrackets: [],
    weight: '',
    existsID: storage.getPromptIDIfExists(text),
    disabled: false,
  })
  searchText.value = ''
  emit('update:modelValue', joinPrompts())
}

const promptTextView = computed(() => {
  const regex = new RegExp(searchText.value, 'ig')

  const textToView: Record<string, TextPart[]> = {}
  promptList.value.forEach((item) => {
    let text = item.text
    text = joinBrackets(joinWeight(item.text, item.weight), item.leftBrackets)
    if (promptTextTranslations.value[item.text]) {
      text += `| ${promptTextTranslations.value[item.text]}`
    }
    const matchesIndices = Array.from(text.matchAll(regex)).map(
      (match) => match.index
    )

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
    emit('update:modelValue', joinPrompts())
  } else {
    // 切换到编辑模式
    inputText.value = joinPrompts()
  }
  editMode.value = !editMode.value
}

function handleRemovePrompt(id: string): void {
  promptList.value = promptList.value.filter((item) => item.id !== id)
  emit('update:modelValue', joinPrompts())
}

async function handleDeletePrompt(id: string): Promise<void> {
  const res = await storage.deletePrompt(id)
  if (res) {
    ElMessage.success('成功删除提示词')
    promptList.value.forEach((item) => {
      if (item.existsID === id) {
        item.existsID = null
      }
    })
  } else {
    ElMessage.error('删除提示词失败')
  }
}

async function handleCopyToClipboard(): Promise<void> {
  const textToCopy = joinPrompts()
  const res = await window.api.copyToClipboard(textToCopy)
  if (res) {
    ElMessage.success('已复制到剪贴板')
  } else {
    ElMessage.warning('复制失败，请重试')
  }
}

function handleUndoEditor(): void {
  undo()
  emit('update:modelValue', joinPrompts())
}

function handleRedoEditor(): void {
  redo()
  emit('update:modelValue', joinPrompts())
}

async function handleAddPrompt(text: string): Promise<void> {
  for (const p of storage.prompts.values()) {
    if (p.text === text) {
      ElMessage.warning('提示词已存在')
      return
    }
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
  () =>
    promptList.value
      .map((item) => item.existsID)
      .filter((id) => id !== null) as string[],
  (newIDs) => {
    emit('existing-prompt-change', newIDs)
  },
  { immediate: true }
)

async function handleGetTextTranslation(text: string): Promise<string> {
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
  return text
    .split(',')
    .filter((item) => item !== '')
    .map((item) => {
      const { content, leftBrackets } = stripBrackets(item.trim())
      const { content: text, weight } = stripWeight(content)
      return {
        id: crypto.randomUUID(),
        text,
        leftBrackets,
        weight,
        existsID: storage.getPromptIDIfExists(text),
        disabled: false,
      }
    })
}

function joinPrompts(): string {
  return promptList.value
    .filter((item) => !item.disabled)
    .map((item) =>
      joinBrackets(joinWeight(item.text, item.weight), item.leftBrackets)
    )
    .join(', ')
}
</script>
