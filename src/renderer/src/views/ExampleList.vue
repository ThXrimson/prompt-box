<template>
    <div class="my-2 mx-2 flex-1 min-h-0 min-w-0 flex flex-col">
        <div class="image flex flex-col flex-1 min-h-0">
            <div>
                <el-button
                    type="success"
                    :icon="CirclePlusFilled"
                    class="mb-2 self-start!"
                    @click="createExample"
                >
                    添加示例
                </el-button>

                <el-button
                    type="success"
                    :icon="DeleteFilled"
                    class="mb-2 self-start!"
                    @click="deleteEmptyExamples"
                >
                    删除空示例
                </el-button>
            </div>

            <el-scrollbar
                v-if="examples.length > 0"
                class="flex flex-col gap-2 flex-1 min-h-0 border-2 border-gray-200 rounded-md px-1"
                @end-reached="loadExamples"
            >
                <div
                    v-for="example in examples.slice(0, exampleLimit)"
                    :key="example.id"
                    class="flex justify-between gap-2 my-1.5"
                >
                    <ExampleView :example-id="example.id" />
                </div>
            </el-scrollbar>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useDataStore } from '@renderer/stores/data'
import { computed, ref } from 'vue'
import { CirclePlusFilled, DeleteFilled } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import ExampleView from '@renderer/components/ExampleView.vue'
import { createError, notFoundError } from '@renderer/stores/error'

const dataStore = useDataStore()

const examples = computed(() => {
    return dataStore.example.readonly.toSorted((a, b) => b.updateTime - a.updateTime)
})

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
        await ElMessageBox.confirm(`确定删除 ${emptyExamples.length} 个空示例？`, '删除空示例', {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
        })
        await dataStore.example.deleteBatch(emptyExamples.map((e) => e.id))
        ElMessage.success(`已删除 ${emptyExamples.length} 个空示例`)
    } catch (error) {
        if (error === 'cancel') {
            return
        } else if (error === notFoundError) {
            ElMessage.error('删除空示例失败：示例不存在')
        } else {
            ElMessage.error(`删除空示例失败：${error}`)
        }
    }
}

const exampleLimit = ref(10)
function loadExamples(): void {
    exampleLimit.value = Math.min(examples.value.length, exampleLimit.value + 10)
}
</script>
