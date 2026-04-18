<template>
    <div class="m-1.5 flex-1 min-h-0 min-w-0 flex flex-col">
        <div class="flex flex-col flex-1 min-h-0">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-lg font-semibold text-(--color-text-primary) tracking-tight">
                    示例库
                </h2>
                <div class="flex gap-2">
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
            </div>

            <el-scrollbar
                v-if="!dataStore.isDataLoaded"
                class="flex-1 min-h-0"
            >
                <div class="example-grid">
                    <div v-for="i in 8" :key="i" class="example-card skeleton-card">
                        <div class="skeleton aspect-4/3 rounded-t-(--radius-lg)"></div>
                        <div class="p-2.5 flex flex-col gap-1.5">
                            <div class="skeleton skeleton-text w-3/4"></div>
                            <div class="skeleton skeleton-text--short w-1/2"></div>
                        </div>
                    </div>
                </div>
            </el-scrollbar>
            <el-scrollbar
                v-else-if="examples.length > 0"
                ref="gridScrollbar"
                class="flex-1 min-h-0"
            >
                <TransitionGroup name="grid-item" tag="div" class="example-grid">
                    <div
                        v-for="example in currentExamples"
                        :key="example.id"
                        class="example-card group"
                        :class="{ 'example-card--active': currentExampleId === example.id }"
                        @click="currentExampleId = example.id"
                        @contextmenu.prevent="handleContextMenu($event, example.id)"
                    >
                        <div class="example-card__cover">
                            <el-image
                                v-if="!isNil(exampleIdToCoverUrl.get(example.id))"
                                :src="exampleIdToCoverUrl.get(example.id)!"
                                class="w-full h-full"
                                fit="cover"
                                loading="lazy"
                            />
                            <div v-else class="example-card__placeholder">
                                <el-icon size="36"><ImageOutline /></el-icon>
                            </div>
                            <div class="example-card__overlay">
                                <el-icon size="20" class="text-white"><ExpandOutline /></el-icon>
                            </div>
                        </div>
                        <div class="example-card__info">
                            <span class="text-xs text-(--color-text-secondary) truncate">
                                {{ formatRelativeTime(example.updateTime) }}
                            </span>
                            <span
                                v-if="example.imageIds.length > 0"
                                class="text-xs text-(--color-text-tertiary) flex items-center gap-0.5"
                            >
                                <el-icon size="12"><ImagesOutline /></el-icon>
                                {{ example.imageIds.length }}
                            </span>
                        </div>
                    </div>
                </TransitionGroup>
            </el-scrollbar>
            <EmptyState
                v-else
                :icon="CirclePlusFilled"
                title="暂无示例"
                description="点击上方按钮添加第一个示例"
            />

            <div v-if="examples.length > 0" class="flex items-center justify-between py-2 px-1">
                <span class="text-xs text-(--color-text-tertiary)">
                    {{ paginationInfo }}
                </span>
                <el-pagination
                    v-model:current-page="currentPage"
                    :page-size="pageSize"
                    small
                    layout="prev, pager, next"
                    :total="examples.length"
                />
                <div class="flex gap-1">
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
                </div>
            </div>

            <Transition name="panel-slide">
                <ExampleView
                    v-if="currentExampleId"
                    :example-id="currentExampleId"
                    class="example-detail-panel"
                />
            </Transition>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useDataStore } from '@renderer/stores/data'
import EmptyState from '@renderer/components/EmptyState.vue'
import { computed, ref, watch } from 'vue'
import { CirclePlusFilled, DeleteFilled } from '@element-plus/icons-vue'
import ExampleView from '@renderer/components/ExampleView.vue'
import { createError, notFoundError } from '@renderer/stores/error'
import { Nullish } from 'utility-types'
import { isNil } from 'lodash'
import { getImageUrl } from '@renderer/utils/utils'
import { CaretUp, CaretDown, Information, ImageOutline, ExpandOutline, ImagesOutline } from '@vicons/ionicons5'
import { DEFAULT_PAGE_SIZE } from '@shared/constants/app'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

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

const paginationInfo = computed(() => {
    const start = (currentPage.value - 1) * pageSize + 1
    const end = Math.min(currentPage.value * pageSize, examples.value.length)
    return `第 ${start}-${end} 项，共 ${examples.value.length} 项`
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

const gridScrollbar = ref()

watch(currentPage, () => {
    gridScrollbar.value?.setScrollTop(0)
})

function formatRelativeTime(timestamp: number): string {
    return dayjs(timestamp).fromNow()
}

function handleContextMenu(_e: MouseEvent, exampleId: string): void {
    currentExampleId.value = exampleId
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

<style lang="css" scoped>
@reference 'tailwindcss';

.example-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--spacing-md);
    padding: var(--spacing-xs);
}

.example-card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: all 0.2s ease;
}

.example-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
    border-color: var(--color-gray-300);
}

.example-card--active {
    border-color: var(--color-primary);
    background: var(--color-primary-50);
    box-shadow: 0 0 0 1px var(--color-primary-200);
}

.example-card--active:hover {
    border-color: var(--color-primary);
    background: var(--color-primary-50);
}

.example-card__cover {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
}

.example-card__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--color-gray-100) 0%, var(--color-gray-200) 100%);
    color: var(--color-text-tertiary);
}

.example-card__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0);
    transition: background 0.2s ease;
    pointer-events: none;
}

.example-card:hover .example-card__overlay {
    background: rgba(0, 0, 0, 0.15);
}

.example-card:hover .example-card__overlay .el-icon {
    opacity: 1;
    transform: scale(1);
}

.example-card__overlay .el-icon {
    opacity: 0;
    transform: scale(0.8);
    transition: all 0.2s ease;
}

.example-card__info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm) var(--spacing-md);
    border-top: 1px solid var(--color-border-light);
}

.example-card--active .example-card__info {
    border-top-color: var(--color-primary-100);
}

.example-detail-panel {
    flex: 0 0 auto;
    max-height: 45%;
    min-height: 0;
    border-top: 1px solid var(--color-border);
    padding-top: var(--spacing-sm);
}

.skeleton-card {
    border: 1px solid var(--color-border-light);
    box-shadow: none;
}

.skeleton-card:hover {
    transform: none;
    box-shadow: none;
}

.grid-item-enter-active {
    transition: all 0.3s ease-out;
}

.grid-item-leave-active {
    transition: all 0.2s ease-in;
}

.grid-item-enter-from {
    opacity: 0;
    transform: translateY(12px);
}

.grid-item-leave-to {
    opacity: 0;
    transform: scale(0.95);
}

.grid-item-move {
    transition: transform 0.3s ease;
}

.panel-slide-enter-active {
    transition: all 0.3s ease-out;
}

.panel-slide-leave-active {
    transition: all 0.2s ease-in;
}

.panel-slide-enter-from {
    opacity: 0;
    transform: translateY(20px);
}

.panel-slide-leave-to {
    opacity: 0;
    transform: translateY(10px);
}
</style>
