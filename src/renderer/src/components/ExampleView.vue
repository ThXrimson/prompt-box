<template>
    <div class="flex gap-2 flex-1 min-w-0">
        <el-tooltip placement="right" :show-after="500" :hide-after="0">
            <image-cover :src="coverUrl" @click="showGalleryDialog = true" />
            <template #content>
                <el-image :src="coverUrl" class="max-w-[50vw]" />
            </template>
        </el-tooltip>
        <div class="flex-1 min-w-0 flex flex-col gap-1">
            <div class="flex flex-col gap-1 flex-1 min-h-0">
                <div class="flex justify-between gap-1">
                    <div>
                        <el-segmented v-model="currentTab" :options="tabOptions" />
                        <el-button
                            :icon="CopyDocument"
                            link
                            class="self-center flex-1 min-h-0 ml-0!"
                            @click="copyText(example?.[currentTabField] ?? '')"
                        />
                        <el-popconfirm
                            v-if="!isNil(promptId)"
                            title="确定从该提示词中移除此示例？"
                            :hide-after="0"
                            @confirm="removeExample(promptId, exampleId)"
                        >
                            <template #reference>
                                <el-button link :icon="Remove" class="ml-0!" />
                            </template>
                        </el-popconfirm>
                        <el-popconfirm
                            title="确定删除此示例？"
                            :hide-after="0"
                            @confirm="deleteExample"
                        >
                            <template #reference>
                                <el-button :icon="Delete" link class="ml-0!" />
                            </template>
                        </el-popconfirm>
                    </div>
                    <el-select-v2
                        v-if="isNil(promptId)"
                        :model-value="prompts"
                        value-key="id"
                        multiple
                        filterable
                        default-first-option
                        :reserve-keyword="false"
                        placeholder="此处更改示例所属提示词"
                        :options="promptOptions"
                        class="flex flex-1 min-w-0"
                        @blur="changeExamplePrompt"
                    />
                </div>
                <template v-for="tab in tabKinds" :key="tab">
                    <el-input
                        v-show="currentTab === tab"
                        v-model.lazy="currentTabText"
                        type="textarea"
                        :rows="5"
                        resize="none"
                        placeholder="请输入示例文本"
                        class="flex-1 min-h-0 mt-2"
                    />
                </template>
            </div>
        </div>

        <el-dialog
            v-model="showGalleryDialog"
            v-lazy-show="showGalleryDialog"
            title="编辑图片"
            align-center
            class="w-auto! h-[80vh] flex flex-col"
            body-class="flex-1 min-h-0 flex gap-2 justify-between"
            @keyup.esc.stop.prevent="showGalleryDialog = false"
        >
            <template #default>
                <Gallery :example-id="exampleId" />
            </template>
        </el-dialog>
    </div>
</template>
<script setup lang="ts">
import { useDataStore } from '@renderer/stores/data'
import { getImageUrl } from '@renderer/utils/utils'
import { isNil } from 'lodash'
import { computed, ref } from 'vue'
import { CopyDocument, Delete, Remove } from '@element-plus/icons-vue'
import { existsError, notFoundError } from '@renderer/stores/error'
import log from 'electron-log/renderer'
import { watchArray } from '@vueuse/core'
import ImageCover from './ImageCover.vue'

const props = defineProps<{
    exampleId: string
    promptId?: string
}>()
// TODO 处理 example 不存在的情况
const dataStore = useDataStore()
const example = computed(() =>
    dataStore.example.readonly.find((item) => item.id === props.exampleId)
)

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
const currentTab = ref(Tab.Positive)
const currentTabField = computed(() => tabToField[currentTab.value])
const currentTabText = computed({
    get() {
        return example.value?.[currentTabField.value] ?? ''
    },
    set(newVal: string) {
        dataStore.example.update({
            id: props.exampleId,
            [currentTabField.value]: newVal,
        })
    },
})

const showGalleryDialog = ref(false)
const coverUrl = computed(() => {
    if (example.value?.imageIds.length === 0) {
        return undefined
    }
    if (isNil(example.value)) return undefined
    const coverImegeId = example.value.imageIds[0]
    const image = dataStore.image.readonly.find((item) => item.id === coverImegeId)
    if (isNil(image)) return undefined
    return getImageUrl(image.fileName)
})

async function copyText(text: string): Promise<void> {
    if (text === '') {
        ElMessage.warning('示例文本为空')
        return
    }
    await window.api.other.copyToClipboard(text)
    ElMessage.success('复制成功')
}

async function deleteExample(): Promise<void> {
    try {
        await dataStore.example.delete(props.exampleId)
        ElMessage.success('删除示例成功')
    } catch (err) {
        if (err === notFoundError) {
            ElMessage.error('示例不存在')
        } else {
            ElMessage.error('删除示例失败')
            log.error(`删除示例失败: exampleId=${props.exampleId}, error=${err}`)
        }
    }
}

let updatingPrompts = false // 是否是该组件触发的更新
interface ExamplePrompt {
    id: string
    text: string
}
const prompts = ref<ExamplePrompt[]>([])
watchArray(
    () => {
        return (dataStore.example.idToPrompts.get(props.exampleId) ?? []).map((item) => ({
            id: item.id,
            text: item.text,
        }))
    },
    (newVal) => {
        if (updatingPrompts) {
            return
        }
        prompts.value = newVal
        updatingPrompts = false
    },
    { immediate: true }
)
const promptOptions = computed(() => {
    return dataStore.prompt.readonly.map((p) => {
        return {
            label: p.text,
            value: {
                id: p.id,
                text: p.text,
            },
        }
    })
})
async function changeExamplePrompt(): Promise<void> {
    try {
        updatingPrompts = true
        const absentPrompts = [] as string[]
        for (const item of prompts.value) {
            const prompt = dataStore.prompt.readonly.find((p) => p.id === item.id)
            if (isNil(prompt)) {
                absentPrompts.push(item.text)
                continue
            }
            if (prompt.exampleIds.some((id) => id === props.exampleId)) {
                continue
            }
            await dataStore.prompt.update({
                id: prompt.id,
                exampleIds: [...prompt.exampleIds, props.exampleId],
            })
        }
        ElMessage.success('更新示例提示词成功')
    } catch (err) {
        if (err === notFoundError) {
            ElMessage.error(`提示词不存在`)
        } else if (err === existsError) {
            ElMessage.error(`示例已存在`)
        } else {
            ElMessage.error('更新示例提示词失败')
            log.error(`更新示例提示词失败: exampleId=${props.exampleId}, error=${err}`)
        }
    }
}
async function removeExample(promptId: string, exampleId: string): Promise<void> {
    try {
        const prompt = dataStore.prompt.readonly.find((p) => p.id === promptId)
        if (isNil(prompt)) {
            ElMessage.error(`提示词不存在`)
            return
        }
        await dataStore.prompt.update({
            id: promptId,
            exampleIds: prompt.exampleIds.filter((id) => id !== exampleId),
        })
        ElMessage.success('从提示词中移除示例成功')
    } catch (err) {
        if (err === notFoundError) {
            ElMessage.error(`提示词不存在`)
        } else {
            ElMessage.error('从提示词中移除示例失败')
            log.error(
                `从提示词中移除示例失败: promptId=${promptId}, exampleId=${exampleId}, error=${err}`
            )
        }
    }
}
</script>
<style scoped></style>
