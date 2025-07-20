<template>
  <div
    ref="tagCard"
    class="tag-collection h-full min-w-40 w-40 flex flex-col gap-1.5 border-2 border-gray-200 rounded-lg p-2 bg-white"
  >
    <div class="drag-handle grid justify-center-safe hover:cursor-pointer">
      <drag-handle
        width="2rem"
        stroke="#99a1af"
        stroke-width="1"
        class="pointer-events-none"
      />
    </div>
    <div class="header flex justify-between gap-0.5">
      <el-text class="font-bold">{{ tag.text }}</el-text>
      <div class="flex items-center gap-1 [&_button]:m-0!">
        <el-tooltip content="删除标签" placement="top" :hide-after="0">
          <el-button link :icon="Delete" @click="emit('delete', clone(tag))" />
        </el-tooltip>
        <el-tooltip content="关闭标签" placement="top" :hide-after="0">
          <el-button link :icon="Close" @click="emit('close', clone(tag))" />
        </el-tooltip>
      </div>
    </div>
    <div class="add-prompt-wrapper">
      <el-input
        v-model="promptInput"
        placeholder="添加或筛选"
        clearable
        @keyup.enter="handleAddPrompt"
      >
        <template #prefix>
          <el-button :icon="Plus" link @click="handleAddPrompt" />
        </template>
      </el-input>
    </div>
    <el-scrollbar
      view-class="prompt-container flex flex-col flex-1 min-h-0 gap-1.5"
    >
      <div v-for="prompt in promptView" :key="prompt.id" class="prompt-wrapper">
        <div
          class="flex justify-between w-full border-1 border-gray-200 bg-teal-400 rounded-sm p-1.5 hover:bg-teal-500 transition-all duration-300"
        >
          <el-tooltip
            :content="
              prompt.text +
              (prompt.translation ? ` (${prompt.translation})` : '')
            "
            placement="top-start"
            trigger="hover"
            :hide-after="0"
          >
            <el-text
              truncated
              class="cursor-pointer text-white! font-bold"
              @click="handleCopyPrompt(prompt.text)"
            >
              {{ prompt.text }}
            </el-text>
          </el-tooltip>
          <div class="flex items-center gap-1">
            <el-tooltip content="添加到编辑栏" placement="top" :hide-after="0">
              <el-icon
                class="text-white! hover:text-gray-700! cursor-pointer"
                @click="emit('add-to-workspace', cloneDeep(prompt))"
              >
                <Pointer />
              </el-icon>
            </el-tooltip>
            <el-tooltip content="编辑" placement="top" :hide-after="0">
              <el-icon
                class="text-white! hover:text-gray-700! cursor-pointer"
                @click="handleEditPrompt(prompt.id)"
              >
                <Edit />
              </el-icon>
            </el-tooltip>
            <el-tooltip
              content="从标签中删除提示词"
              placement="top"
              :hide-after="0"
            >
              <el-icon
                class="text-white! hover:text-gray-700! cursor-pointer"
                @click="handleDeletePrompt(prompt.id)"
              >
                <Delete />
              </el-icon>
            </el-tooltip>
          </div>
        </div>
      </div>
    </el-scrollbar>
  </div>

  <el-dialog
    v-if="editPromptDialogVisible && editingPromptID !== null"
    v-model="editPromptDialogVisible"
    title="编辑 Prompt"
    append-to-body
    class="w-auto! h-auto! mx-10! mt-10! mb-0!"
  >
    <prompt-editor :prompt-id="editingPromptID" />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, Close } from '@element-plus/icons-vue'
import DragHandle from '../icons/DragHandle.vue'
import { Pointer, Edit, Delete } from '@element-plus/icons-vue'
import type { Prompt, Tag } from '@shared/types'
import { useStorage } from '@renderer/stores/storage'
import { clone, cloneDeep } from 'lodash'

const props = defineProps<{
  tag: Tag
}>()

const emit = defineEmits<{
  (e: 'delete', tag: Tag): void
  (e: 'close', tag: Tag): void
  (e: 'add-to-workspace', prompt: Prompt): void
}>()

const storage = useStorage()

const promptInput = ref<string>('')
const editPromptDialogVisible = ref(false)
const editingPromptID = ref<string | null>(null)
const prompts = computed(() => {
  return storage.getPromptsByTag(props.tag.id)
})
const promptView = computed(() => {
  return prompts.value
    .filter((prompt) =>
      prompt.text.toLowerCase().includes(promptInput.value.toLowerCase())
    )
    .toSorted((a, b) => a.text.localeCompare(b.text))
})

async function handleAddPrompt(): Promise<void> {
  if (promptInput.value.trim() === '') {
    return
  }
  if (prompts.value.some((p) => p.text === promptInput.value.trim())) {
    return
  }
  for (const prompt of storage.prompts.values()) {
    if (prompt.text === promptInput.value.trim()) {
      const success = await storage.updatePromptTags(prompt.id, [
        props.tag.id,
        ...prompt.tagIDs,
      ])
      if (success) {
        ElMessage.success(`提示词已存在，并添加到标签: ${props.tag.text}`)
        promptInput.value = ''
      } else {
        ElMessage.error('添加提示词时更新标签失败')
      }
      return
    }
  }
  const newPrompt = await storage.addPrompt({
    id: crypto.randomUUID(),
    text: promptInput.value,
  })
  if (newPrompt) {
    const success = await storage.updatePromptTags(newPrompt.id, [props.tag.id])
    if (success) {
      ElMessage.success(`新增提示词并添加成功: ${newPrompt}`)
      promptInput.value = ''
    } else {
      ElMessage.error('新增提示词并添加失败')
    }
  } else {
    ElMessage.error('新增提示词并添加失败')
  }
}

function handleEditPrompt(promptID: string): void {
  editingPromptID.value = promptID
  editPromptDialogVisible.value = true
}
watch(
  editPromptDialogVisible,
  (newValue) => {
    if (!newValue) {
      editingPromptID.value = null
    }
  },
  { immediate: true }
)

function handleCopyPrompt(promptText: string): void {
  window.api.copyToClipboard(promptText).then((res) => {
    if (res) {
      ElMessage.success('已复制到剪贴板')
    } else {
      ElMessage.error('复制失败，请重试')
    }
  })
}

async function handleDeletePrompt(promptID: string): Promise<void> {
  const res = await storage.deleteTagIDFromPrompt(props.tag.id, promptID)
  if (res) {
    ElMessage.success('提示词删除成功')
  } else {
    ElMessage.error('提示词删除失败')
  }
}
</script>

<style lang="css" scoped>
@reference 'tailwindcss';

.prompt-fallback {
  @apply opacity-100!;
  .el-button {
    @apply bg-blue-50 text-blue-500 border-blue-400 border-1;
  }
}
</style>
