<template>
    <div class="my-2 mx-2 flex-1 min-h-0 min-w-0 flex flex-col">
        <div class="image flex flex-col flex-1 min-h-0">
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
                            fit="scale-down"
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
                                        <el-button
                                            :icon="CopyDocument"
                                            link
                                            class="self-center flex-1 min-h-0 ml-0!"
                                            @click="
                                                handleCopyExampleText(
                                                    examplesText[editorTab[example.id]][example.id]
                                                )
                                            "
                                        />
                                        <el-popconfirm
                                            title="确定删除此示例？"
                                            :hide-after="0"
                                            @confirm="handleDeleteExample(example.id)"
                                        >
                                            <template #reference>
                                                <el-button :icon="Delete" link class="ml-0!" />
                                            </template>
                                        </el-popconfirm>
                                    </div>
                                    <el-button
                                        round
                                        :disabled="example.disabled"
                                        class="ml-0!"
                                        @click="handleAddExample(example.id)"
                                    >
                                        添加到提示词
                                    </el-button>
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
            @keyup.esc.stop.prevent="editGalleryVisible = false"
        >
            <template #default>
                <Gallery :example-i-d="editGalleryExampleID" />
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { useStorage } from '@renderer/stores/data'
import { computed, ref, watch } from 'vue'
import { CopyDocument, Delete } from '@element-plus/icons-vue'
import { getImageUrl } from '@renderer/utils/utils'
import { watchArray } from '@vueuse/core'

const props = defineProps<{
    promptID: string
}>()

const tabs = ['positive', 'negative', 'extra'] as const
const tabToField: Record<string, string> = {
    positive: 'positivePrompt',
    negative: 'negativePrompt',
    extra: 'extra',
}
type Tabs = (typeof tabs)[number]

const storage = useStorage()

const examples = computed(() => {
    return Array.from(storage.examples.values())
        .reverse()
        .map((example) => {
            return {
                id: example.id,
                positivePrompt: example.positivePrompt,
                negativePrompt: example.negativePrompt,
                extra: example.extra,
                images: storage.getImagesByExampleID(example.id),
                disabled: storage
                    .getExamplesByPromptID(props.promptID)
                    .some((e) => e.id === example.id),
            }
        })
})

// 编辑或添加示例相关数据
const editGalleryExampleID = ref<string | null>(null)
const editGalleryVisible = ref(false)

// 示例的编辑框当前的tab
const editorTab = ref<Record<string, Tabs>>({})
// 示例所属提示词
const examplePrompts = ref<Record<string, { id: string; text: string }[]>>({})
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
                examplesText.value[tab][id] = examples.value.find((e) => e.id === id)?.[field] || ''
            }
            editorTab.value[id] = 'positive'
            examplePrompts.value[id] = storage.getPromptsByExampleID(id)
        })
        if (removed) {
            removed.forEach((id) => {
                // for (const tab of tabs) {
                //   delete canEditExamplesText.value[tab][id]
                // }
                delete editorTab.value[id]
                delete examplePrompts.value[id]
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

async function handleDeleteExample(id: string): Promise<void> {
    const success = await storage.deleteExample(id)
    if (!success) {
        ElMessage.error('删除示例失败')
    } else {
        ElMessage.success('删除示例成功')
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
            examplesText.value[type][exampleID] = storage.examples.get(exampleID)?.[field] || ''
        }
    }
}

const emit = defineEmits<{
    (e: 'add-example', exampleID: string): void
}>()

function handleAddExample(exampleID: string): void {
    emit('add-example', exampleID)
}
</script>
