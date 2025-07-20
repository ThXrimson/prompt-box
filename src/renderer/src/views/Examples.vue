<template>
  <div class="my-2 mx-2 flex-1 min-h-0 min-w-0 flex flex-col">
    <div class="image flex flex-col flex-1 min-h-0">
      <el-button
        type="success"
        :icon="CirclePlusFilled"
        class="mb-2 self-start!"
        @click="handleAddExample"
      >
        添加示例
      </el-button>

      <el-scrollbar
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
              class="w-40 h-40 object-cover rounded-md cursor-pointer hover:shadow-lg transition-shadow duration-300"
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
                <div class="flex justify-between gap-1">
                  <div>
                    <el-switch
                      v-model="isPositive[example.id]"
                      inline-prompt
                      active-text="POSITIVE"
                      inactive-text="NEGATIVE"
                      style="
                        --el-switch-on-color: #13ce66;
                        --el-switch-off-color: #ff4949;
                      "
                    />
                    <el-button
                      :icon="Edit"
                      :type="
                        isPositive[example.id]
                          ? canEditExamplesPositiveText[example.id]
                            ? 'primary'
                            : 'default'
                          : canEditExamplesNegativeText[example.id]
                            ? 'primary'
                            : 'default'
                      "
                      link
                      class="self-center flex-1 min-h-0"
                      @click="
                        handleEditExampleText(
                          example.id,
                          isPositive[example.id] ? 'positive' : 'negative'
                        )
                      "
                    />
                    <el-button
                      :icon="CopyDocument"
                      link
                      class="self-center flex-1 min-h-0 ml-0!"
                      @click="
                        handleCopyExampleText(
                          isPositive[example.id]
                            ? examplesPositiveText[example.id]
                            : examplesNegativeText[example.id]
                        )
                      "
                    />
                    <el-popconfirm
                      title="确定删除此示例？"
                      @confirm="handleDeleteExample(example.id)"
                    >
                      <template #reference>
                        <el-button :icon="Delete" link class="ml-0!" />
                      </template>
                    </el-popconfirm>
                  </div>
                  <el-select
                    v-model="examplePrompts[example.id]"
                    value-key="id"
                    multiple
                    filterable
                    default-first-option
                    :reserve-keyword="false"
                    placeholder="此处更改示例所属提示词"
                    class="flex flex-1 min-w-0"
                    @blur="handleChangeExamplePrompt(example.id)"
                  >
                    <el-option
                      v-for="prompt in Array.from(storage.prompts.values()).map(
                        (p) => ({ id: p.id, text: p.text })
                      )"
                      :key="prompt.id"
                      :label="prompt.text"
                      :value="prompt"
                    />
                  </el-select>
                </div>
                <el-input
                  v-if="isPositive[example.id]"
                  v-model="examplesPositiveText[example.id]"
                  placeholder="请输入示例文本"
                  type="textarea"
                  resize="none"
                  :disabled="!canEditExamplesPositiveText[example.id]"
                  class="example-input"
                  @keydown.prevent.enter="
                    handleEditExampleText(example.id, 'positive')
                  "
                />
                <el-input
                  v-else
                  v-model="examplesNegativeText[example.id]"
                  placeholder="请输入示例文本"
                  type="textarea"
                  resize="none"
                  :disabled="!canEditExamplesNegativeText[example.id]"
                  class="example-input"
                  @keydown.prevent.enter="
                    handleEditExampleText(example.id, 'negative')
                  "
                />
              </div>
            </div>
          </div>
          <!-- <div class="flex flex-col gap-1 justify-evenly">
            <el-button
              :icon="DeleteFilled"
              type="danger"
              class="self-center flex-1 min-h-0 ml-0!"
              @click="handleDeleteExample(example.id)"
            />
          </div> -->
        </div>
      </el-scrollbar>
    </div>

    <!-- 编辑图片 -->
    <el-dialog
      v-if="editGalleryExampleID !== null"
      v-model="editGalleryVisible"
      title="编辑图片"
      align-center
      class="w-auto! h-[80vh] flex flex-col"
      body-class="flex-1 min-h-0 flex gap-2 justify-between"
    >
      <template #default>
        <Gallery :example-i-d="editGalleryExampleID" />
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useStorage } from '@renderer/stores/storage'
import { computed, ref, watch } from 'vue'
import {
  CirclePlusFilled,
  CopyDocument,
  Delete,
  Edit,
} from '@element-plus/icons-vue'
import { getImageUrl } from '@renderer/utils/utils'
import { watchArray } from '@vueuse/core'
// TODO 管理prompt模板

const storage = useStorage()

const examples = computed(() => {
  return Array.from(storage.examples.values())
    .reverse()
    .map((example) => {
      return {
        id: example.id,
        positivePrompt: example.positivePrompt,
        negativePrompt: example.negativePrompt,
        images: storage.getImagesByExampleID(example.id),
      }
    })
})

// 编辑或添加示例相关数据
const editGalleryExampleID = ref<string | null>(null)
const editGalleryVisible = ref(false)

// 是否可以编辑示例文本
const canEditExamplesPositiveText = ref<Record<string, boolean>>({})
const canEditExamplesNegativeText = ref<Record<string, boolean>>({})
// 是否为正向示例
const isPositive = ref<Record<string, boolean>>({})
// 示例所属提示词
const examplePrompts = ref<Record<string, { id: string; text: string }[]>>({})
// 暂存示例文本, id -> 文本
const examplesPositiveText = ref<Record<string, string>>({})
const examplesNegativeText = ref<Record<string, string>>({})
watchArray(
  () => examples.value.map((e) => e.id),
  (_newArr, _oldArr, added, removed) => {
    added.forEach((id) => {
      canEditExamplesPositiveText.value[id] =
        canEditExamplesPositiveText.value[id] ?? false
      canEditExamplesNegativeText.value[id] =
        canEditExamplesNegativeText.value[id] ?? false
      isPositive.value[id] = true // 默认新添加的示例为正向示例
      examplePrompts.value[id] = storage.getPromptsByExampleID(id)
      examplesPositiveText.value[id] =
        examples.value.find((e) => e.id === id)?.positivePrompt || ''
      examplesNegativeText.value[id] =
        examples.value.find((e) => e.id === id)?.negativePrompt || ''
    })
    if (removed) {
      removed.forEach((id) => {
        delete canEditExamplesPositiveText.value[id]
        delete canEditExamplesNegativeText.value[id]
        delete isPositive.value[id]
        delete examplePrompts.value[id]
        delete examplesPositiveText.value[id]
        delete examplesNegativeText.value[id]
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
    })),
  (newArr) => {
    newArr.forEach((example) => {
      examplesPositiveText.value[example.id] = example.positivePrompt || ''
      examplesNegativeText.value[example.id] = example.negativePrompt || ''
    })
  },
  { deep: true, immediate: true }
)

async function handleAddExample(): Promise<void> {
  const example = await storage.addExample({})
  if (!example) {
    ElMessage.error('添加示例失败')
    return
  }
  ElMessage.success('添加示例成功')
}

async function handleDeleteExample(id: string): Promise<void> {
  const success = await storage.deleteExample(id)
  if (!success) {
    ElMessage.error('删除示例失败')
  } else {
    ElMessage.success('删除示例成功')
  }
}

async function handleEditExampleText(
  exampleID: string,
  type: 'positive' | 'negative'
): Promise<void> {
  if (type === 'positive') {
    if (canEditExamplesPositiveText.value[exampleID]) {
      const success = await storage.updateExample({
        id: exampleID,
        positivePrompt: examplesPositiveText.value[exampleID],
      })
      if (success) {
        ElMessage.success('示例文本更新成功')
      } else {
        ElMessage.error('示例文本更新失败')
        examplesPositiveText.value[exampleID] =
          storage.examples.get(exampleID)?.positivePrompt || ''
      }
    }
    canEditExamplesPositiveText.value[exampleID] =
      !canEditExamplesPositiveText.value[exampleID]
  } else {
    if (canEditExamplesNegativeText.value[exampleID]) {
      const success = await storage.updateExample({
        id: exampleID,
        negativePrompt: examplesNegativeText.value[exampleID],
      })
      if (success) {
        ElMessage.success('示例文本更新成功')
      } else {
        ElMessage.error('示例文本更新失败')
        examplesNegativeText.value[exampleID] =
          storage.examples.get(exampleID)?.negativePrompt || ''
      }
    }
    canEditExamplesNegativeText.value[exampleID] =
      !canEditExamplesNegativeText.value[exampleID]
  }
}

function handleEditExampleGallery(exampleID: string): void {
  editGalleryExampleID.value = exampleID
  editGalleryVisible.value = true
}
watch(editGalleryVisible, (visible) => {
  if (!visible) {
    editGalleryExampleID.value = null
  }
})

async function handleCopyExampleText(text: string): Promise<void> {
  const success = await window.api.copyToClipboard(text)
  if (success) {
    ElMessage.success('已复制到剪贴板')
  } else {
    ElMessage.warning('复制失败，请重试')
  }
}

async function handleChangeExamplePrompt(exampleID: string): Promise<void> {
  const originalPromptIDs = storage
    .getPromptsByExampleID(exampleID)
    .map((p) => p.id)
  const addedPromptIDs: string[] = []
  const removedPromptIDs: string[] = []
  examplePrompts.value[exampleID].forEach((prompt) => {
    if (!originalPromptIDs.includes(prompt.id)) {
      addedPromptIDs.push(prompt.id)
    }
  })
  originalPromptIDs.forEach((id) => {
    if (!examplePrompts.value[exampleID].some((p) => p.id === id)) {
      removedPromptIDs.push(id)
    }
  })
  if (addedPromptIDs.length > 0) {
    for (const promptID of addedPromptIDs) {
      await storage.addExampleIDToPrompt(promptID, exampleID)
    }
  }
  if (removedPromptIDs.length > 0) {
    for (const promptID of removedPromptIDs) {
      await storage.deleteExampleIDFromPrompt(promptID, exampleID)
    }
  }
}
</script>
