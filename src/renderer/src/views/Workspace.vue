<template>
    <div class="my-2 mx-2 flex-1 min-h-0 min-w-0 flex flex-col">
        <!-- 导航栏 -->
        <navigator>
            <div class="flex gap-2 justify-start">
                <el-text
                    truncated
                    class="font-bold! cursor-pointer max-w-24!"
                    @click="openWorkspaceNameDialog"
                >
                    {{ workspace?.name || '未命名' }}
                </el-text>
                <el-dialog v-model="showWorkspaceNameDialog" title="编辑工作区名称">
                    <el-input
                        v-model="tempWorkspaceText"
                        placeholder="请输入工作区名称"
                        clearable
                        @keyup.enter="confirmEditWorkspaceName(tempWorkspaceText)"
                        @keyup.esc.stop.prevent="showWorkspaceNameDialog = false"
                    />
                    <template #footer>
                        <el-button @click="showWorkspaceNameDialog = false">取消</el-button>
                        <el-button
                            type="primary"
                            @click="confirmEditWorkspaceName(tempWorkspaceText)"
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
                    <TagEditor />
                </el-dialog>

                <el-select-v2
                    model-value=""
                    :options="searchPromptOptions"
                    :filter-method="(query) => (searchPromptInput = query)"
                    :props="{
                        label: 'text',
                        value: 'text',
                    }"
                    filterable
                    placeholder="查找提示词"
                    clearable
                    class="flex-1 min-w-0"
                    @update:model-value="findPromptAndScroll($event)"
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
                    :filter-method="(query) => (filterFocusTagInput = query)"
                    placeholder="查找标签"
                    clearable
                    class="flex-1 min-w-0"
                    @update:model-value="findTag"
                />

                <el-select-v2
                    v-model="workspaceTagIds"
                    :options="tagOptions"
                    :props="{
                        label: 'text',
                        value: 'id',
                    }"
                    filterable
                    :filter-method="(query) => (tagFilterInput = query)"
                    placeholder="选择标签"
                    multiple
                    collapse-tags-tooltip
                    clearable
                    collapse-tags
                    class="flex-1 min-w-0"
                >
                    <template #header>
                        <el-checkbox v-model="selectAllTags" :indeterminate="indeterminateAll">
                            全选
                        </el-checkbox>
                        <el-checkbox v-model="selectUsedTags"> 已使用 </el-checkbox>
                    </template>
                </el-select-v2>
            </div>
        </navigator>
        <!-- 标签列表 -->
        <div class="flex-1 flex overflow-auto mt-2 gap-1">
            <TagList
                ref="tag-list"
                v-model:tag-ids="workspaceTagIds"
                :selected-id="selectedTagId"
                class="flex-1 min-w-0 max-w-[12rem]"
                @close-tag="(id) => closeTag(id)"
                @select="(id) => (selectedTagId = id)"
            />
            <TagCollection
                ref="tag-collection"
                :tag="selectedTag"
                :used-prompt-ids="usedPromptIds"
                class="flex-1 min-w-0"
                @add-to-workspace="(prompt) => editor?.addPromptTag(prompt)"
            />
        </div>
        <!-- 工作区编辑器 -->
        <WorkspaceEditor
            ref="editor"
            :workspace-id="workspaceId"
            @select-prompt="(promptId) => tagCollection?.selectPrompt(promptId)"
        />
    </div>
</template>

<script setup lang="ts">
import { useDataStore } from '@renderer/stores/data'
import { computed, DeepReadonly, nextTick, ref, useTemplateRef } from 'vue'
import { Discount } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import TagEditor from '@renderer/components/TagEditor.vue'
import { matchTextPlus } from '@renderer/utils/pinyin-includes'
import TagList from '@renderer/components/TagList.vue'
import { newUncategorizedTag, UNCATEGORIZED_TAG_ID } from '@shared/models/tag'
import { clone, intersection, isNil, uniq, xor } from 'lodash'
import {
    isGroupPromptTag,
    isLoraPromptTag,
    isMonoPromptTag,
    isSpecialPromptTag,
    PromptTag,
} from '@shared/models/prompt-tag'

const dataStore = useDataStore()
const workspace = computed(() => {
    return dataStore.workspace.readonly.find((w) => w.id === props.workspaceId)
})
const workspaceTagIds = computed({
    get() {
        return (clone(workspace.value?.tagIds) as string[]) || []
    },
    set(newVal) {
        if (isNil(workspace.value)) {
            ElMessage.error('工作区不存在')
            return
        }
        dataStore.workspace.update({
            id: workspace.value.id,
            tagIds: newVal as string[],
        })
    },
})
const workspaceTags = computed(() =>
    dataStore.tag.readonly.filter((t) => workspaceTagIds.value.includes(t.id))
)

const selectedTagId = ref(UNCATEGORIZED_TAG_ID)
const selectedTag = computed(() => {
    return (
        dataStore.tag.readonly.find((tag) => tag.id === selectedTagId.value) ??
        newUncategorizedTag()
    )
})
const tagFilterInput = ref('')
const tagOptions = computed(() => {
    return [newUncategorizedTag()].concat(...dataStore.tag.readonly).filter((tag) => {
        return matchTextPlus(tag.text, tagFilterInput.value)
    })
})

const editor = useTemplateRef('editor')

const props = defineProps<{
    workspaceId: string
}>()

const tempWorkspaceText = ref('')
const showWorkspaceNameDialog = ref(false)

const filterFocusTagInput = ref('')
const tagFocusOptions = computed(() => {
    return workspaceTags.value.filter((tag) => matchTextPlus(tag.text, filterFocusTagInput.value))
})

const tagDialogVisible = ref(false)

async function closeTag(tagId: string): Promise<void> {
    if (isNil(workspace.value)) {
        ElMessage.error('工作区不存在')
        return
    }
    await dataStore.workspace.update({
        id: workspace.value.id,
        tagIds: workspaceTagIds.value.filter((id) => id !== tagId),
    })
}

function openWorkspaceNameDialog(): void {
    tempWorkspaceText.value = workspace.value?.name ?? '未知工作区'
    showWorkspaceNameDialog.value = true
}

async function confirmEditWorkspaceName(name: string): Promise<void> {
    if (!name.trim()) {
        ElMessage.warning('工作区名称不能为空')
        return
    }
    if (isNil(workspace.value)) {
        ElMessage.error('工作区不存在')
        return
    }
    await dataStore.workspace.update({
        id: workspace.value.id,
        name,
    })
    showWorkspaceNameDialog.value = false
}

const tagCollection = useTemplateRef('tag-collection')
async function findPromptAndScroll(prompt: string): Promise<void> {
    for (const tag of workspaceTags.value) {
        const prompts = dataStore.prompt.readonly.filter((p) => p.tagIds.includes(tag.id))
        const index = prompts.findIndex((p) => p.text === prompt)
        if (index !== -1) {
            selectedTagId.value = tag.id
            await nextTick()
            tagCollection.value?.scrollPromptIntoView(prompt)
            return
        }
    }
}

const searchPromptInput = ref('')
const searchPromptOptions = computed(() => {
    const options: { text: string; translation: string }[] = []
    const seen = new Set<string>()
    for (const tag of workspaceTags.value) {
        const prompts = dataStore.prompt.readonly.filter((p) => p.tagIds.includes(tag.id))
        for (const prompt of prompts) {
            if (seen.has(prompt.text + prompt.translation)) continue
            seen.add(prompt.text + prompt.translation)
            options.push({
                text: prompt.text,
                translation: prompt.translation || '',
            })
        }
    }
    return options.filter((item) => {
        return (
            matchTextPlus(item.text, searchPromptInput.value) ||
            matchTextPlus(item.translation, searchPromptInput.value)
        )
    })
})

function getPromptIdsFromTag(promptTag: DeepReadonly<PromptTag>): string[] {
    const ids = [] as string[]
    if (isMonoPromptTag(promptTag)) {
        for (const prompt of dataStore.prompt.readonly) {
            if (prompt.text === promptTag.text) {
                ids.push(prompt.id)
            }
        }
    } else if (isGroupPromptTag(promptTag)) {
        for (const sub of promptTag.subTags) {
            for (const prompt of dataStore.prompt.readonly) {
                if (prompt.text === sub.text) {
                    ids.push(prompt.id)
                }
            }
        }
    } else if (isLoraPromptTag(promptTag)) {
        for (const prompt of dataStore.prompt.readonly) {
            if (prompt.text === promptTag.text) {
                ids.push(prompt.id)
            }
        }
    } else if (isSpecialPromptTag(promptTag)) {
        for (const prompt of dataStore.prompt.readonly) {
            if (prompt.text === promptTag.text) {
                ids.push(prompt.id)
            }
        }
    }
    return ids
}
const usedPromptIds = computed(() => {
    if (isNil(workspace.value)) {
        return []
    }
    const ids = [] as string[]
    for (const promptTag of workspace.value.positive) {
        ids.push(...getPromptIdsFromTag(promptTag))
    }
    for (const promptTag of workspace.value.negative) {
        ids.push(...getPromptIdsFromTag(promptTag))
    }
    return uniq(ids)
})
const usedTagIds = computed(() => {
    const ids = [] as string[]
    for (const prompt of dataStore.prompt.readonly) {
        if (usedPromptIds.value.includes(prompt.id)) {
            ids.push(...prompt.tagIds)
        }
    }
    return uniq(ids)
})

// 全选、已使用标签
const selectAllTags = computed({
    get() {
        const allTagIds = dataStore.tag.readonly.map((tag) => tag.id)
        return xor(workspaceTagIds.value, allTagIds).length === 0
    },
    set(value: boolean) {
        if (value) {
            const allTagIds = dataStore.tag.readonly.map((tag) => tag.id)
            workspaceTagIds.value = allTagIds
        } else {
            workspaceTagIds.value = []
        }
    },
})
const indeterminateAll = computed(
    () => intersection(workspaceTagIds.value, usedTagIds.value).length !== 0
)
const selectUsedTags = computed({
    get() {
        return xor(workspaceTagIds.value, usedTagIds.value).length === 0
    },
    set(value: boolean) {
        if (value) {
            workspaceTagIds.value = usedTagIds.value
        } else {
            workspaceTagIds.value = []
        }
    },
})

const tagListRef = useTemplateRef('tag-list')
function findTag(tagId: string): void {
    if (!tagId) {
        selectedTagId.value = UNCATEGORIZED_TAG_ID
        return
    }
    selectedTagId.value = tagId
    tagListRef.value?.scrollTagIntoView(tagId)
}
</script>
