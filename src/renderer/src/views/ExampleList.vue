<template>
    <div class="m-1.5 flex-1 min-h-0 min-w-0 flex flex-col">
        <div class="flex flex-col flex-1 min-h-0">
            <div class="flex gap-2 mb-2">
                <el-button
                    type="primary"
                    :icon="CirclePlusFilled"
                    @click="createExample"
                >
                    添加示例
                </el-button>

                <el-popconfirm
                    title="确定删除所有空示例？"
                    :hide-after="0"
                    @confirm="deleteEmptyExamples"
                >
                    <template #reference>
                        <el-button type="danger" :icon="DeleteFilled">删除空示例</el-button>
                    </template>
                </el-popconfirm>
            </div>

            <el-scrollbar
                v-if="!dataStore.isDataLoaded"
                class="flex-1 min-h-0 border border-(--color-border) rounded-(--radius-md) px-1"
                view-class="columns-4 gap-1"
            >
                <div v-for="i in 6" :key="i" class="m-1 h-40 skeleton rounded-(--radius-md)"></div>
            </el-scrollbar>
            <el-scrollbar
                v-else-if="examples.length > 0"
                class="flex-1 min-h-0 border border-(--color-border) rounded-(--radius-md) px-1"
                view-class="columns-4 gap-1"
            >
                <template v-for="example in currentExamples" :key="example.id">
                    <el-image
                        v-if="!isNil(exampleIdToCoverUrl.get(example.id))"
                        :src="exampleIdToCoverUrl.get(example.id)!"
                        class="m-1 rounded-(--radius-md) cursor-pointer hover:shadow-(--shadow-lg) transition-shadow duration-300"
                        fit="contain"
                        loading="lazy"
                        @click="currentExampleId = example.id"
                    />
                    <div
                        v-else
                        class="m-1 h-40 flex justify-center items-center bg-(--color-gray-200) text-(--color-text-tertiary) rounded-(--radius-md) cursor-pointer hover:shadow-(--shadow-lg) transition-shadow duration-300"
                        @click="currentExampleId = example.id"
                    >
                        <el-icon size="32"><ImageOutline /></el-icon>
                    </div>
                </template>
            </el-scrollbar>
            <EmptyState v-else :icon="CirclePlusFilled" title="暂无示例" />
            <div class="flex justify-center-safe items-center-safe">
                <el-tooltip content="左键封面打开预览；右键封面打开画廊" placement="top">
                    <el-button circle :icon="Information" size="small" />
                </el-tooltip>
                <el-button
                    :disabled="isNil(currentExampleId) && isNil(lastExampleId)"
                    circle
                    :icon="isNil(currentExampleId) ? CaretUp : CaretDown"
                    size="small"
                    @click="switchExamplePanel"
                />
                <el-pagination
                    v-model:current-page="currentPage"
                    :page-size="pageSize"
                    class="flex-0.25 min-h-0 justify-center-safe"
                    layout="prev, pager, next"
                    :total="examples.length"
                />
            </div>
            <ExampleView
                v-if="currentExampleId"
                :example-id="currentExampleId"
                class="flex-0.5 min-h-0 justify-center-safe"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useDataStore } from '@renderer/stores/data'
import EmptyState from '@renderer/components/EmptyState.vue'
import { computed, ref } from 'vue'
import { CirclePlusFilled, DeleteFilled } from '@element-plus/icons-vue'
import ExampleView from '@renderer/components/ExampleView.vue'
import { createError, notFoundError } from '@renderer/stores/error'
import { Nullish } from 'utility-types'
import { isNil } from 'lodash'
import { getImageUrl } from '@renderer/utils/utils'
import { CaretUp, CaretDown, Information, ImageOutline } from '@vicons/ionicons5'
import { DEFAULT_PAGE_SIZE } from '@shared/constants/app'

const dataStore = useDataStore()

const examples = computed(() => {
    return dataStore.example.readonly.toSorted((a, b) => b.updateTime - a.updateTime)
})
const currentPage = ref(1)
const pageSize = DEFAULT_PAGE_SIZE
const currentExamples = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    const end = start + pageSize
    return examples.value.slice(start, end)
})

const exampleIdToCoverUrl = computed(() => {
    const m = new Map<string, string | Nullish>()
    for (const example of examples.value) {
        if (example.imageIds.length === 0) {
            m.set(example.id, undefined)
            continue
        }
        const coverImageId = example.imageIds[0]
        const image = dataStore.image.readonly.find((i) => i.id === coverImageId)
        if (isNil(image)) {
            m.set(example.id, undefined)
            continue
        }
        m.set(example.id, getImageUrl(image.fileName))
    }
    return m
})

let lastExampleId = ref<string | Nullish>(null)
const currentExampleId = ref<string | Nullish>(null)
function switchExamplePanel(): void {
    if (isNil(currentExampleId.value)) {
        currentExampleId.value = lastExampleId.value
        lastExampleId.value = null
    } else {
        lastExampleId.value = currentExampleId.value
        currentExampleId.value = null
    }
}

async function createExample(): Promise<void> {
    try {
        await dataStore.example.create({})
        ElMessage.success('添加示例成功')
    } catch (err) {
        if (err === createError) {
            ElMessage.error('添加示例失败')
            return
        } else {
            ElMessage.error(`添加示例失败：${err}`)
            return
        }
    }
}

async function deleteEmptyExamples(): Promise<void> {
    const emptyExamples = dataStore.example.readonly.filter(
        (example) =>
            example.positive.length === 0 &&
            example.negative.length === 0 &&
            example.extra === '' &&
            example.imageIds.length === 0
    )
    if (emptyExamples.length === 0) {
        ElMessage.info('没有空示例可删除')
        return
    }
    try {
        await dataStore.example.deleteMany(emptyExamples.map((e) => e.id))
        ElMessage.success(`已删除 ${emptyExamples.length} 个空示例`)
    } catch (error) {
        if (error === notFoundError) {
            ElMessage.error('删除空示例失败：示例不存在')
        } else {
            ElMessage.error(`删除空示例失败：${error}`)
        }
    }
}
</script>
