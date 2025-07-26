<template>
  <el-scrollbar class="flex flex-col gap-2 flex-1 min-h-0 relative">
    <div>
      <el-text class="edit-header">提示词</el-text>
      <el-button
        :icon="CopyDocument"
        link
        @click="handleCopyText(promptText)"
      />
      <confirm-input
        :model-value="promptText"
        placeholder="请输入提示词"
        @save="handleChangePromptText"
      />
    </div>
    <div>
      <div class="flex gap-1">
        <el-text class="edit-header">翻译</el-text>
        <el-tooltip
          content="点击使用 DeepLX 翻译"
          :hide-after="0"
          placement="top"
        >
          <el-button
            link
            :icon="TranslateIcon"
            @click="handleTranslateByDeepLX"
          />
        </el-tooltip>
        <el-button
          :icon="CopyDocument"
          link
          class="ml-0!"
          @click="handleCopyText(promptTranslation)"
        />
      </div>
      <confirm-input
        :model-value="promptTranslation"
        placeholder="请输入翻译"
        @save="handleChangeTranslation"
      />
    </div>
    <div>
      <el-text class="edit-header">Tags</el-text>
      <el-select
        v-model="selectedTags"
        value-key="id"
        multiple
        filterable
        allow-create
        default-first-option
        :reserve-keyword="false"
        placeholder="请选择或输入标签"
        @blur="handleChangeTags"
      >
        <el-option
          v-for="tag in allTags"
          :key="tag.id"
          :label="tag.text"
          :value="tag"
        />
      </el-select>
    </div>
    <div>
      <el-text class="edit-header">描述</el-text>
      <el-button
        :icon="CopyDocument"
        link
        @click="handleCopyText(promptDescription)"
      />
      <confirm-input
        :model-value="promptDescription"
        placeholder="请输入描述"
        @save="handleChangeDescription"
      />
    </div>
    <div class="image flex flex-col flex-1 min-h-0">
      <el-text class="edit-header self-start!">示例</el-text>
      <div class="flex-1 min-h-0 flex flex-col">
        <div>
          <el-button
            type="success"
            :icon="CirclePlusFilled"
            class="mb-2 self-start!"
            @click="handleAddExample"
          >
            添加示例
          </el-button>
          <el-button
            type="success"
            :icon="CirclePlusFilled"
            class="mb-2 self-start!"
            @click="handleOpenAddExampleFromExistingDialog"
          >
            从已有示例添加
          </el-button>
        </div>
        <div
          v-if="examples.length > 0"
          class="flex flex-col gap-2 flex-1 min-h-0 border-2 border-gray-200 rounded-md px-1"
        >
          <div
            v-for="example in examples"
            :key="example.id"
            class="flex justify-between gap-2 my-1.5"
          >
            <div class="flex gap-2 flex-1 min-w-0">
              <el-image
                v-if="example.images.length > 0"
                :src="getImageUrl(example.images[0]?.fileName)"
                class="w-40 h-40 object-cover rounded-md cursor-pointer hover:shadow-lg transition-shadow duration-300 self-center-safe"
                fit="cover"
                loading="lazy"
                @click="handleEditExampleGallery(example.id)"
              />
              <div
                v-else
                class="flex justify-center items-center w-40 h-40 bg-gray-300 text-gray-400 rounded-md cursor-pointer hover:shadow-lg transition-shadow duration-300"
                @click="handleEditExampleGallery(example.id)"
              >
                Empty
              </div>
              <div class="flex-1 min-w-0 flex flex-col gap-1">
                <div class="flex flex-col gap-1 flex-1 min-h-0">
                  <div>
                    <el-segmented
                      v-model="editorTab[example.id]"
                      :options="
                        tabs.map((tab) => {
                          switch (tab) {
                            case 'positive':
                              return { label: '正向', value: tab }
                            case 'negative':
                              return { label: '负向', value: tab }
                            case 'extra':
                              return { label: '额外', value: tab }
                          }
                        })
                      "
                    />
                    <!-- <el-button
                      :icon="Edit"
                      :type="
                        canEditExamplesText[editorTab[example.id]][example.id]
                          ? 'primary'
                          : 'default'
                      "
                      link
                      class="self-center flex-1 min-h-0"
                      @click="
                        handleEditExampleText(example.id, editorTab[example.id])
                      "
                    /> -->
                    <el-button
                      :icon="CopyDocument"
                      link
                      class="self-center flex-1 min-h-0 ml-0!"
                      @click="
                        handleCopyText(
                          examplesText[editorTab[example.id]][example.id]
                        )
                      "
                    />
                    <el-popconfirm
                      title="确定从该提示词中删除此示例？"
                      :hide-after="0"
                      @confirm="handleDeleteExample(example.id)"
                    >
                      <template #reference>
                        <el-button link :icon="Delete" class="ml-0!" />
                      </template>
                    </el-popconfirm>
                  </div>
                  <confirm-input
                    v-for="tab in tabs"
                    v-show="editorTab[example.id] === tab"
                    :key="tab"
                    :model-value="examplesText[tab][example.id]"
                    placeholder="请输入示例文本"
                    class="flex-1 min-h-0"
                    @save="
                      handleConfirmEditExampleTextFunc(example.id, tab)($event)
                    "
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-scrollbar>

  <!-- 编辑图片 -->
  <el-dialog
    v-if="editGalleryExampleID !== null"
    v-model="editGalleryVisible"
    title="编辑图片"
    align-center
    class="w-auto! h-[80vh] flex flex-col"
    body-class="flex-1 min-h-0 flex gap-2 justify-between"
    @keyup.esc.stop.prevent="editGalleryVisible = false"
  >
    <template #default>
      <Gallery :example-i-d="editGalleryExampleID" />
    </template>
  </el-dialog>

  <!-- 从已有添加示例 -->
  <el-dialog
    v-model="addExampleFromExistingVisible"
    title="从已有示例添加"
    align-center
    class="w-auto! h-[80vh] flex flex-col"
    body-class="flex-1 min-h-0 flex gap-2 justify-between"
    @keyup.esc.stop.prevent="editGalleryVisible = false"
  >
    <existing-examples
      :prompt-i-d="promptID"
      @add-example="handleAddExampleFromExisting"
    />
  </el-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useStorage } from '@renderer/stores/storage'
import { CirclePlusFilled, CopyDocument, Delete } from '@element-plus/icons-vue'
import { getImageUrl } from '@renderer/utils/utils'
import lodash from 'lodash'
import ConfirmInput from '@renderer/components/ConfirmInput.vue'
import type { Tag } from '@shared/types'
import { watchArray } from '@vueuse/core'
import TranslateIcon from '@renderer/icons/Prompt.vue'

const tabs = ['positive', 'negative', 'extra'] as const
const tabToField: Record<string, string> = {
  positive: 'positivePrompt',
  negative: 'negativePrompt',
  extra: 'extra',
}
type Tabs = (typeof tabs)[number]

const props = defineProps<{
  promptID: string
}>()

const storage = useStorage()
const allTags = computed(() => Array.from(storage.tags.values()))

// 编辑 Prompt 相关数据
const promptText = computed(() => storage.prompts.get(props.promptID)?.text)
const promptTranslation = computed(
  () => storage.prompts.get(props.promptID)?.translation
)
const promptDescription = computed(
  () => storage.prompts.get(props.promptID)?.description
)
const selectedTags = ref<(Tag | string)[]>([])
const examples = computed(() => storage.getExamplesByPromptID(props.promptID))

// 编辑或添加示例相关数据
const editGalleryExampleID = ref<string | null>(null)
const editGalleryVisible = ref(false)

// 是否可以编辑示例文本
// const canEditExamplesText = ref<Record<Tabs, Record<string, boolean>>>({
//   positive: {},
//   negative: {},
//   extra: {},
// })
// 示例的编辑框当前的tab
const editorTab = ref<Record<string, Tabs>>({})
// 暂存示例文本, id -> 文本
const examplesText = ref<Record<Tabs, Record<string, string>>>({
  positive: {},
  negative: {},
  extra: {},
})
watchArray(
  () => examples.value.map((e) => e.id),
  (_newArr, _oldArr, added, removed) => {
    added.forEach((id) => {
      // for (const tab of tabs) {
      //   canEditExamplesText.value[tab][id] =
      //     canEditExamplesText.value[tab][id] ?? false
      // }
      for (const [tab, field] of Object.entries(tabToField)) {
        examplesText.value[tab][id] =
          examples.value.find((e) => e.id === id)?.[field] || ''
      }
      editorTab.value[id] = 'positive' // 默认新添加的示例为正向示例
    })
    if (removed) {
      removed.forEach((id) => {
        // for (const tab of tabs) {
        //   delete canEditExamplesText.value[tab][id]
        // }
        delete editorTab.value[id]
        for (const tab of tabs) {
          delete examplesText.value[tab][id]
        }
      })
    }
  },
  { immediate: true }
)
watchArray(
  () =>
    examples.value.map((e) => ({
      id: e.id,
      positivePrompt: e.positivePrompt,
      negativePrompt: e.negativePrompt,
      extra: e.extra,
    })),
  (newArr) => {
    newArr.forEach((example) => {
      for (const tab of tabs) {
        examplesText.value[tab][example.id] = example[tabToField[tab]] || ''
      }
    })
  },
  { deep: true, immediate: true }
)

watch(
  () => props.promptID,
  () => {
    const prompt = lodash.cloneDeep(storage.prompts.get(props.promptID))
    if (prompt !== undefined) {
      selectedTags.value = prompt.tagIDs
        .map((id) => storage.getTagByID(id))
        .filter((tag): tag is Tag => tag !== undefined)
    } else {
      ElMessage.warning('未找到对应的提示词')
    }
  },
  { immediate: true }
)

//#region 更改示例内容
async function handleChangePromptText(value: string): Promise<void> {
  if (value.trim() === '') {
    ElMessage.warning('提示词不能为空')
    return
  }
  if (storage.getPromptIDIfExists(value.trim()) !== null) {
    ElMessage.warning('提示词已存在')
    return
  }
  const success = await storage.updatePromptText(props.promptID, value)
  if (!success) {
    ElMessage.error('更新提示词文本失败')
  }
}

async function handleChangeTranslation(value: string): Promise<void> {
  const success = await storage.updatePromptTranslation(props.promptID, value)
  if (!success) {
    ElMessage.error('更新提示词翻译失败')
  }
}

async function handleTranslateByDeepLX(): Promise<void> {
  if (promptText.value) {
    const result = await window.api.translateByDeepLX(promptText.value)
    if (result) {
      const success = await storage.updatePromptTranslation(
        props.promptID,
        result
      )
      if (!success) {
        ElMessage.error('翻译失败')
      }
    } else {
      ElMessage.error('翻译失败')
    }
  }
}

async function handleChangeDescription(value: string): Promise<void> {
  const success = await storage.updatePromptDescription(props.promptID, value)
  if (!success) {
    ElMessage.error('更新 Prompt 描述失败')
  }
}

async function handleChangeTags(): Promise<void> {
  const textToNewTags = new Map<string, Tag>()
  for (const tag of selectedTags.value) {
    if (typeof tag === 'string') {
      const newTag = await storage.addTag({ text: tag })
      if (newTag) {
        textToNewTags.set(newTag.text, newTag)
      }
    }
  }
  selectedTags.value = selectedTags.value.map((tag) => {
    if (typeof tag === 'string' && textToNewTags.has(tag)) {
      return textToNewTags.get(tag)!
    }
    return tag
  })
  storage.updatePromptTags(
    props.promptID,
    selectedTags.value
      .filter((tag): tag is Tag => typeof tag !== 'string')
      .map((tag) => tag.id)
  )
}
//#endregion

//#region 编辑示例
async function handleAddExample(): Promise<void> {
  const example = await storage.addExampleToPrompt(props.promptID, {})
  if (!example) {
    ElMessage.error('添加示例失败')
    return
  }
  ElMessage.success('添加示例成功')
}

async function handleDeleteExample(id: string): Promise<void> {
  const success = await storage.deleteExampleIDFromPrompt(props.promptID, id)
  if (!success) {
    ElMessage.error('删除示例失败')
  } else {
    ElMessage.success('删除示例成功')
  }
}

function handleConfirmEditExampleTextFunc(exampleID: string, type: Tabs) {
  const field = tabToField[type]
  return async (text: string) => {
    const success = await storage.updateExample({
      id: exampleID,
      [field]: text,
    })
    if (success) {
      ElMessage.success('示例文本更新成功')
    } else {
      ElMessage.error('示例文本更新失败')
      examplesText.value[type][exampleID] =
        storage.examples.get(exampleID)?.[field] || ''
    }
  }
}
//#endregion

//#region 编辑示例图片
function handleEditExampleGallery(exampleID: string): void {
  editGalleryExampleID.value = exampleID
  editGalleryVisible.value = true
}
watch(editGalleryVisible, (visible) => {
  if (!visible) {
    editGalleryExampleID.value = null
  }
})
//#endregion

async function handleCopyText(text?: string): Promise<void> {
  if (!text) {
    ElMessage.warning('没有可复制的文本')
    return
  }
  const success = await window.api.copyToClipboard(text)
  if (success) {
    ElMessage.success('已复制到剪贴板')
  } else {
    ElMessage.warning('复制失败，请重试')
  }
}

const addExampleFromExistingVisible = ref(false)
function handleOpenAddExampleFromExistingDialog(): void {
  addExampleFromExistingVisible.value = true
}
async function handleAddExampleFromExisting(exampleID: string): Promise<void> {
  const example = await storage.addExampleIDToPrompt(props.promptID, exampleID)
  if (!example) {
    ElMessage.error('添加示例失败')
    return
  }
  ElMessage.success('添加示例成功')
}
</script>

<style scoped>
@reference "tailwindcss"

.edit-header {
  font-weight: bold;
}
</style>
