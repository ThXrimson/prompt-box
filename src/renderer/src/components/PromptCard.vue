<template>
  <div>
    <el-tooltip
      placement="top-start"
      trigger="hover"
      :show-after="250"
      :hide-after="0"
      :disabled="!Boolean(promptImageFileName)"
    >
      <div
        ref="card"
        class="max-w-100 flex gap-1 justify-between border-1 border-gray-200 rounded-sm p-1.5 transition-all duration-300"
        :class="{
          'bg-orange-400 hover:bg-orange-500': selected,
          'bg-teal-400 hover:bg-teal-500': !selected,
        }"
      >
        <div
          class="flex flex-col gap-0.5 cursor-pointer items-start flex-1 min-w-0"
          @click="handleCopyPrompt(prompt.text)"
        >
          <el-text truncated class="text-white! font-bold self-auto!">
            {{ prompt.text }}
          </el-text>
          <el-text
            truncated
            class="text-teal-100! font-light text-xs! self-auto!"
          >
            {{ prompt.translation === '' ? prompt.text : prompt.translation }}
          </el-text>
        </div>
        <div class="flex items-center gap-1">
          <el-tooltip content="添加到编辑栏" placement="top" :hide-after="0">
            <el-icon
              class="text-white! hover:text-gray-700! cursor-pointer"
              @click="emit('add-to-workspace', prompt.text)"
            >
              <CirclePlus />
            </el-icon>
          </el-tooltip>
          <el-tooltip content="编辑" placement="top" :hide-after="0">
            <el-icon
              class="text-white! hover:text-gray-700! cursor-pointer"
              @click="isPromptEditorVisible = true"
            >
              <Edit />
            </el-icon>
          </el-tooltip>
          <el-popconfirm
            title="确定从标签中移除提示词？"
            :hide-after="0"
            @confirm="emit('remove', prompt.id)"
          >
            <template #reference>
              <el-icon class="text-white! hover:text-gray-700! cursor-pointer">
                <Delete />
              </el-icon>
            </template>
          </el-popconfirm>
        </div>
      </div>
      <template #content>
        <div v-if="promptImageFileName">
          <el-image
            :src="getImageUrl(promptImageFileName)"
            class="w-40 object-cover rounded-md cursor-pointer hover:shadow-lg transition-shadow duration-300 self-center-safe"
            fit="scale-down"
            loading="lazy"
          />
        </div>
      </template>
    </el-tooltip>

    <!--编辑提示词对话框-->
    <el-dialog
      v-model="isPromptEditorVisible"
      title="编辑提示词"
      append-to-body
      class="w-auto! h-auto! mx-10! mt-10! mb-0!"
      @keyup.esc.stop.prevent="isPromptEditorVisible = false"
    >
      <prompt-editor :prompt-i-d="prompt.id" />
      <template #footer>
        <el-button
          type="danger"
          class="w-full"
          @click="handleDeletePrompt(prompt.id)"
        >
          删除
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { getImageUrl } from '@renderer/utils/utils'
import { CirclePlus, Delete, Edit } from '@element-plus/icons-vue'
import type { Prompt } from '@shared/types'
import { ref, useTemplateRef } from 'vue'
import { useStorage } from '@renderer/stores/storage'
import { ElMessageBox } from 'element-plus'

const props = defineProps<{
  prompt: Prompt
  selected: boolean
  promptImageFileName?: string
}>()

const emit = defineEmits<{
  (e: 'add-to-workspace', promptText: string): void
  (e: 'remove', promptID: string): void
}>()

const cardRef = useTemplateRef('card')
defineExpose({
  glow(): void {
    cardRef.value?.classList.add('glowing-bg')
    setTimeout(() => {
      cardRef.value?.classList.remove('glowing-bg')
    }, 1000)
  },
  promptText: props.prompt.text,
})

const storage = useStorage()

const isPromptEditorVisible = ref(false)

function handleCopyPrompt(promptText: string): void {
  window.api.copyToClipboard(promptText).then((res) => {
    if (res) {
      ElMessage.success('已复制到剪贴板')
    } else {
      ElMessage.error('复制失败，请重试')
    }
  })
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
      isPromptEditorVisible.value = false
    } else {
      ElMessage.error('删除提示词失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除提示词失败')
    }
  }
}
</script>

<style lang="css" scoped>
@reference 'tailwindcss';

.glowing-bg {
  @apply bg-blue-400;
}
</style>
