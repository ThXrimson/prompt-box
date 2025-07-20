<template>
  <div class="flex gap-2 bg-white p-3 rounded-lg shadow-md h-30">
    <div class="flex flex-col gap-2 justify-center-safe">
      <div class="flex gap-2 justify-center-safe flex-1">
        <el-tooltip
          content="添加为示例"
          :enterable="false"
          placement="top-end"
          :hide-after="0"
        >
          <el-button
            :icon="Plus"
            class="flex-1 m-0! h-full!"
            @click="
              emit(
                'add-example',
                promptList.map((item) => item.text).join(', ')
              )
            "
          />
        </el-tooltip>
        <el-tooltip
          content="选择示例为模板"
          :enterable="false"
          placement="top-end"
          :hide-after="0"
        >
          <el-button :icon="Star" class="flex-1 m-0! h-full!" />
        </el-tooltip>
      </div>
      <div class="flex gap-2 justify-center-safe flex-1">
        <el-tooltip
          content="撤销"
          :enterable="false"
          placement="top-end"
          :hide-after="0"
        >
          <el-button
            :icon="Back"
            :disabled="!canUndo"
            class="flex-1 m-0! h-full!"
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
            class="flex-1 m-0! h-full!"
            @click="handleRedoEditor"
          />
        </el-tooltip>
      </div>
    </div>

    <!-- 编辑框 -->
    <el-input
      v-if="editMode"
      v-model="inputText"
      type="textarea"
      resize="none"
      :rows="5"
      class="example-input"
    />
    <el-scrollbar
      v-else
      class="border-none shadow-[0_0_0_1px_#e4e7ed] rounded-lg flex-1"
    >
      <div class="h-full">
        <vue-draggable
          v-model="promptList"
          :animation="100"
          class="flex flex-wrap gap-2 p-2"
        >
          <el-dropdown
            v-for="item in promptList"
            :key="item.id"
            trigger="click"
          >
            <el-tag
              type="primary"
              size="small"
              disable-transitions
              closable
              class="cursor-pointer"
              @close="handleDeletePrompt(item.id)"
            >
              {{ item.text }}
            </el-tag>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleAddBrackets(item.id)">
                  添加圆括号
                </el-dropdown-item>
                <el-dropdown-item @click="handleAddSquareBrackets(item.id)">
                  添加方括号
                </el-dropdown-item>
                <el-dropdown-item @click="handleAddAngleBrackets(item.id)">
                  添加尖括号
                </el-dropdown-item>
                <el-dropdown-item @click="handleDeleteOnePairBrackets(item.id)">
                  删除一对括号
                </el-dropdown-item>
                <el-dropdown-item @click="handleDeleteAllBrackets(item.id)">
                  清除所有括号
                </el-dropdown-item>
                <el-dropdown-item
                  divided
                  @click="handleAddWeightToPrompt(item.id, 0.1)"
                >
                  加 0.1 权重
                </el-dropdown-item>
                <el-dropdown-item
                  @click="handleAddWeightToPrompt(item.id, -0.1)"
                >
                  减 0.1 权重
                </el-dropdown-item>
                <el-dropdown-item @click="handleClearWeightOfPrompt(item.id)">
                  清除权重
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </vue-draggable>
      </div>
    </el-scrollbar>

    <div class="flex flex-col gap-2 justify-center-safe">
      <el-tooltip
        :content="!editMode ? '编辑模式' : '显示模式'"
        :enterable="false"
        placement="top-start"
        :hide-after="0"
      >
        <el-button
          :icon="Edit"
          :type="!editMode ? 'default' : 'success'"
          class="flex-1 m-0!"
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
          class="flex-1 m-0!"
          @click="handleCopyToClipboard"
        />
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Edit,
  CopyDocument,
  Star,
  Plus,
  Back,
  Right,
} from '@element-plus/icons-vue'
import { ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { addWeight, clearWeight } from '@renderer/utils/editWeight'
import { useManualRefHistory } from '@vueuse/core'
import { cloneDeep } from 'lodash'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'add-example', text: string): void
}>()

const inputText = ref('')

const editMode = ref(false)

const promptList = ref<{ id: string; text: string }[]>([])
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      promptList.value = splitText(newValue)
    } else {
      promptList.value = []
    }
  },
  { immediate: true }
)
defineExpose({
  addText: (text: string) => {
    promptList.value.push({ id: crypto.randomUUID(), text: text.trim() })
    inputText.value = ''
    emit(
      'update:modelValue',
      promptList.value.map((item) => item.text).join(', ')
    )
  },
})

const { undo, redo, canUndo, canRedo } = useManualRefHistory(promptList, {
  clone: cloneDeep,
})

function handleSwitchEditMode(): void {
  if (editMode.value) {
    // 切换到显示模式
    promptList.value = splitText(inputText.value)
    emit(
      'update:modelValue',
      promptList.value.map((item) => item.text).join(', ')
    )
  } else {
    // 切换到编辑模式
    inputText.value = promptList.value.map((item) => item.text).join(', ')
  }
  editMode.value = !editMode.value
}

function handleDeletePrompt(id: string): void {
  promptList.value = promptList.value.filter((item) => item.id !== id)
  emit(
    'update:modelValue',
    promptList.value.map((item) => item.text).join(', ')
  )
}

async function handleCopyToClipboard(): Promise<void> {
  const textToCopy = promptList.value.map((item) => item.text).join(', ')
  const res = await window.api.copyToClipboard(textToCopy)
  if (res) {
    ElMessage.success('已复制到剪贴板')
  } else {
    ElMessage.warning('复制失败，请重试')
  }
}

function handleAddBrackets(id: string): void {
  const item = promptList.value.find((item) => item.id === id)
  if (item) {
    item.text = `(${item.text})`
    emit(
      'update:modelValue',
      promptList.value.map((item) => item.text).join(', ')
    )
  }
}

function handleAddSquareBrackets(id: string): void {
  const item = promptList.value.find((item) => item.id === id)
  if (item) {
    item.text = `[${item.text}]`
    emit(
      'update:modelValue',
      promptList.value.map((item) => item.text).join(', ')
    )
  }
}

function handleAddAngleBrackets(id: string): void {
  const item = promptList.value.find((item) => item.id === id)
  if (item) {
    item.text = `<${item.text}>`
    emit(
      'update:modelValue',
      promptList.value.map((item) => item.text).join(', ')
    )
  }
}

function handleDeleteOnePairBrackets(id: string): void {
  const item = promptList.value.find((item) => item.id === id)
  if (item) {
    item.text = item.text
      .replace(/^\((.*)\)$/, '$1')
      .replace(/^\[(.*)\]$/, '$1')
    emit(
      'update:modelValue',
      promptList.value.map((item) => item.text).join(', ')
    )
  }
}

function handleDeleteAllBrackets(id: string): void {
  const item = promptList.value.find((item) => item.id === id)
  if (item) {
    // eslint-disable-next-line no-useless-escape
    item.text = item.text.replace(/([\(\[]+)(.*?)([\)\]]+)/g, '$2')
    emit(
      'update:modelValue',
      promptList.value.map((item) => item.text).join(', ')
    )
  }
}

function handleAddWeightToPrompt(id: string, delta: number): void {
  const item = promptList.value.find((item) => item.id === id)
  if (item) {
    item.text = addWeight(item.text, delta)
    emit(
      'update:modelValue',
      promptList.value.map((item) => item.text).join(', ')
    )
  }
}

function handleClearWeightOfPrompt(id: string): void {
  const item = promptList.value.find((item) => item.id === id)
  if (item) {
    item.text = clearWeight(item.text)
    emit(
      'update:modelValue',
      promptList.value.map((item) => item.text).join(', ')
    )
  }
}

function handleUndoEditor(): void {
  undo()
  console.log(promptList.value)
  emit(
    'update:modelValue',
    promptList.value.map((item) => item.text).join(', ')
  )
}

function handleRedoEditor(): void {
  redo()
  console.log(promptList.value)
  emit(
    'update:modelValue',
    promptList.value.map((item) => item.text).join(', ')
  )
}

function splitText(text: string): { id: string; text: string }[] {
  return text.split(',').map((item) => {
    return {
      id: crypto.randomUUID(),
      text: item.trim(),
    }
  })
}
</script>
