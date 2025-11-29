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
                        <span style="color: var(--el-text-color-secondary); font-size: 13px">
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
                    @update:model-value="handleFindTag"
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
            </div>
        </navigator>
        <!-- 标签列表 -->
        <div class="flex-1 flex overflow-auto mt-2 gap-1">
            <tag-list
                ref="tag-list"
                :tag-i-ds="workspace.tagIDs"
                :selected-i-d="selectedTagID"
                class="flex-1 min-w-0 max-w-3xs"
                @update:tag-i-ds="handleReorderTags($event)"
                @close-tag="handleCloseTag($event)"
                @select="selectedTagID = $event"
            />
            <tag-collection
                ref="tag-collection"
                :tag="
                    storage.getTagByID(selectedTagID) ?? storage.getTagByID(UNCATEGORIZED_TAG_ID)!
                "
                :existing-prompt-i-ds="existingPromptIDs"
                class="flex-1 min-w-0"
                @add-to-workspace="editor?.addText($event)"
            />
        </div>
        <!-- 工作区编辑器 -->
        <workspace-editor
            ref="editor"
            :positive-editor="workspace.positiveEditor"
            :negative-editor="workspace.negativeEditor"
            @update-positive-editor="updateWorkspace({ positiveEditor: $event })"
            @update-negative-editor="updateWorkspace({ negativeEditor: $event })"
            @existing-prompt-change="handleExistingPromptChange($event)"
        />
    </div>
</template>

<script setup lang="ts">
import { UNCATEGORIZED_TAG_ID, useStorage } from '@renderer/stores/storage'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { Discount } from '@element-plus/icons-vue'
import { CheckboxValueType, ElMessage } from 'element-plus'
import type { Workspace } from '@shared/types'
import TagEditor from '@renderer/components/TagEditor.vue'
import { pinyinIncludes, pinyinIncludesWithFirstLetter } from '@renderer/utils/pinyin-includes'
import TagList from '@renderer/components/TagList.vue'

const storage = useStorage()

const selectedTagID = ref(UNCATEGORIZED_TAG_ID)

const tagAddOptions = ref(Array.from(storage.tags.values()))

const editor = useTemplateRef('editor')

const props = defineProps<{
    workspaceID: string
}>()

const tempWorkspaceText = ref('')
const showWorkspaceNameDialog = ref(false)

const workspace = ref(defaultWorkspace())

const workspaceTags = computed(() => {
    return workspace.value.tagIDs
        .map((id) => storage.getTagByID(id))
        .filter((tag) => tag !== undefined)
})
const tagFocusOptions = ref(workspaceTags.value)

const tagDialogVisible = ref(false)

function handleCloseTag(tagID: string): void {
    updateWorkspace({
        tagIDs: workspace.value?.tagIDs.filter((id) => id !== tagID) || [],
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
    workspace.value.positiveEditor = newWorkspace.positiveEditor || workspace.value.positiveEditor
    workspace.value.negativeEditor = newWorkspace.negativeEditor || workspace.value.negativeEditor
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
    workspace.value.name = storage.getWorkspaceByID(props.workspaceID)?.name || '未命名'
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

const tagCollection = useTemplateRef('tag-collection')
async function handleFindPromptAndScroll(prompt: string): Promise<void> {
    for (const tag of workspaceTags.value) {
        const prompts = storage.getPromptsByTag(tag.id)
        const index = prompts.findIndex((p) => p.text === prompt)
        if (index !== -1) {
            selectedTagID.value = tag.id
            await nextTick()
            tagCollection.value?.scrollPromptIntoView(prompt)
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
    workspaceTags.value.forEach((tag) => {
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
    workspaceTags.value.forEach((tag) => {
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
        workspace.value.tagIDs.length > 0 && workspace.value.tagIDs.length < storage.tags.size
    updateWorkspace({})
}

function handleCheckUsedTags(value: CheckboxValueType): void {
    indeterminateAll.value = false
    selectAllTags.value = false
    if (value) {
        workspace.value.tagIDs = usedTagIDs.value.filter((id) => storage.tags.has(id))
    } else {
        workspace.value.tagIDs.length = 0
    }
    updateWorkspace({})
}

watch(
    () => props.workspaceID,
    () => {
        workspace.value = storage.getWorkspaceByID(props.workspaceID) ?? defaultWorkspace()
        if (!workspace.value.id) {
            ElMessage.error('工作区未找到')
        } else {
            loadSearchPromptOptions()
        }
    },
    { immediate: true }
)

const handleReorderTags = (tagIDs: string[]): void => {
    updateWorkspace({ tagIDs })
}

const handleSelectTags = (tagIDs: string[]): void => {
    if (tagIDs.length > workspaceTags.value.length) {
        const val = tagIDs[tagIDs.length - 1]
        tagIDs.length--
        tagIDs.unshift(val)
        updateWorkspace({ tagIDs })
    } else if (tagIDs.length < workspaceTags.value.length) {
        updateWorkspace({ tagIDs })
    }
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

const tagListRef = useTemplateRef('tag-list')
function handleFindTag(tagID: string): void {
    if (!tagID) {
        selectedTagID.value = UNCATEGORIZED_TAG_ID
        return
    }
    selectedTagID.value = tagID
    tagListRef.value?.scrollTagIntoView(tagID)
}
</script>
