<template>
  <div class="my-2 mx-2 flex-1 min-h-0 min-w-0 flex flex-col">
    <!-- 导航栏 -->
    <navigator>
      <div class="flex gap-2 justify-start">
        <el-text
          truncated
          class="font-bold! cursor-pointer max-w-24!"
          @click="handleOpenWorkspaceNameDialog"
        >
          {{ workspace.name || '未命名' }}
        </el-text>
        <el-dialog v-model="showWorkspaceNameDialog" title="编辑工作区名称">
          <el-input
            v-model="tempWorkspaceText"
            placeholder="请输入工作区名称"
            clearable
            @keyup.enter="handleConfirmEditWorkspaceName(tempWorkspaceText)"
            @keyup.esc.stop.prevent="handleCancelEditWorkspaceName"
          />
          <template #footer>
            <el-button @click="handleCancelEditWorkspaceName">取消</el-button>
            <el-button
              type="primary"
              @click="handleConfirmEditWorkspaceName(tempWorkspaceText)"
            >
              确认
            </el-button>
          </template>
        </el-dialog>

        <!-- <el-input
          v-model="addTag"
          placeholder="添加标签"
          clearable
          class="flex-[0.5_2] min-w-0"
          @keyup.enter="handleAddTag"
        >
          <template #prefix>
            <el-icon><Discount /></el-icon>
            <el-button :icon="Plus" link @click="handleAddTag" />
          </template>
        </el-input> -->

        <el-tooltip content="管理标签" placement="bottom-start" :hide-after="0">
          <el-button :icon="Discount" @click="tagDialogVisible = true" />
        </el-tooltip>
        <el-dialog
          v-if="tagDialogVisible"
          v-model="tagDialogVisible"
          title="标签管理"
          @keyup.esc.stop.prevent="tagDialogVisible = false"
        >
          <tag-editor />
        </el-dialog>

        <el-select-v2
          model-value=""
          :options="searchPromptOptions"
          :filter-method="findPromptByTextOrTranslation"
          :props="{
            label: 'text',
            value: 'text',
          }"
          filterable
          placeholder="查找提示词"
          clearable
          class="flex-1 min-w-0"
          @update:model-value="handleFindPromptAndScroll($event)"
        >
          <template #default="{ item }">
            <span style="margin-right: 8px">{{ item.text }}</span>
            <span
              style="color: var(--el-text-color-secondary); font-size: 13px"
            >
              {{ item.translation }}
            </span>
          </template>
        </el-select-v2>

        <el-select-v2
          model-value=""
          :options="tagFocusOptions"
          :props="{
            label: 'text',
            value: 'id',
          }"
          filterable
          :filter-method="findTagByTextOrPinyin"
          placeholder="查找标签"
          clearable
          class="flex-1 min-w-0"
          @update:model-value="handleScrollToTag($event)"
        />

        <el-select-v2
          :model-value="workspace.tagIDs"
          :options="tagAddOptions"
          :props="{
            label: 'text',
            value: 'id',
          }"
          filterable
          :filter-method="filterTagsByTextOrPinyin"
          placeholder="选择标签"
          multiple
          collapse-tags-tooltip
          clearable
          collapse-tags
          class="flex-1 min-w-0"
          @update:model-value="handleSelectTags($event as string[])"
        >
          <template #header>
            <el-checkbox
              v-model="selectAllTags"
              :indeterminate="indeterminateAll"
              @change="handleCheckAllTags"
            >
              全选
            </el-checkbox>
            <el-checkbox v-model="selectUsedTags" @change="handleCheckUsedTags">
              已使用
            </el-checkbox>
          </template>
        </el-select-v2>
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
    </navigator>
    <!-- 标签列表 -->
    <vue-draggable
      :model-value="workspace.tagIDs"
      target=".el-scrollbar__view"
      handle=".drag-handle"
      :animation="100"
      class="flex justify-center-safe flex-1 min-h-0 my-2"
      @update:model-value="handleReorderTags($event as string[])"
    >
      <el-scrollbar
        always
        class="[&_.el-scrollbar\_\_bar>.is-vertical]:hidden"
        view-class="flex gap-2 flex-1 h-full"
        wrap-class="overflow-y-hidden!"
      >
        <tag-collection
          v-for="tag in selectedTags"
          :key="tag.id"
          ref="tagCollections"
          :tag="tag"
          :existing-prompt-i-ds="existingPromptIDs"
          @add-to-workspace="editor?.addText($event.text)"
          @delete="handleDeleteTag"
          @close="handleCloseTag"
        />
      </el-scrollbar>
    </vue-draggable>
    <!-- 工作区编辑器 -->
    <workspace-editor
      ref="editor"
      :model-value="editorText"
      @update:model-value="handleSaveEditorText($event)"
      @add-example="handleAddExample"
      @existing-prompt-change="handleExistingPromptChange($event)"
    />
  </div>
</template>

<script setup lang="ts">
import { useStorage } from '@renderer/stores/storage'
import {
  computed,
  defineAsyncComponent,
  nextTick,
  ref,
  useTemplateRef,
  watch,
} from 'vue'
import { Discount } from '@element-plus/icons-vue'
import { CheckboxValueType, ElMessage } from 'element-plus'
import type { Workspace } from '@shared/types'
import { VueDraggable } from 'vue-draggable-plus'
import TagEditor from '@renderer/components/TagEditor.vue'
import {
  pinyinIncludes,
  pinyinIncludesWithFirstLetter,
} from '@renderer/utils/pinyin-includes'

const TagCollection = defineAsyncComponent(
  () => import('@renderer/components/TagCollection.vue')
)

const storage = useStorage()

// const allTags = computed(() => Array.from(storage.tags.values()))
const tagAddOptions = ref(Array.from(storage.tags.values()))

const editor = useTemplateRef('editor')

const props = defineProps<{
  workspaceID: string
}>()

const tempWorkspaceText = ref('')
const showWorkspaceNameDialog = ref(false)

const workspace = ref(defaultWorkspace())

const selectedTags = computed(() =>
  workspace.value.tagIDs
    .map((id) => storage.getTagByID(id))
    .filter((tag) => tag !== undefined)
)

const workspaceTags = computed(() => {
  return workspace.value.tagIDs
    .map((id) => storage.getTagByID(id))
    .filter((tag) => tag !== undefined)
})
const tagFocusOptions = ref(workspaceTags.value)

// 切换正向、负向编辑器
const isPositiveEditor = ref(true)

const editorText = ref('')
const loadEditorText = (): void => {
  editorText.value = isPositiveEditor.value
    ? workspace.value?.positiveEditor || ''
    : workspace.value?.negativeEditor || ''
}

const handleSwitchEditor = (value: boolean): void => {
  isPositiveEditor.value = value
  editorText.value = value
    ? workspace.value?.positiveEditor || ''
    : workspace.value?.negativeEditor || ''
}

const handleSaveEditorText = async (text: string): Promise<void> => {
  editorText.value = text
  if (workspace.value) {
    if (isPositiveEditor.value) {
      workspace.value.positiveEditor = text
    } else {
      workspace.value.negativeEditor = text
    }
    await updateWorkspace({
      positiveEditor: workspace.value.positiveEditor,
      negativeEditor: workspace.value.negativeEditor,
    })
  }
}

const tagDialogVisible = ref(false)

async function handleDeleteTag(tag: {
  id: string
  text: string
}): Promise<void> {
  const confirmed = await storage.deleteTag(tag.id)
  if (confirmed) {
    await updateWorkspace({
      tagIDs: workspace.value?.tagIDs.filter((id) => id !== tag.id) || [],
    })
  } else {
    ElMessage.error(`删除标签 "${tag.text}" 失败`)
  }
}

function handleCloseTag(tag: { id: string; text: string }): void {
  updateWorkspace({
    tagIDs: workspace.value?.tagIDs.filter((id) => id !== tag.id) || [],
  })
}

async function updateWorkspace(newWorkspace: {
  name?: string
  positiveEditor?: string
  negativeEditor?: string
  tagIDs?: string[]
}): Promise<void> {
  if (!workspace.value.id) {
    return
  }
  workspace.value.name = newWorkspace.name || workspace.value.name
  workspace.value.positiveEditor =
    newWorkspace.positiveEditor || workspace.value.positiveEditor
  workspace.value.negativeEditor =
    newWorkspace.negativeEditor || workspace.value.negativeEditor
  workspace.value.tagIDs = newWorkspace.tagIDs || workspace.value.tagIDs
  const w = await storage.updateWorkspace({
    id: workspace.value.id,
    name: workspace.value.name,
    positiveEditor: workspace.value.positiveEditor,
    negativeEditor: workspace.value.negativeEditor,
    tagIDs: workspace.value.tagIDs,
  })
  if (!w) {
    ElMessage.error('更新工作区失败')
  } else {
    workspace.value = w
  }
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

function handleOpenWorkspaceNameDialog(): void {
  tempWorkspaceText.value = workspace.value.name
  showWorkspaceNameDialog.value = true
}

function handleConfirmEditWorkspaceName(name: string): void {
  if (!name.trim()) {
    ElMessage.warning('工作区名称不能为空')
    return
  }
  updateWorkspace({ name })
  showWorkspaceNameDialog.value = false
  workspace.value.name =
    storage.getWorkspaceByID(props.workspaceID)?.name || '未命名'
}

function handleCancelEditWorkspaceName(): void {
  showWorkspaceNameDialog.value = false
}

const existingPromptIDs = ref<Set<string>>(new Set())
function handleExistingPromptChange(promptIDs: string[]): void {
  existingPromptIDs.value.clear()
  for (const id of promptIDs) {
    existingPromptIDs.value.add(id)
  }
}

const tagCollections = useTemplateRef('tagCollections')
function handleScrollToTag(tagID: string): void {
  if (!tagCollections.value) return
  for (const tagCollection of tagCollections.value) {
    if (tagCollection === null) continue
    if (tagCollection.$props.tag.id === tagID) {
      tagCollection.scrollIntoView()
      return
    }
  }
}

async function handleFindPromptAndScroll(prompt: string): Promise<void> {
  for (const tag of selectedTags.value) {
    const prompts = storage.getPromptsByTag(tag.id)
    const index = prompts.findIndex((p) => p.text === prompt)
    if (index !== -1) {
      const tc = tagCollections.value?.find(
        (tc) => tc?.$props.tag.id === tag.id
      )
      tc?.scrollIntoView()
      await nextTick()
      tc?.scrollPromptIntoView(prompt)
      return
    }
  }
}

function defaultWorkspace(): Workspace {
  return {
    id: '',
    name: '',
    positiveEditor: '',
    negativeEditor: '',
    tagIDs: [],
    createTime: 0,
    updateTime: 0,
  }
}

const searchPromptOptions = ref<{ text: string; translation: string }[]>([])
const loadSearchPromptOptions = (): void => {
  const options: { text: string; translation: string }[] = []
  selectedTags.value.forEach((tag) => {
    const prompts = storage.getPromptsByTag(tag.id)
    prompts.forEach((prompt) => {
      if (!options.find((o) => o.text === prompt.text)) {
        options.push({
          text: prompt.text,
          translation: prompt.translation || '',
        })
      }
    })
  })
  searchPromptOptions.value = options
}

// 根据拼音查找标签
const findTagByTextOrPinyin = (text: string): void => {
  tagFocusOptions.value = workspaceTags.value.filter((tag) => {
    return (
      tag.text.includes(text) ||
      pinyinIncludes(tag.text, text) ||
      pinyinIncludesWithFirstLetter(tag.text, text)
    )
  })
}

// 根据提示词内容或翻译查找提示词
const findPromptByTextOrTranslation = (text: string): void => {
  const options: { text: string; translation: string }[] = []
  selectedTags.value.forEach((tag) => {
    const prompts = storage.getPromptsByTag(tag.id)
    prompts.forEach((prompt) => {
      if (
        prompt.text.toLowerCase().includes(text.toLowerCase()) ||
        (prompt.translation &&
          (prompt.translation.includes(text.toLowerCase()) ||
            pinyinIncludes(prompt.translation, text) ||
            pinyinIncludesWithFirstLetter(prompt.translation, text)))
      ) {
        options.push({
          text: prompt.text,
          translation: prompt.translation || '',
        })
      }
    })
  })
  searchPromptOptions.value = options
}

// 全选、已使用标签
const selectAllTags = ref(false)
const selectUsedTags = ref(false)
const indeterminateAll = ref(false)
const usedTagIDs = computed(() => {
  const usedTagIDs = new Set<string>()
  storage.prompts.forEach((prompt) => {
    if (!existingPromptIDs.value.has(prompt.id)) return
    prompt.tagIDs.forEach((tagID) => {
      usedTagIDs.add(tagID)
    })
  })
  return Array.from(usedTagIDs)
})

function handleCheckAllTags(value: CheckboxValueType): void {
  selectUsedTags.value = false
  if (value) {
    workspace.value.tagIDs = storage.tags
      .values()
      .map((tag) => tag.id)
      .toArray()
  } else {
    workspace.value.tagIDs.length = 0
  }
  indeterminateAll.value =
    workspace.value.tagIDs.length > 0 &&
    workspace.value.tagIDs.length < storage.tags.size
  updateWorkspace({})
}

function handleCheckUsedTags(value: CheckboxValueType): void {
  indeterminateAll.value = false
  selectAllTags.value = false
  if (value) {
    workspace.value.tagIDs = usedTagIDs.value.filter((id) =>
      storage.tags.has(id)
    )
  } else {
    workspace.value.tagIDs.length = 0
  }
  updateWorkspace({})
}

watch(
  () => props.workspaceID,
  () => {
    workspace.value =
      storage.getWorkspaceByID(props.workspaceID) ?? defaultWorkspace()
    if (!workspace.value.id) {
      ElMessage.error('工作区未找到')
    } else {
      loadEditorText()
      loadSearchPromptOptions()
    }
  },
  { immediate: true }
)

const handleReorderTags = (tagIDs: string[]): void => {
  updateWorkspace({ tagIDs })
}

const handleSelectTags = (tagIDs: string[]): void => {
  updateWorkspace({ tagIDs })
}

function filterTagsByTextOrPinyin(text: string): void {
  tagAddOptions.value.length = 0
  for (const tag of storage.tags.values()) {
    if (
      tag.text.includes(text) ||
      pinyinIncludes(tag.text, text) ||
      pinyinIncludesWithFirstLetter(tag.text, text)
    ) {
      tagAddOptions.value.push(tag)
    }
  }
}
</script>
