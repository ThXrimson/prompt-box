<template>
  <div class="my-2 mx-2 flex-1 min-h-0 min-w-0 flex flex-col">
    <navigator>
      <div class="flex gap-2 justify-between">
        <el-tooltip content="排序" placement="bottom-start" :hide-after="0">
          <el-dropdown trigger="click">
            <el-button :icon="Sort" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleSortByText">
                  <el-text :class="{ 'text-blue-400!': sortType === 'text' }">
                    {{ `名称${sortByTextAsc ? '升序' : '降序'}` }}
                  </el-text>
                </el-dropdown-item>
                <el-dropdown-item @click="handleSortByTime">
                  <el-text :class="{ 'text-blue-400!': sortType === 'time' }">
                    {{ `时间${sortByTimeAsc ? '升序' : '降序'}` }}
                  </el-text>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-tooltip>
        <el-tooltip content="管理标签" placement="bottom-start" :hide-after="0">
          <el-button :icon="Discount" @click="tagDialogVisible = true" />
        </el-tooltip>
        <el-dialog v-if="tagDialogVisible" v-model="tagDialogVisible">
          <tag-editor />
        </el-dialog>

        <el-select-v2
          v-model="filteredTagIDs"
          :options="Array.from(storage.tags.values())"
          :props="{
            label: 'text',
            value: 'id',
          }"
          filterable
          placeholder="过滤标签"
          style="width: 240px"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          :reserve-keyword="false"
        />

        <el-input v-model="searchTerm" placeholder="搜索提示词">
          <template #prefix>
            <el-icon class="cursor-pointer">
              <Search />
            </el-icon>
          </template>
        </el-input>
      </div>
    </navigator>

    <div class="flex justify-between gap-1 w-full mt-2 flex-1 min-h-0">
      <el-scrollbar
        class="bg-white border-2 border-gray-200 rounded-lg p-3"
        view-class="flex flex-col w-50"
      >
        <el-button
          v-if="!creatingPrompt"
          type="success"
          :icon="CirclePlusFilled"
          class="flex w-full h-[30px] py-1 px-2"
          @click="handleAddPrompt"
        >
          添加提示词
        </el-button>
        <el-input
          v-else
          v-model="newPromptText"
          autofocus
          @keyup.enter="handleConfirmAddPrompt"
          @keyup.esc="handleCancelAddPrompt"
        >
          <template #suffix>
            <div class="flex items-center gap-1">
              <el-icon
                class="cursor-pointer hover:text-gray-500!"
                @click="handleConfirmAddPrompt"
              >
                <Check />
              </el-icon>
              <el-icon
                class="cursor-pointer hover:text-gray-500!"
                @click="handleCancelAddPrompt"
              >
                <Close />
              </el-icon>
            </div>
          </template>
        </el-input>

        <el-divider class="my-2!" />

        <div
          v-for="(prompt, index) in promptsView"
          :key="prompt.id"
          @click="handleSelectPrompt(prompt.id)"
        >
          <div
            class="flex justify-between items-center-safe w-full h-fit py-1 px-2 rounded border-gray-200 hover:bg-gray-100 focus:bg-gray-200 cursor-pointer [&_.delete-button]:hover:opacity-100!"
            :class="{
              'bg-gray-200': selectedPromptID === prompt.id,
              'hover:bg-gray-300': selectedPromptID === prompt.id,
            }"
          >
            <div class="flex flex-col">
              <el-text truncated class="self-start!">
                {{ prompt.text }}
              </el-text>
              <el-text
                v-if="prompt.translation"
                truncated
                class="text-xs! text-gray-400! self-start!"
              >
                {{ prompt.translation }}
              </el-text>
            </div>
            <el-popconfirm
              title="确定从该提示词中删除此示例？"
              @confirm="handleDeletePrompt(prompt.id)"
            >
              <template #reference>
                <el-icon
                  class="delete-button opacity-0! text-gray-400! hover:text-gray-600! transition-colors duration-200"
                  :class="{
                    'opacity-100!': selectedPromptID === prompt.id,
                  }"
                >
                  <Close />
                </el-icon>
              </template>
            </el-popconfirm>
          </div>

          <el-divider v-if="index < promptsView.length - 1" class="my-2!" />
        </div>
      </el-scrollbar>
      <el-scrollbar
        class="bg-white border-2 box-border border-gray-200 rounded-lg p-3 flex-1"
      >
        <prompt-editor
          v-if="selectedPromptID !== null"
          :prompt-id="selectedPromptID"
        />
      </el-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import Navigator from '@renderer/components/Navigator.vue'
import {
  Search,
  CirclePlusFilled,
  Close,
  Check,
  Sort,
  Discount,
} from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import { useStorage } from '@renderer/stores/storage'
import TagEditor from '@renderer/components/TagEditor.vue'

interface PromptView {
  id: string
  text: string
  translation: string
  description: string
  tags: {
    id: string
    text: string
  }[]
  exampleIDs: string[]
  insertTime: number
}

const storage = useStorage()

const searchTerm = ref<string>('')
const filteredTagIDs = ref<string[]>([])
const selectedPromptID = ref<string | null>(null)

const promptsView = computed(() => {
  const tagSet = new Set(filteredTagIDs.value)
  return Array.from(storage.prompts.values())
    .filter((prompt) => {
      if (searchTerm.value.trim() === '') {
        return true
      }
      return (
        prompt.text.toLowerCase().indexOf(searchTerm.value.toLowerCase()) !== -1
      )
    })
    .filter((prompt) => {
      if (filteredTagIDs.value.length === 0) {
        return true
      }
      if (tagSet.has('0') && prompt.tagIDs.length === 0) {
        // 未分类的提示词
        return true
      }
      return prompt.tagIDs.some((id) => tagSet.has(id))
    })
    .map((prompt) => {
      const tags = prompt.tagIDs
        .map((id) => {
          const tag = storage.getTagByID(id)
          return tag ? { id: tag.id, text: tag.text } : null
        })
        .filter((tag): tag is { id: string; text: string } => tag !== null)

      return {
        ...prompt,
        tags,
      } as PromptView
    })
    .sort(
      sortType.value === 'text'
        ? sortByText(sortByTextAsc.value)
        : sortByTime(sortByTimeAsc.value)
    )
})

const tagDialogVisible = ref(false)

//#region 处理Prompt排序
const sortByText = (asc: boolean) => {
  return (a: PromptView, b: PromptView): number => {
    return a.text.localeCompare(b.text) * (asc ? 1 : -1)
  }
}
const sortByTime = (asc: boolean) => {
  return (a: PromptView, b: PromptView): number => {
    return (a.insertTime - b.insertTime) * (asc ? 1 : -1)
  }
}
const sortByTextAsc = ref(true)
const sortByTimeAsc = ref(false)
const sortType = ref<'text' | 'time'>('time')
function handleSortByText(): void {
  if (sortType.value === 'text') {
    sortByTextAsc.value = !sortByTextAsc.value
  } else {
    sortByTimeAsc.value = true
    sortType.value = 'text'
  }
}
function handleSortByTime(): void {
  if (sortType.value === 'time') {
    sortByTimeAsc.value = !sortByTimeAsc.value
  } else {
    sortByTextAsc.value = false
    sortType.value = 'time'
  }
}
//#endregion

//#region 添加 Prompt
const creatingPrompt = ref(false)
const newPromptText = ref('')

function handleAddPrompt(): void {
  creatingPrompt.value = true
}

async function handleConfirmAddPrompt(): Promise<void> {
  if (!creatingPrompt.value) return
  if (newPromptText.value.trim() === '') {
    creatingPrompt.value = false
    return
  }
  const result = await storage.addPrompt({
    text: newPromptText.value,
  })
  if (result) {
    ElMessage.success('提示词已添加')
    selectedPromptID.value = result.id
  } else {
    ElMessage.error('添加提示词失败')
  }
  newPromptText.value = ''
  creatingPrompt.value = false
}

function handleCancelAddPrompt(): void {
  newPromptText.value = ''
  creatingPrompt.value = false
}
//#endregion

function handleSelectPrompt(id: string): void {
  if (selectedPromptID.value !== id) {
    selectedPromptID.value = id
  }
}

async function handleDeletePrompt(id: string): Promise<void> {
  const res = await storage.deletePrompt(id)
  if (res) {
    if (selectedPromptID.value === id) {
      selectedPromptID.value = null
    }
    ElMessage.success('成功删除提示词')
  } else {
    ElMessage.error('删除提示词失败')
  }
}
</script>

<style lang="css" scoped>
@reference 'tailwindcss';

.preview-wrapper :deep(.preview-header) {
  font-weight: bold;
}
.preview-wrapper :deep(.preview-content) {
  min-height: 2.5rem;
  @apply rounded border border-blue-100 p-2;
}
.fade-enter-active,
.fade-leave-active {
  transition: transform 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  transform: translateX(100vw);
}
</style>
