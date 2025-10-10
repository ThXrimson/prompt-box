<template>
  <div
    ref="tag-card"
    class="tag-collection h-full flex flex-col gap-1.5 border-2 border-gray-200 rounded-lg p-2 pr-0 [&>*]:mr-2 bg-white"
  >
    <div class="header flex justify-between gap-0.5">
      <el-text class="font-bold">{{ tag.text }}</el-text>
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
      always
      class="mr-0!"
      view-class="prompt-container flex flex-wrap gap-1.5 min-w-60 pr-2.5"
    >
      <prompt-card
        v-for="prompt in promptView"
        :key="prompt.id"
        :ref="promptCards.set"
        :prompt="prompt"
        :selected="Boolean(existingPromptIDs?.has(prompt.id))"
        :prompt-image-file-name="promptImageFileName[prompt.id]"
        @add-to-workspace="emit('add-to-workspace', $event)"
        @remove="handleRemovePromptFromTag($event)"
      />
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { Tag } from '@shared/types'
import { UNCATEGORIZED_TAG_ID, useStorage } from '@renderer/stores/storage'
import {
  pinyinIncludes,
  pinyinIncludesWithFirstLetter,
} from '@renderer/utils/pinyin-includes'
import PromptCard from '@renderer/components/PromptCard.vue'
import { Plus } from '@element-plus/icons-vue'
import { ElInput } from 'element-plus'
import { useTemplateRefsList } from '@vueuse/core'

const props = defineProps<{
  tag: Tag
  existingPromptIDs?: Set<string>
}>()

const emit = defineEmits<{
  (e: 'add-to-workspace', promptText: string): void
}>()

const promptCards = useTemplateRefsList<InstanceType<typeof PromptCard>>()

const storage = useStorage()

const promptInput = ref<string>('')
const editPromptDialogVisible = ref(false)
const editingPromptID = ref<string | null>(null)
const prompts = computed(() => {
  return storage.getPromptsByTag(props.tag.id)
})
const promptView = computed(() => {
  const filtered = prompts.value.filter(
    (prompt) =>
      prompt.text.toLowerCase().includes(promptInput.value.toLowerCase()) ||
      (Boolean(prompt.translation) &&
        (prompt.translation
          .toLowerCase()
          .includes(promptInput.value.toLowerCase()) ||
          pinyinIncludes(prompt.translation, promptInput.value) ||
          pinyinIncludesWithFirstLetter(prompt.translation, promptInput.value)))
  )
  const existingPromptIDsSet = props.existingPromptIDs || new Set<string>()

  return filtered.sort((a, b) => {
    const aExists = existingPromptIDsSet.has(a.id)
    const bExists = existingPromptIDsSet.has(b.id)
    if (aExists == bExists) {
      return a.text.localeCompare(b.text)
    } else if (aExists && !bExists) {
      return -1
    } else if (!aExists && bExists) {
      return 1
    } else {
      return 0
    }
  })
})
const promptImageFileName = computed(() => {
  const promptIDToImageURL = {} as Record<string, string>
  for (const prompt of promptView.value) {
    for (const exampleID of prompt.exampleIDs) {
      const images = storage.getImagesByExampleID(exampleID)
      if (images.length > 0) {
        promptIDToImageURL[prompt.id] = images[0].fileName
        break
      }
    }
  }
  return promptIDToImageURL
})

defineExpose({
  scrollPromptIntoView: async (prompt: string) => {
    promptInput.value = ''
    await nextTick()
    const promptElement = promptCards.value?.find(
      (p) => p.promptText === prompt
    )
    if (promptElement) {
      promptElement.$el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      })
      promptElement?.glow()
    }
  },
})

async function handleAddPrompt(): Promise<void> {
  promptInput.value = promptInput.value.trim()
  if (promptInput.value === '') {
    return
  }
  if (prompts.value.some((p) => p.text === promptInput.value)) {
    return
  }
  for (const prompt of storage.prompts.values()) {
    if (prompt.text === promptInput.value) {
      const success = await storage.updatePromptTags(prompt.id, [
        props.tag.id,
        ...prompt.tagIDs,
      ])
      if (success) {
        ElMessage.success(`提示词已存在，并添加到标签: ${props.tag.text}`)
      } else {
        ElMessage.error('添加提示词时更新标签失败')
      }
      return
    }
  }
  const tags: string[] = []
  if (props.tag.id !== UNCATEGORIZED_TAG_ID) {
    tags.push(props.tag.id)
  }
  const newPrompt = await storage.addPrompt({
    text: promptInput.value.trim(),
    tagIDs: tags,
  })
  if (newPrompt) {
    ElMessage.success(`新增提示词并添加成功: ${newPrompt.text}`)
  } else {
    ElMessage.error('新增提示词并添加失败')
  }
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
async function handleRemovePromptFromTag(promptID: string): Promise<void> {
  const res = await storage.deleteTagIDFromPrompt(props.tag.id, promptID)
  if (res) {
    ElMessage.success('提示词移除成功')
  } else {
    ElMessage.error('提示词移除失败')
  }
}
</script>

<style lang="css" scoped>
@reference 'tailwindcss';

.tag-collection {
  transition: border-color 0.3s ease-in-out;
}
</style>
