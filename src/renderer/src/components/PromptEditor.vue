<template>
    <el-scrollbar class="flex flex-col gap-2 flex-1 min-h-0 relative">
        <div>
            <el-text class="edit-header">提示词</el-text>
            <el-button :icon="CopyDocument" link @click="handleCopyText(promptText)" />
            <confirm-input
                :model-value="promptText"
                placeholder="请输入提示词"
                @save="changePromptText"
            />
        </div>
        <div>
            <div class="flex gap-1">
                <el-text class="edit-header">翻译</el-text>
                <el-tooltip content="点击使用 DeepLX 翻译" :hide-after="0" placement="top">
                    <el-button link :icon="TranslateIcon" @click="translateByDeepLX" />
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
                @save="changeTranslation"
            />
        </div>
        <div>
            <el-text class="edit-header">Tags</el-text>
            <el-select
                v-model="selectedTags"
                value-key="id"
                multiple
                filterable
                :filter-method="
                    (text) => {
                        tagOptions = allTags.filter((tag) => {
                            return (
                                tag.text.includes(text) ||
                                pinyinIncludes(tag.text, text) ||
                                pinyinIncludesWithFirstLetter(tag.text, text)
                            )
                        })
                    }
                "
                allow-create
                default-first-option
                :reserve-keyword="false"
                placeholder="请选择或输入标签"
                @blur="changeTags"
            >
                <el-option v-for="tag in tagOptions" :key="tag.id" :label="tag.text" :value="tag" />
            </el-select>
        </div>
        <div>
            <el-text class="edit-header">描述</el-text>
            <el-button :icon="CopyDocument" link @click="handleCopyText(promptDescription)" />
            <confirm-input
                :model-value="promptDescription"
                placeholder="请输入描述"
                @save="changeDescription"
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
                        @click="createAddExample"
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
                    <el-button
                        type="success"
                        :icon="CirclePlusFilled"
                        class="mb-2 self-start!"
                        @click="handleAddImage"
                    >
                        添加示例图片
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
                                v-if="exampleImageCover.has(example.id)"
                                :src="exampleImageCover.get(example.id)"
                                class="w-40 h-40 object-cover rounded-md cursor-pointer hover:shadow-lg transition-shadow duration-300 self-center-safe"
                                fit="scale-down"
                                loading="lazy"
                                @click="openEditExampleGallery(example.id)"
                            />
                            <div
                                v-else
                                class="flex justify-center items-center w-40 h-40 bg-gray-300 text-gray-400 rounded-md cursor-pointer hover:shadow-lg transition-shadow duration-300"
                                @click="openEditExampleGallery(example.id)"
                            >
                                Empty
                            </div>
                            <div class="flex-1 min-w-0 flex flex-col gap-1">
                                <div class="flex flex-col gap-1 flex-1 min-h-0">
                                    <div>
                                        <el-segmented
                                            v-model="exampleTab[example.id]"
                                            :options="tabOptions"
                                        />
                                        <el-button
                                            :icon="CopyDocument"
                                            link
                                            class="self-center flex-1 min-h-0 ml-0!"
                                            @click="
                                                handleCopyText(
                                                    exampleText[example.id][exampleTab[example.id]]
                                                )
                                            "
                                        />
                                        <el-popconfirm
                                            title="确定从该提示词中移除此示例？"
                                            :hide-after="0"
                                            @confirm="removeExample(example.id)"
                                        >
                                            <template #reference>
                                                <el-button link :icon="Remove" class="ml-0!" />
                                            </template>
                                        </el-popconfirm>
                                        <el-popconfirm
                                            title="确定删除此示例？"
                                            :hide-after="0"
                                            @confirm="deleteExample(example.id)"
                                        >
                                            <template #reference>
                                                <el-button link :icon="Delete" class="ml-0!" />
                                            </template>
                                        </el-popconfirm>
                                    </div>
                                    <confirm-input
                                        v-for="tab in tabKinds"
                                        v-show="exampleTab[example.id] === tab"
                                        :key="tab"
                                        :model-value="
                                            exampleText[example.id][exampleTab[example.id]]
                                        "
                                        placeholder="请输入示例文本"
                                        class="flex-1 min-h-0"
                                        @save="confirmEditExampleTextFunc(example.id, tab)($event)"
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
        v-if="editGalleryExampleId !== null"
        v-model="editGalleryVisible"
        title="编辑图片"
        align-center
        class="w-auto! h-[80vh] flex flex-col"
        body-class="flex-1 min-h-0 flex gap-2 justify-between"
        @keyup.esc.stop.prevent="editGalleryVisible = false"
    >
        <template #default>
            <Gallery :example-id="editGalleryExampleId" />
        </template>
    </el-dialog>

    <!-- 从已有添加示例 -->
    <el-dialog
        v-model="addExampleFromExistingVisible"
        title="从已有示例添加"
        align-center
        class="w-auto! max-w-240 h-[80vh] flex flex-col"
        body-class="flex-1 min-h-0 flex gap-2 justify-between"
        @keyup.esc.stop.prevent="editGalleryVisible = false"
    >
        <existing-examples :prompt-id="promptId" @add-example="addExample" />
    </el-dialog>

    <!--添加图片对话框-->
    <el-dialog
        v-model="addImageDialogVisible"
        title="添加图片"
        @keyup.esc.stop.prevent="cancelAddImage"
    >
        <el-text>图片地址（URL或本地文件）</el-text>
        <div class="flex gap-2">
            <el-input v-model="candidateImage" @paste="handlePaste" @drop.prevent="handleDrop" />
            <el-button type="success" @click="selectImageFile"> 选择图片 </el-button>
        </div>
        <template #footer>
            <div>
                <el-button type="primary" @click="confirmAddImage"> 确定 </el-button>
                <el-button type="danger" @click="cancelAddImage"> 取消 </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useDataStore } from '@renderer/stores/data'
import { CirclePlusFilled, CopyDocument, Delete, Remove } from '@element-plus/icons-vue'
import { getImageUrl } from '@renderer/utils/utils'
import { isNil } from 'lodash'
import ConfirmInput from '@renderer/components/ConfirmInput.vue'
import type { Tag } from '@shared/models/tag'
import { watchArray } from '@vueuse/core'
import TranslateIcon from '@renderer/icons/Prompt.vue'
import { pinyinIncludes, pinyinIncludesWithFirstLetter } from '@renderer/utils/pinyin-includes'
import { existsError, notFoundError } from '@renderer/stores/error'
import { Nullish } from 'utility-types'
import { Example } from '@shared/models/example'

const enum Tab {
    Positive = 'positive',
    Negative = 'negative',
    Extra = 'extra',
}
const tabKinds = [Tab.Positive, Tab.Negative, Tab.Extra]
const tabToField: Record<Tab, string> = {
    [Tab.Positive]: 'positive',
    [Tab.Negative]: 'negative',
    [Tab.Extra]: 'extra',
}
const tabOptions = [
    { label: '正面', value: Tab.Positive },
    { label: '负面', value: Tab.Negative },
    { label: '额外', value: Tab.Extra },
]

const props = defineProps<{
    promptId: string
}>()

const dataStore = useDataStore()
const allTags = dataStore.tag.readonly
const tagOptions = ref(allTags)

// 编辑 Prompt 相关数据
const promptText = computed(() => {
    const prompt = dataStore.prompt.readonly.find((p) => p.id === props.promptId)
    return prompt?.text || ''
})
const promptTranslation = computed(() => {
    const prompt = dataStore.prompt.readonly.find((p) => p.id === props.promptId)
    return prompt?.translation || ''
})
const promptDescription = computed(() => {
    const prompt = dataStore.prompt.readonly.find((p) => p.id === props.promptId)
    return prompt?.description || ''
})
const selectedTags = ref<(Tag | string)[]>([])
watch(
    () => {
        const prompt = dataStore.prompt.readonly.find((p) => p.id === props.promptId)
        if (!isNil(prompt)) {
            const tagIds = prompt.tagIds
            return tagIds
                .map((id) => dataStore.tag.readonly.find((t) => t.id === id))
                .filter((tag): tag is Tag => !isNil(tag))
        }
        return [] as Tag[]
    },
    (newValue) => {
        selectedTags.value = newValue
    },
    { immediate: true }
)
const examples = computed(() => {
    const promptIndex = dataStore.prompt.readonly.findIndex((p) => p.id === props.promptId)
    if (promptIndex === -1) {
        return []
    }
    const examples = dataStore.example.readonly
    const exampleIds = dataStore.prompt.readonly[promptIndex].exampleIds
    return examples.filter((e) => exampleIds.includes(e.id))
})
const exampleImageCover = computed(() => {
    const idToCover = new Map<string, string>()
    for (const example of examples.value) {
        if (example.imageIds.length > 0) {
            idToCover.set(example.id, getImageUrl(example.imageIds[0]))
        }
    }
    return idToCover
})

// 编辑或添加示例相关数据
const editGalleryExampleId = ref<string | null>(null)
const editGalleryVisible = ref(false)

// 示例的编辑框当前的tab
const exampleTab = ref<Record<string, Tab>>({})
watchArray(
    () => examples.value.map((e) => e.id),
    (ids) => {
        for (const id of ids) {
            if (!isNil(exampleTab.value[id])) {
                continue
            }
            exampleTab.value[id] = Tab.Positive
        }
    }
)
// 暂存示例文本, id -> tab -> 文本
const exampleText = computed(() => {
    const result: Record<string, Record<Tab, string>> = {}
    for (const example of examples.value) {
        result[example.id] = {
            [Tab.Positive]: example.positive || '',
            [Tab.Negative]: example.negative || '',
            [Tab.Extra]: example.extra || '',
        }
    }
    return result
})

//#region 更改示例内容
async function changePromptText(text: string): Promise<void> {
    text = text.trim()
    if (text === '') {
        ElMessage.warning('提示词不能为空')
        return
    }
    if (dataStore.prompt.readonly.some((p) => p.text === text)) {
        ElMessage.warning('提示词已存在')
        return
    }
    const prompt = dataStore.prompt.readonly.find((p) => p.id === props.promptId)
    if (isNil(prompt)) {
        ElMessage.error('未找到对应的提示词')
        return
    }
    const success = await dataStore.prompt.update({
        id: prompt.id,
        text,
    })
    if (!success) {
        ElMessage.error('更新提示词文本失败')
    }
}

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
    try {
        const result = await window.api.other.translateByDeepLX(promptText.value)
        await changeTranslation(result)
    } catch {
        ElMessage.error('翻译失败')
    }
}

async function changeDescription(value: string): Promise<void> {
    const prompt = dataStore.prompt.readonly.find((p) => p.id === props.promptId)
    if (isNil(prompt)) {
        ElMessage.error('未找到对应的提示词')
        return
    }
    const success = await dataStore.prompt.update({
        id: prompt.id,
        description: value,
    })
    if (!success) {
        ElMessage.error('更新 Prompt 描述失败')
    }
}

async function changeTags(): Promise<void> {
    const newTags = [] as Tag[]
    for (const tag of selectedTags.value) {
        if (typeof tag === 'string') {
            const oldTag = dataStore.tag.readonly.find((t) => t.text === tag)
            if (!isNil(oldTag)) {
                newTags.push(oldTag)
                continue
            }
            const newTag = await dataStore.tag.create(tag)
            if (!isNil(newTag)) {
                newTags.push(newTag)
            }
        } else {
            newTags.push(tag)
        }
    }
    const success = await dataStore.prompt.update({
        id: props.promptId,
        tagIds: newTags.map((t) => t.id),
    })
    if (!success) {
        ElMessage.error('更新 Prompt 标签失败')
    }
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

async function removeExample(exampleId: string): Promise<void> {
    const prompt = dataStore.prompt.readonly.find((p) => p.id === props.promptId)
    if (isNil(prompt)) {
        ElMessage.error('未找到对应的提示词')
        return
    }
    const success = await dataStore.prompt.update({
        id: prompt.id,
        exampleIds: prompt.exampleIds.filter((id) => id !== exampleId),
    })
    if (!success) {
        ElMessage.error('删除示例失败')
    } else {
        ElMessage.success('删除示例成功')
    }
}

async function deleteExample(exampleId: string): Promise<void> {
    const success = await dataStore.example.delete(exampleId)
    if (!success) {
        ElMessage.error('删除示例失败')
    } else {
        ElMessage.success('删除示例成功')
    }
}

function confirmEditExampleTextFunc(exampleId: string, tabKind: Tab) {
    const field = tabToField[tabKind]
    return async (text: string) => {
        const success = await dataStore.example.update({
            id: exampleId,
            [field]: text,
        })
        if (success) {
            ElMessage.success('示例文本更新成功')
        } else {
            ElMessage.error('示例文本更新失败')
        }
    }
}
//#endregion

//#region 编辑示例图片
function openEditExampleGallery(exampleID: string): void {
    editGalleryExampleId.value = exampleID
    editGalleryVisible.value = true
}
watch(editGalleryVisible, (visible) => {
    if (!visible) {
        editGalleryExampleId.value = null
    }
})
//#endregion

async function handleCopyText(text?: string): Promise<void> {
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

const addImageDialogVisible = ref(false)
const candidateImage = ref('')
function handleAddImage(): void {
    addImageDialogVisible.value = true
    candidateImage.value = ''
}
function cancelAddImage(): void {
    addImageDialogVisible.value = false
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
async function confirmAddImage(): Promise<void> {
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
    addImageDialogVisible.value = false
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
    font-weight: bold;
}
</style>
