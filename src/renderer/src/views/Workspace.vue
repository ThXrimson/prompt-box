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
          :options="Array.from(storage.prompts.values())"
          :props="{
            label: 'text',
            value: 'text',
          }"
          filterable
          placeholder="查找提示词"
          clearable
          class="flex-1 min-w-0"
          @update:model-value="editor?.addText($event)"
        />

        <el-select-v2
          v-model="workspace.tagIDs"
          :options="Array.from(storage.tags.values())"
          :props="{
            label: 'text',
            value: 'id',
          }"
          filterable
          placeholder="选择标签"
          multiple
          collapse-tags-tooltip
          clearable
          collapse-tags
          class="flex-1 min-w-0"
        />
        <!-- 切换正向、负向编辑器 -->
        <el-switch
          v-model="isPositiveEditor"
          inline-prompt
          active-text="POSITIVE"
          inactive-text="NEGATIVE"
          style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
          class="[&_.is-text]:font-mono"
        />
      </div>
    </navigator>
    <!-- 标签列表 -->
    <vue-draggable
      v-model="workspace.tagIDs"
      target=".el-scrollbar__view"
      handle=".drag-handle"
      :animation="100"
      class="flex justify-center-safe flex-1 min-h-0 my-2"
    >
      <el-scrollbar
        class="[&_.el-scrollbar\_\_bar>.is-vertical]:hidden"
        view-class="flex gap-2 flex-1 h-full"
        wrap-class="overflow-y-hidden!"
      >
        <tag-collection
          v-for="tag in workspace.tagIDs
            .map((id) => storage.getTagByID(id))
            .filter((tag) => tag !== undefined)"
          :key="tag.id"
          :tag="tag"
          @add-to-workspace="editor?.addText($event.text)"
          @delete="handleDeleteTag"
          @close="handleCloseTag"
        />
      </el-scrollbar>
    </vue-draggable>
    <!-- 工作区编辑器 -->
    <workspace-editor
      ref="editor"
      v-model="editorText"
      @add-example="handleAddExample"
    />
  </div>
</template>
<script setup lang="ts">
import { useStorage } from '@renderer/stores/storage'
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import { Discount } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { Workspace } from '@shared/types'
import { watchArray } from '@vueuse/core'
import { VueDraggable } from 'vue-draggable-plus'
import TagEditor from '@renderer/components/TagEditor.vue'

const storage = useStorage()

const editor = useTemplateRef('editor')

const props = defineProps<{
  workspaceID: string
}>()

const tempWorkspaceText = ref('')
const showWorkspaceNameDialog = ref(false)

const workspace = ref(defaultWorkspace())
onMounted(() => {
  workspace.value =
    storage.getWorkspaceByID(props.workspaceID) ?? defaultWorkspace()
  if (!workspace.value.id) {
    ElMessage.error('工作区未找到')
  }
})

// 切换正向、负向编辑器
const isPositiveEditor = ref(true)

const editorText = ref('')
onMounted(() => {
  editorText.value = isPositiveEditor.value
    ? workspace.value?.positiveEditor || ''
    : workspace.value?.negativeEditor || ''
})
watch(isPositiveEditor, () => {
  editorText.value = isPositiveEditor.value
    ? workspace.value?.positiveEditor || ''
    : workspace.value?.negativeEditor || ''
})
watch(editorText, async (newText) => {
  if (workspace.value) {
    if (isPositiveEditor.value) {
      workspace.value.positiveEditor = newText
    } else {
      workspace.value.negativeEditor = newText
    }
    updateWorkspace({
      positiveEditor: workspace.value.positiveEditor,
      negativeEditor: workspace.value.negativeEditor,
    })
  }
})

// const addTag = ref('')
const tagDialogVisible = ref(false)

// async function handleAddTag(): Promise<void> {
//   if (!workspace.value.id) {
//     return
//   }
//   if (addTag.value.trim() === '') {
//     ElMessage.warning('标签不能为空')
//     return
//   }
//   const newTag = await storage.addTag({ text: addTag.value.trim() })
//   if (!newTag) {
//     ElMessage.error('添加标签失败')
//     return
//   }
//   updateWorkspace({
//     tagIDs: [newTag.id, ...(workspace.value?.tagIDs || [])],
//   })
//   addTag.value = ''
// }

async function handleDeleteTag(tag: {
  id: string
  text: string
}): Promise<void> {
  const confirmed = await storage.deleteTag(tag.id)
  if (confirmed) {
    updateWorkspace({
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

watchArray(
  () => workspace.value.tagIDs,
  (_newArr, _oldArr, added, removed) => {
    if (!added.length && !removed.length) return
    // 当标签列表变化时，更新工作区
    updateWorkspace({
      tagIDs: workspace.value.tagIDs,
    })
  }
)

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
    name: newWorkspace.name,
    positiveEditor: newWorkspace.positiveEditor,
    negativeEditor: newWorkspace.negativeEditor,
    tagIDs: newWorkspace.tagIDs,
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
</script>
