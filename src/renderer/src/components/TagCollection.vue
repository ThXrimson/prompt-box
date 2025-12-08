<template>
    <div
        ref="tag-card"
        class="tag-collection flex h-full [&>*]:mr-2 border-2 border-gray-200 rounded-lg p-2 pr-0 bg-white"
        @click="handleClickBackground"
    >
        <div class="h-full flex-2 flex flex-col [&>*]:mr-2 gap-1.5">
            <div class="header flex justify-between gap-0.5">
                <el-text class="font-bold">{{ tag.text }}</el-text>
            </div>

            <div class="add-prompt-wrapper">
                <el-input
                    v-model="promptInput"
                    placeholder="添加或筛选"
                    clearable
                    @keyup.enter="createAddPrompt"
                >
                    <template #prefix>
                        <el-button :icon="Plus" link @click="createAddPrompt" />
                    </template>
                </el-input>
            </div>

            <el-scrollbar
                always
                class="mr-0!"
                view-class="prompt-container gap-1.5 min-w-60 pr-2.5 flex flex-wrap"
            >
                <PromptCard
                    v-for="prompt in promptView"
                    :key="prompt.id"
                    :ref="promptCards.set"
                    :prompt="prompt"
                    :selected="usedPromptIds.includes(prompt.id)"
                    :prompt-image-file-name="promptImageFileName[prompt.id]"
                    @add-to-workspace="(prompt) => emit('add-to-workspace', prompt)"
                    @remove="removeThisTagId($event)"
                    @select="(promptId) => (selectedPromptId = promptId)"
                />
            </el-scrollbar>
        </div>
        <div v-if="!isNil(selectedPromptId)" class="h-full flex-1 flex flex-col min-w-90">
            <el-scrollbar class="border-2 border-gray-200 rounded-lg p-2 mb-2">
                <PromptDetail :prompt-id="selectedPromptId" />
            </el-scrollbar>
            <div class="flex">
                <el-button type="info" class="flex-1" @click="selectedPromptId = undefined">
                    <el-icon size="16"><CaretForward /></el-icon>
                </el-button>
                <el-button type="danger" class="flex-10" @click="deletePrompt(selectedPromptId)">
                    删除
                </el-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, DeepReadonly, nextTick, ref, watch } from 'vue'
import { UNCATEGORIZED_TAG_ID, type Tag } from '@shared/models/tag'
import { useDataStore } from '@renderer/stores/data'
import { matchTextPlus } from '@renderer/utils/pinyin-includes'
import PromptCard from '@renderer/components/PromptCard.vue'
import { Plus } from '@element-plus/icons-vue'
import { ElInput } from 'element-plus'
import { useTemplateRefsList } from '@vueuse/core'
import { Prompt } from '@shared/models/prompt'
import { isNil } from 'lodash'
import { Nullish } from 'utility-types'
import { CaretForward } from '@vicons/ionicons5'

const props = withDefaults(
    defineProps<{
        tag: Tag
        usedPromptIds?: string[]
    }>(),
    { usedPromptIds: () => [] as string[] }
)

const emit = defineEmits<{
    (e: 'add-to-workspace', prompt: Prompt): void
}>()

const selectedPromptId = ref<string | Nullish>(undefined)
const selectPrompt = (promptId: string): void => {
    selectedPromptId.value = promptId
}

const promptCards = useTemplateRefsList<InstanceType<typeof PromptCard>>()

const dataStore = useDataStore()

const promptInput = ref<string>('')
const editPromptDialogVisible = ref(false)
const editingPromptID = ref<string | null>(null)
const prompts = computed(() => {
    if (props.tag.id === UNCATEGORIZED_TAG_ID) {
        return dataStore.prompt.readonly.filter((p) => p.tagIds.length === 0)
    }
    const prompts = dataStore.prompt.readonly
    const result = [] as DeepReadonly<Prompt>[]
    for (const prompt of prompts) {
        if (!prompt.tagIds.includes(props.tag.id)) {
            continue
        }
        result.push(prompt)
    }
    return result
})
const promptView = computed(() => {
    const filtered = prompts.value.filter(
        (prompt) =>
            matchTextPlus(prompt.text, promptInput.value) ||
            (prompt.translation.length > 0 && matchTextPlus(prompt.translation, promptInput.value))
    )

    return filtered.sort((a, b) => {
        // 按 [使用，评分（降序），文本，更新时间（降序）] 排序
        const aUsed = props.usedPromptIds.includes(a.id) ? 1 : 0
        const bUsed = props.usedPromptIds.includes(b.id) ? 1 : 0
        const diffUsed = bUsed - aUsed
        if (diffUsed !== 0) {
            return diffUsed
        }
        const diffRate = b.rate - a.rate
        if (diffRate !== 0) {
            return diffRate
        }
        const diffText = a.text.localeCompare(b.text)
        if (diffText !== 0) {
            return diffText
        }
        return b.updateTime - a.updateTime
    })
})
const promptImageFileName = computed(() => {
    const promptIdToImageFileName = {} as Record<string, string>
    for (const prompt of promptView.value) {
        for (const exampleId of prompt.exampleIds) {
            const index = dataStore.example.readonly.findIndex((e) => e.id === exampleId)
            if (index === -1) {
                continue
            }
            const example = dataStore.example.readonly[index]
            for (const imageId of example.imageIds) {
                const image = dataStore.image.readonly.find((i) => i.id === imageId)
                if (image) {
                    promptIdToImageFileName[prompt.id] = image.fileName
                    break
                }
            }
        }
    }
    return promptIdToImageFileName
})

defineExpose({
    scrollPromptIntoView: async (prompt: string) => {
        promptInput.value = ''
        await nextTick()
        const promptElement = promptCards.value?.find((p) => p.promptText === prompt)
        if (promptElement) {
            promptElement.$el.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center',
            })
            promptElement?.glow()
        }
    },
    selectPrompt,
})

async function createAddPrompt(): Promise<void> {
    promptInput.value = promptInput.value.trim()
    if (promptInput.value === '') {
        return
    }
    if (prompts.value.some((p) => p.text === promptInput.value)) {
        return
    }
    if (props.tag.id !== UNCATEGORIZED_TAG_ID) {
        for (const prompt of dataStore.prompt.readonly) {
            if (prompt.text === promptInput.value) {
                const success = await dataStore.prompt.update({
                    id: prompt.id,
                    tagIds: [props.tag.id, ...prompt.tagIds],
                })
                if (success) {
                    ElMessage.success(`提示词已存在，并添加到标签: ${props.tag.text}`)
                } else {
                    ElMessage.error('添加提示词时更新标签失败')
                }
                return
            }
        }
    }
    const tags: string[] = []
    if (props.tag.id !== UNCATEGORIZED_TAG_ID) {
        tags.push(props.tag.id)
    }
    const newPrompt = await dataStore.prompt.create({
        text: promptInput.value,
        tagIds: tags,
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
async function removeThisTagId(promptId: string): Promise<void> {
    const prompt = dataStore.prompt.readonly.find((p) => p.id === promptId)
    if (isNil(prompt)) {
        ElMessage.error('提示词不存在')
        return
    }
    const res = await dataStore.prompt.update({
        id: promptId,
        tagIds: prompt.tagIds.filter((id) => id !== props.tag.id),
    })
    if (res) {
        ElMessage.success('提示词移除成功')
    } else {
        ElMessage.error('提示词移除失败')
    }
}
async function deletePrompt(id: string): Promise<void> {
    try {
        await ElMessageBox.confirm('确定删除此提示词？', '删除提示词', {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
        })
        selectedPromptId.value = undefined
        const res = await dataStore.prompt.delete(id)
        if (res) {
            ElMessage.success('成功删除提示词')
        } else {
            ElMessage.error('删除提示词失败')
        }
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error('删除提示词失败')
        }
    }
}
// 点击背景关闭 Prompt 侧栏
function handleClickBackground(e: MouseEvent): void {
    if (!(e.target instanceof HTMLElement)) {
        return
    }
    for (const c of e.target.classList) {
        if (c.startsWith('el-scrollbar')) {
            selectedPromptId.value = undefined
        }
    }
}
</script>

<style lang="css" scoped>
@reference 'tailwindcss';

.tag-collection {
    transition: border-color 0.3s ease-in-out;
}
</style>
