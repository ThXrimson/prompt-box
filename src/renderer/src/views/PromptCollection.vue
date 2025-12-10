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
                                    <el-text :class="{ 'text-blue-400!': sortKind === 'text' }">
                                        {{ `名称${sortByTextAsc ? '升序' : '降序'}` }}
                                    </el-text>
                                </el-dropdown-item>
                                <el-dropdown-item @click="handleSortByTime">
                                    <el-text :class="{ 'text-blue-400!': sortKind === 'time' }">
                                        {{ `时间${sortByCreateTimeAsc ? '升序' : '降序'}` }}
                                    </el-text>
                                </el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </el-tooltip>
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
                    v-model="filteredTagIds"
                    :options="filterTagOptions"
                    filterable
                    :filter-method="filterTagMethod"
                    placeholder="过滤标签"
                    style="width: 240px"
                    multiple
                    collapse-tags
                    collapse-tags-tooltip
                    clearable
                    :reserve-keyword="false"
                />

                <el-input v-model="searchPromptInput" spellcheck="false" placeholder="搜索提示词">
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
                    @click="createPrompt"
                >
                    添加提示词
                </el-button>
                <el-input
                    v-else
                    ref="promptInput"
                    v-model="newPromptText"
                    spellcheck="false"
                    @keyup.enter="confirmCreatePrompt"
                    @keyup.esc="cancelCreatePrompt"
                >
                    <template #suffix>
                        <div class="flex items-center gap-1">
                            <el-icon
                                class="cursor-pointer hover:text-gray-500!"
                                @click="confirmCreatePrompt"
                            >
                                <Check />
                            </el-icon>
                            <el-icon
                                class="cursor-pointer hover:text-gray-500!"
                                @click="cancelCreatePrompt"
                            >
                                <Close />
                            </el-icon>
                        </div>
                    </template>
                </el-input>

                <el-divider class="my-2!" />

                <div
                    v-for="(prompt, index) in promptViews"
                    :key="prompt.id"
                    @click="selectPrompt(prompt.id)"
                >
                    <div
                        class="flex justify-between items-center-safe w-full h-fit py-1 px-2 rounded border-gray-200 hover:bg-gray-100 focus:bg-gray-200 cursor-pointer [&_.delete-button]:hover:opacity-100!"
                        :class="{
                            'bg-gray-200': selectedPromptId === prompt.id,
                            'hover:bg-gray-300': selectedPromptId === prompt.id,
                        }"
                    >
                        <div class="flex flex-col flex-1 min-w-0">
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
                            title="确定删除此提示词？"
                            :hide-after="0"
                            @confirm.stop="deletePrompt(prompt.id)"
                        >
                            <template #reference>
                                <el-icon
                                    class="delete-button opacity-0! text-gray-400! hover:text-gray-600! transition-colors duration-200"
                                    :class="{
                                        'opacity-100!': selectedPromptId === prompt.id,
                                    }"
                                >
                                    <Delete />
                                </el-icon>
                            </template>
                        </el-popconfirm>
                    </div>

                    <el-divider v-if="index < promptViews.length - 1" class="my-2!" />
                </div>
            </el-scrollbar>
            <el-scrollbar
                class="bg-white border-2 box-border border-gray-200 rounded-lg p-3 flex-1"
            >
                <PromptDetail v-if="!isNil(selectedPromptId)" :prompt-id="selectedPromptId" />
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
    Delete,
} from '@element-plus/icons-vue'
import { computed, DeepReadonly, nextTick, ref, useTemplateRef } from 'vue'
import { useDataStore } from '@renderer/stores/data'
import TagEditor from '@renderer/components/TagEditor.vue'
import { matchTextPlus } from '@renderer/utils/pinyin-includes'
import type { Prompt } from '@shared/models/prompt'
import { isNil } from 'lodash'
import { UNCATEGORIZED_TAG_ID } from '@shared/models/tag'
import { createError, existsError, notFoundError } from '@renderer/stores/error'
import log from 'electron-log/renderer'

const dataStore = useDataStore()

const searchPromptInput = ref<string>('')
const filteredTagIds = ref<string[]>([])
const selectedPromptId = ref<string | null>(null)

const filterTagInput = ref<string>('')
function filterTagMethod(text: string): void {
    filterTagInput.value = text
}
const filterTagOptions = computed(() => {
    return [
        {
            label: '未分类',
            value: UNCATEGORIZED_TAG_ID,
        },
        ...dataStore.tag.readonly
            .filter((tag) => {
                return matchTextPlus(tag.text, filterTagInput.value)
            })
            .map((tag) => {
                return {
                    label: tag.text,
                    value: tag.id,
                }
            }),
    ]
})

const filterPromptMethod = (prompt: DeepReadonly<Prompt>, text: string): boolean => {
    const promptText = prompt.text.trim().toLowerCase()
    const translationText = prompt.translation?.trim().toLowerCase() || ''
    return matchTextPlus(promptText, text) || matchTextPlus(translationText, text)
}
const promptViews = computed(() => {
    const tagIdSet = new Set(filteredTagIds.value)
    return (
        dataStore.prompt.readonly
            // 搜索过滤
            .filter((prompt) => {
                if (searchPromptInput.value.trim() === '') {
                    return true
                }
                return filterPromptMethod(prompt, searchPromptInput.value.trim().toLowerCase())
            })
            // Tag 过滤
            .filter((prompt) => {
                if (tagIdSet.size === 0) {
                    return true
                }
                if (tagIdSet.has(UNCATEGORIZED_TAG_ID) && prompt.tagIds.length === 0) {
                    // 未分类的提示词
                    return true
                }
                return prompt.tagIds.some((id) => tagIdSet.has(id))
            })
            .toSorted(
                sortKind.value === 'text'
                    ? sortByText(sortByTextAsc.value)
                    : sortByCreateTime(sortByCreateTimeAsc.value)
            )
    )
})

const tagDialogVisible = ref(false)

//#region 处理Prompt排序
const sortByText = (asc: boolean) => {
    return (a: DeepReadonly<Prompt>, b: DeepReadonly<Prompt>): number => {
        return a.text.localeCompare(b.text) * (asc ? 1 : -1)
    }
}
const sortByCreateTime = (asc: boolean) => {
    return (a: DeepReadonly<Prompt>, b: DeepReadonly<Prompt>): number => {
        return (a.createTime - b.createTime) * (asc ? 1 : -1)
    }
}
const sortByTextAsc = ref(true)
const sortByCreateTimeAsc = ref(false)
const enum SortKind {
    Text = 'text',
    Time = 'time',
}
const sortKind = ref<SortKind>(SortKind.Time)
function handleSortByText(): void {
    if (sortKind.value === SortKind.Text) {
        sortByTextAsc.value = !sortByTextAsc.value
    } else {
        sortByCreateTimeAsc.value = true
        sortKind.value = SortKind.Text
    }
}
function handleSortByTime(): void {
    if (sortKind.value === SortKind.Time) {
        sortByCreateTimeAsc.value = !sortByCreateTimeAsc.value
    } else {
        sortByTextAsc.value = false
        sortKind.value = SortKind.Time
    }
}
//#endregion

//#region 添加 Prompt
const creatingPrompt = ref(false)
const newPromptText = ref('')
const promptInput = useTemplateRef('promptInput')

function createPrompt(): void {
    creatingPrompt.value = true
    nextTick(() => {
        promptInput.value?.focus()
    })
}

async function confirmCreatePrompt(): Promise<void> {
    if (!creatingPrompt.value) return
    const promptText = newPromptText.value.trim()
    if (promptText === '') {
        creatingPrompt.value = false
        return
    }
    try {
        await dataStore.prompt.create({
            text: promptText,
        })
        newPromptText.value = ''
        ElMessage.success('成功添加提示词')
    } catch (err) {
        if (err === existsError) {
            ElMessage.warning('提示词已存在')
        } else if (err === createError) {
            ElMessage.error('添加提示词失败')
        } else {
            ElMessage.error('添加提示词失败，未知错误')
            log.error('添加提示词失败，未知错误: ', err)
        }
    }
    creatingPrompt.value = false
}

function cancelCreatePrompt(): void {
    newPromptText.value = ''
    creatingPrompt.value = false
}
//#endregion

function selectPrompt(id: string): void {
    if (selectedPromptId.value !== id) {
        selectedPromptId.value = id
    }
}

async function deletePrompt(id: string): Promise<void> {
    try {
        selectedPromptId.value = null
        await dataStore.prompt.delete(id)
        ElMessage.success('成功删除提示词')
    } catch (err) {
        if (err === notFoundError) {
            ElMessage.warning('提示词不存在')
        } else {
            ElMessage.error('删除提示词失败，未知错误')
            log.error('删除提示词失败，未知错误: ', err)
        }
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
