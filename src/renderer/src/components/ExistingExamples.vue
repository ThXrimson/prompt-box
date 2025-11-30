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
                            v-if="!isNil(exampleImageCover.get(example.id))"
                            :src="exampleImageCover.get(example.id)"
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
                                            v-model="exampleTab[example.id]"
                                            :options="tabOptions"
                                        />
                                        <el-button
                                            :icon="CopyDocument"
                                            link
                                            class="self-center flex-1 min-h-0 ml-0!"
                                            @click="
                                                copyExampleText(
                                                    exampleText[example.id][exampleTab[example.id]]
                                                )
                                            "
                                        />
                                        <el-popconfirm
                                            title="确定删除此示例？"
                                            :hide-after="0"
                                            @confirm="deleteExample(example.id)"
                                        >
                                            <template #reference>
                                                <el-button :icon="Delete" link class="ml-0!" />
                                            </template>
                                        </el-popconfirm>
                                    </div>
                                    <el-button
                                        round
                                        :disabled="exampleIdSet.has(example.id)"
                                        class="ml-0!"
                                        @click="addExample(example.id)"
                                    >
                                        添加到提示词
                                    </el-button>
                                </div>
                                <confirm-input
                                    v-for="tab in tabKinds"
                                    v-show="exampleTab[example.id] === tab"
                                    :key="tab"
                                    :model-value="exampleText[example.id][exampleTab[example.id]]"
                                    placeholder="请输入示例文本"
                                    class="flex-1 min-h-0"
                                    @save="confirmEditExampleTextFunc(example.id, tab)($event)"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </el-scrollbar>
        </div>

        <!-- 编辑图片 -->
        <el-dialog
            v-if="!isNil(editGalleryExampleId)"
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
    </div>
</template>

<script setup lang="ts">
import { useDataStore } from '@renderer/stores/data'
import { computed, ref, watch } from 'vue'
import { CopyDocument, Delete } from '@element-plus/icons-vue'
import { getImageUrl } from '@renderer/utils/utils'
import { watchArray } from '@vueuse/core'
import { isNil } from 'lodash'
import { existsError, notFoundError } from '@renderer/stores/error'

const props = defineProps<{
    promptId: string
}>()

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

const dataStore = useDataStore()

const examples = dataStore.example.readonly
const exampleImageCover = computed(() => {
    const idToCover = new Map<string, string>()
    for (const example of examples) {
        if (example.imageIds.length > 0) {
            idToCover.set(example.id, getImageUrl(example.imageIds[0]))
        }
    }
    return idToCover
})
const exampleIdSet = computed(() => {
    const prompt = dataStore.prompt.readonly.find((p) => p.id === props.promptId)
    if (isNil(prompt)) {
        return new Set([] as string[])
    }
    return new Set(prompt.exampleIds)
})

// 编辑或添加示例相关数据
const editGalleryExampleId = ref<string | null>(null)
const editGalleryVisible = ref(false)

// 示例的编辑框当前的tab
const exampleTab = ref<Record<string, Tab>>({})
watchArray(
    examples.map((e) => e.id),
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
    for (const example of examples) {
        result[example.id] = {
            [Tab.Positive]: example.positive || '',
            [Tab.Negative]: example.negative || '',
            [Tab.Extra]: example.extra || '',
        }
    }
    return result
})

async function deleteExample(id: string): Promise<void> {
    const success = await dataStore.example.delete(id)
    if (!success) {
        ElMessage.error('删除示例失败')
    } else {
        ElMessage.success('删除示例成功')
    }
}

function handleEditExampleGallery(exampleId: string): void {
    editGalleryExampleId.value = exampleId
    editGalleryVisible.value = true
}
watch(editGalleryVisible, (visible) => {
    if (!visible) {
        editGalleryExampleId.value = null
    }
})

async function copyExampleText(text: string): Promise<void> {
    const success = await window.api.other.copyToClipboard(text)
    if (success) {
        ElMessage.success('已复制到剪贴板')
    } else {
        ElMessage.warning('复制失败，请重试')
    }
}

function confirmEditExampleTextFunc(exampleId: string, kind: Tab) {
    const field = tabToField[kind]
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
</script>
