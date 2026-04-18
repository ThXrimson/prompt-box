<template>
    <el-scrollbar class="flex flex-col gap-2 flex-1 min-h-0 pr-3">
        <div>
            <el-rate v-model="promptRate" :max="10" />
        </div>
        <div>
            <el-text class="edit-header">提示词</el-text>
            <el-button :icon="CopyDocument" link @click="copyPromptText(promptText)" />
            <el-segmented
                v-model="promptKind"
                :options="promptKindOptions"
                size="small"
                inline-prompt
                active-text="LORA"
                inactive-text="普通"
            />
            <el-input v-model.lazy="promptText" spellcheck="false" placeholder="请输入提示词" />
        </div>
        <div>
            <div class="flex gap-1">
                <el-text class="edit-header">翻译</el-text>
                <el-tooltip content="点击使用 DeepLX 翻译" :hide-after="0" placement="top">
                    <el-button link :icon="Language" :loading="isTranslating" :disabled="isTranslating" @click="translateByDeepLX" />
                </el-tooltip>
                <el-button
                    :icon="CopyDocument"
                    link
                    class="ml-0!"
                    @click="copyText(promptTranslation)"
                />
            </div>
            <el-input
                v-model.lazy="promptTranslation"
                spellcheck="false"
                placeholder="请输入翻译"
            />
        </div>
        <div>
            <el-text class="edit-header">标签</el-text>
            <el-select
                v-model.lazy="promptTags"
                value-key="id"
                multiple
                filterable
                :filter-method="(text) => (filterTagInput = text)"
                allow-create
                default-first-option
                :reserve-keyword="false"
                placeholder="请选择或输入标签"
            >
                <el-option v-for="tag in tagOptions" :key="tag.id" :label="tag.text" :value="tag" />
            </el-select>
        </div>
        <div>
            <el-text class="edit-header">描述</el-text>
            <el-button :icon="CopyDocument" link @click="copyText(promptDescription)" />
            <el-input
                v-model.lazy="promptDescription"
                spellcheck="false"
                placeholder="请输入描述"
            />
        </div>
        <div>
            <!-- <el-text class="edit-header">来源</el-text> -->
            <el-link
                type="primary"
                :href="promptSource"
                :disabled="!promptSourceValid"
                target="_blank"
            >
                来源
            </el-link>
            <el-button :icon="CopyDocument" link @click="copyText(promptSource)" />
            <el-input
                v-model.lazy="promptSource"
                spellcheck="false"
                type="url"
                placeholder="请输入来源"
            >
                <template #suffix>
                    <el-icon
                        v-show="!promptSourceValid"
                        size="1.2rem"
                        color="red"
                        class="align-middle"
                    >
                        <Warning />
                    </el-icon>
                </template>
            </el-input>
        </div>
        <div>
            <el-text class="edit-header">相关词</el-text>
            <el-button :icon="CopyDocument" link @click="copyText(promptRelatedTexts.join(', '))" />
            <el-input-tag
                v-model="promptRelatedTexts"
                draggable
                placeholder="添加相关词"
                delimiter=","
                collapse-tags
                collapse-tags-tooltip
                :max-collapse-tags="12"
            >
                <template #tag="{ value }">
                    <div class="flex items-center">
                        <el-icon class="mr-1" @click="copyText(value)">
                            <CopyDocument />
                        </el-icon>
                        <span>{{ value }}</span>
                    </div>
                </template>
            </el-input-tag>
        </div>
        <div class="image flex flex-col flex-1 min-h-0">
            <el-text class="edit-header self-start!">示例</el-text>
            <div class="flex-1 min-h-0 flex flex-col">
                <div class="flex flex-wrap gap-2 mb-2">
                    <el-button
                        type="success"
                        :icon="CirclePlusFilled"
                        class="ml-0! self-start!"
                        @click="createAddExample"
                    >
                        添加示例
                    </el-button>
                    <el-button
                        type="success"
                        :icon="CirclePlusFilled"
                        class="ml-0! self-start!"
                        @click="handleOpenAddExampleFromExistingDialog"
                    >
                        从已有示例添加
                    </el-button>
                    <el-button
                        type="success"
                        :icon="CirclePlusFilled"
                        class="ml-0! self-start!"
                        @click="openCreateImageDialog"
                    >
                        添加示例图片
                    </el-button>
                </div>
                <div
                    v-if="examples.length > 0"
                    class="flex flex-col gap-2 flex-1 min-h-0 border-2 border-(--color-border) rounded-md px-1"
                >
                    <div
                        v-for="example in examples"
                        :key="example.id"
                        class="flex flex-col justify-between gap-2 my-1.5"
                    >
                        <ExampleView :example-id="example.id" :prompt-id="promptId" />
                    </div>
                </div>
            </div>
        </div>
    </el-scrollbar>

    <!-- 从已有添加示例 -->
    <el-dialog
        v-model="addExampleFromExistingVisible"
        title="从已有示例添加"
        align-center
        class="w-auto! max-w-[80vw] h-[80vh] flex flex-col"
        body-class="flex flex-col flex-1 min-h-0"
        append-to-body
    >
        <el-scrollbar
            class="flex-1 min-h-0 border-2 border-(--color-border) rounded-md px-1"
            view-class="columns-4 gap-1"
        >
            <template v-for="example in currentExampleCandidates" :key="example.id">
                <el-image
                    :src="exampleCandidateCoverUrls.get(example.id)"
                    fit="contain"
                    loading="lazy"
                    class="m-1 rounded-md cursor-pointer hover:shadow-lg transition-shadow duration-300"
                    @click="addExample(example.id)"
                />
            </template>
        </el-scrollbar>
        <el-pagination
            v-model:current-page="currentExampleCandidatePage"
            :page-size="exampleCandidatePageSize"
            class="flex-0.5 min-h-0 justify-center-safe"
            layout="prev, pager, next"
            :total="exampleCandidates.length"
        />
    </el-dialog>

    <!--添加图片对话框-->
    <el-dialog
        v-model="createImageDialogVisible"
        title="添加图片"
        @keyup.esc.stop.prevent="cancelCreateImage"
    >
        <el-text>图片地址（URL或本地文件）</el-text>
        <div class="flex gap-2">
            <el-input v-model="candidateImage" @paste="handlePaste" @drop.prevent="handleDrop" />
            <el-button type="success" @click="selectImageFile"> 选择图片 </el-button>
        </div>
        <template #footer>
            <div>
                <el-button type="primary" @click="confirmCreateImage"> 确定 </el-button>
                <el-button type="danger" @click="cancelCreateImage"> 取消 </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useDataStore } from '@renderer/stores/data'
import { CirclePlusFilled, CopyDocument, Warning } from '@element-plus/icons-vue'
import { isNil } from 'lodash'
import type { Tag } from '@shared/models/tag'
import { matchTextPlus } from '@renderer/utils/pinyin-includes'
import { createError, existsError, notFoundError } from '@renderer/stores/error'
import { Nullish } from 'utility-types'
import { Example } from '@shared/models/example'
import ExampleView from './ExampleView.vue'
import { getImageUrl, isValidUrl } from '@renderer/utils/utils'
import { Language } from '@vicons/ionicons5'
import { ElMessageBox } from 'element-plus'
import { PromptKind } from '@shared/models/prompt'
import log from 'electron-log/renderer'
import { useRouter } from 'vue-router'
import { handleError } from '@renderer/utils/error-handler'

const props = defineProps<{
    promptId: string
}>()
const router = useRouter()
const dataStore = useDataStore()
const prompt = computed(() => {
    return dataStore.prompt.readonly.find((p) => p.id === props.promptId) ?? null
})
watch(
    () => prompt.value,
    (val) => {
        if (isNil(val)) {
            handleError('提示词不存在或已被删除')
            router.push('/prompt-collection')
        }
    },
    { immediate: true }
)

// 编辑 Prompt 相关数据
function copyPromptText(text: string): void {
    copyText(text)
}
const promptKind = computed({
    get() {
        return prompt.value?.kind ?? PromptKind.Normal
    },
    set(newVal: PromptKind) {
        try {
            dataStore.prompt.update({
                id: props.promptId,
                kind: newVal,
            })
        } catch (e) {
            if (e === notFoundError) {
                ElMessage.error('未找到对应的提示词')
            } else {
                ElMessage.error('未知错误')
                log.error('未知错误: ', e)
            }
        }
    },
})
const promptKindOptions = [
    {
        label: '普通',
        value: PromptKind.Normal,
    },
    {
        label: 'LORA',
        value: PromptKind.Lora,
    },
    {
        label: '特殊',
        value: PromptKind.Special,
    },
]
const promptText = computed({
    get() {
        return prompt.value?.text ?? ''
    },
    async set(newVal: string) {
        try {
            await dataStore.prompt.update({
                id: props.promptId,
                text: newVal,
            })
        } catch (e) {
            if (e === existsError) {
                ElMessage.error('已存在同名的提示词')
            } else if (e === notFoundError) {
                ElMessage.error('未找到对应的提示词')
            } else {
                ElMessage.error('未知错误')
                log.error('未知错误: ', e)
            }
        }
    },
})
const promptTranslation = computed({
    get() {
        return prompt.value?.translation ?? ''
    },
    async set(newVal: string) {
        try {
            await dataStore.prompt.update({
                id: props.promptId,
                translation: newVal,
            })
        } catch (e) {
            if (e === notFoundError) {
                ElMessage.error('未找到对应的提示词')
            } else {
                ElMessage.error('未知错误')
                log.error('未知错误: ', e)
            }
        }
    },
})
const promptDescription = computed({
    get() {
        return prompt.value?.description ?? ''
    },
    async set(newVal: string) {
        try {
            await dataStore.prompt.update({
                id: props.promptId,
                description: newVal,
            })
        } catch (e) {
            if (e === notFoundError) {
                ElMessage.error('未找到对应的提示词')
            } else {
                ElMessage.error('未知错误')
                log.error('未知错误: ', e)
            }
        }
    },
})
const tags = computed(() => dataStore.tag.readonly)
const filterTagInput = ref('')
const tagOptions = computed(() => {
    return tags.value.filter((t) => matchTextPlus(t.text, filterTagInput.value))
})
const promptTags = computed({
    get() {
        const tags_ = [] as Tag[]
        for (const tagId of prompt.value?.tagIds ?? []) {
            const tag = tags.value.find((t) => t.id === tagId)
            if (!isNil(tag)) {
                tags_.push(tag)
            }
        }
        return tags_
    },
    async set(newVal: (Tag | string)[]) {
        for (const [index, t] of newVal.entries()) {
            if (typeof t === 'string') {
                try {
                    await ElMessageBox.confirm(`是否创建标签 ${t}？`, '确认', {
                        confirmButtonText: '确定',
                        cancelButtonText: '取消',
                        type: 'warning',
                    })
                    const newTag = await dataStore.tag.create(t)
                    newVal[index] = newTag
                } catch (error) {
                    if (error === createError) {
                        ElMessage.error('创建标签失败')
                        return
                    }
                    if (error !== 'cancel') {
                        ElMessage.error('创建标签失败')
                    }
                }
            }
        }
        try {
            await dataStore.prompt.update({
                id: props.promptId,
                tagIds: newVal.filter((t) => typeof t !== 'string').map((t) => t.id),
            })
        } catch (e) {
            if (e === notFoundError) {
                ElMessage.error('未找到对应的提示词')
            } else {
                ElMessage.error('未知错误')
                log.error('未知错误: ', e)
            }
        }
    },
})
const promptSource = computed({
    get() {
        return prompt.value?.source ?? ''
    },
    async set(newVal: string) {
        try {
            await dataStore.prompt.update({
                id: props.promptId,
                source: newVal,
            })
        } catch (e) {
            if (e === notFoundError) {
                ElMessage.error('未找到对应的提示词')
            } else {
                ElMessage.error('未知错误')
                log.error('未知错误: ', e)
            }
        }
    },
})
const promptSourceValid = computed(() => isValidUrl(promptSource.value))
const promptRelatedTexts = computed({
    get() {
        return (prompt.value?.relatedTexts ?? []) as string[]
    },
    async set(newVal: string[]) {
        newVal = newVal.map((t) => t.trim())
        try {
            await dataStore.prompt.update({
                id: props.promptId,
                relatedTexts: newVal,
            })
        } catch (e) {
            if (e === notFoundError) {
                ElMessage.error('未找到对应的提示词')
            } else {
                ElMessage.error('未知错误')
                log.error('未知错误: ', e)
            }
        }
    },
})
const examples = computed(() => {
    const promptIndex = dataStore.prompt.readonly.findIndex((p) => p.id === props.promptId)
    if (promptIndex === -1) {
        return []
    }
    const examples = dataStore.example.readonly
    const exampleIds = dataStore.prompt.readonly[promptIndex].exampleIds
    return examples.filter((e) => exampleIds.includes(e.id))
})
const currentExampleCandidatePage = ref(1)
const exampleCandidatePageSize = 10
const exampleCandidates = computed(() => {
    const exampleIdSet = new Set(examples.value.map((e) => e.id))
    return dataStore.example.readonly.filter(
        (e) => !exampleIdSet.has(e.id) && e.imageIds.length > 0
    )
})
const currentExampleCandidates = computed(() => {
    const start = (currentExampleCandidatePage.value - 1) * exampleCandidatePageSize
    const end = start + exampleCandidatePageSize
    return exampleCandidates.value.slice(start, end)
})
const exampleCandidateCoverUrls = computed(() => {
    const m = new Map<string, string>()
    for (const e of exampleCandidates.value) {
        const imageId = e.imageIds[0]
        const image = dataStore.image.readonly.find((i) => i.id === imageId)
        if (!isNil(image)) {
            m.set(e.id, getImageUrl(image.fileName))
        }
    }
    return m
})
const promptRate = computed({
    get() {
        return prompt.value?.rate ?? 0
    },
    set(newVal: number) {
        dataStore.prompt.update({
            id: props.promptId,
            rate: newVal,
        })
    },
})

//#region 更改 Prompt 内容

async function changeTranslation(text: string): Promise<void> {
    const prompt = dataStore.prompt.readonly.find((p) => p.id === props.promptId)
    if (isNil(prompt)) {
        ElMessage.error('未找到对应的提示词')
        return
    }
    const success = await dataStore.prompt.update({
        id: prompt.id,
        translation: text,
    })
    if (!success) {
        ElMessage.error('更新提示词翻译失败')
    }
}

async function translateByDeepLX(): Promise<void> {
    isTranslating.value = true
    try {
        const result = await window.api.other.translateByDeepLX(promptText.value)
        await changeTranslation(result)
    } catch (error) {
        const message = getTranslateErrorMessage(error)
        ElMessage.error(message)
    } finally {
        isTranslating.value = false
    }
}

function getTranslateErrorMessage(error: unknown): string {
    const msg = error instanceof Error ? error.message : ''
    if (msg.startsWith('TRANSLATE_TIMEOUT')) return '翻译超时，请稍后重试'
    if (msg.startsWith('TRANSLATE_SERVICE_ERROR')) return '翻译服务暂不可用'
    if (msg.startsWith('TRANSLATE_NETWORK_ERROR')) return '网络错误，请检查网络连接'
    return '翻译失败，请重试'
}

//#endregion

//#region 编辑示例
async function createAddExample(): Promise<Example | Nullish> {
    const example = await dataStore.example.create({})
    if (!isNil(example)) {
        const prompt = dataStore.prompt.readonly.find((p) => p.id === props.promptId)
        if (isNil(prompt)) {
            ElMessage.error('未找到对应的提示词')
            return null
        }
        const success = await dataStore.prompt.update({
            id: prompt.id,
            exampleIds: [...prompt.exampleIds, example.id],
        })
        if (!success) {
            ElMessage.error('添加示例失败')
        }
        ElMessage.success('添加示例成功')
        return example
    } else {
        ElMessage.error('添加示例失败')
        return null
    }
}
//#endregion

async function copyText(text?: string): Promise<void> {
    if (!text) {
        ElMessage.warning('没有可复制的文本')
        return
    }
    const success = await window.api.other.copyToClipboard(text)
    if (success) {
        ElMessage.success('已复制到剪贴板')
    } else {
        ElMessage.warning('复制失败，请重试')
    }
}

const addExampleFromExistingVisible = ref(false)
const isTranslating = ref(false)
function handleOpenAddExampleFromExistingDialog(): void {
    addExampleFromExistingVisible.value = true
}
async function addExample(exampleId: string): Promise<void> {
    const index = dataStore.prompt.readonly.findIndex((p) => p.id === props.promptId)
    if (index === -1) {
        ElMessage.error('提示词不存在')
        return
    }
    try {
        await dataStore.prompt.update({
            id: props.promptId,
            exampleIds: [...dataStore.prompt.readonly[index].exampleIds, exampleId],
        })
    } catch (error) {
        if (error === notFoundError) {
            ElMessage.error('提示词不存在')
        } else if (error === existsError) {
            ElMessage.error('示例已存在')
        } else {
            ElMessage.error('添加示例失败')
        }
    }
    ElMessage.success('添加示例成功')
}

const createImageDialogVisible = ref(false)
const candidateImage = ref('')
function openCreateImageDialog(): void {
    createImageDialogVisible.value = true
    candidateImage.value = ''
}
function cancelCreateImage(): void {
    createImageDialogVisible.value = false
    candidateImage.value = ''
}
function handlePaste(event: ClipboardEvent): void {
    if (event.clipboardData === null || event.clipboardData.items.length === 0) {
        return
    }
    const item = event.clipboardData.items[0]
    if (item.kind === 'file') {
        candidateImage.value = window.api.other.getPathForFile(item.getAsFile()!)
    }
}

function handleDrop(event: DragEvent): void {
    if (event.dataTransfer === null || event.dataTransfer.files.length === 0) {
        return
    }
    const file = event.dataTransfer.files[0]
    candidateImage.value = window.api.other.getPathForFile(file)
}
async function selectImageFile(): Promise<void> {
    const result = await window.api.other.openImageDialog()
    if (result) {
        candidateImage.value = result
    }
}
async function confirmCreateImage(): Promise<void> {
    if (candidateImage.value === '') {
        ElMessage.error('请选择图片')
        return
    }
    const example = await createAddExample()
    if (isNil(example)) {
        ElMessage.error('添加示例失败')
        candidateImage.value = ''
        return
    }
    createImageDialogVisible.value = false
    try {
        const image = await dataStore.image.create(candidateImage.value)
        await dataStore.example.update({
            id: example.id,
            imageIds: [...example.imageIds, image.id],
        })
    } catch {
        ElMessage.error('添加图片失败，请检查路径或格式是否正确')
        return
    }
    candidateImage.value = ''
}
</script>

<style scoped>
@reference "tailwindcss"

.edit-header {
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
}
</style>
