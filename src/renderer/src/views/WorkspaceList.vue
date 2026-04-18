<template>
    <div class="flex flex-col gap-2 m-1.5 flex-1 min-h-0">
        <div class="flex gap-2">
            <el-button
                type="primary"
                :icon="CirclePlusFilled"
                class="self-start!"
                @click="createWorkspace(newWorkspaceName)"
            >
                添加工作区
            </el-button>
            <el-input
                v-model="newWorkspaceName"
                clearable
                placeholder="请输入工作区名称"
                spellcheck="false"
                class="h-full! [&_.el-input\_\_inner]:h-full!"
                @keydown.prevent.enter="createWorkspace(newWorkspaceName)"
            />
        </div>
        <el-scrollbar class="flex-1 min-h-0" view-class="flex flex-wrap gap-2">
            <template v-if="!dataStore.isDataLoaded">
                <div v-for="i in 3" :key="i" class="skeleton-card skeleton w-full"></div>
            </template>
            <template v-else>
            <div
                v-for="workspace in workspaces"
                :key="workspace.id"
                class="flex justify-between items-center p-2 py-4 border border-(--color-border) hover:bg-(--color-gray-100) cursor-pointer transition-colors duration-200 rounded-(--radius-md) bg-(--color-bg-card) shadow-(--shadow-sm)"
                @click="routeToWorkspace(workspace.id)"
            >
                <div class="flex flex-col mr-2">
                    <el-text class="text-lg! font-bold! self-start!">
                        {{ workspace.name || '未命名' }}
                    </el-text>
                </div>
                <div
                    class="flex items-center h-full! p-2 rounded-md hover:bg-(--color-gray-200) transition-colors duration-200"
                    @click.stop="copyWorkspace(workspace.id)"
                >
                    <el-icon><CopyOutline /></el-icon>
                </div>
                <el-popconfirm
                    title="确定删除此工作区吗？"
                    :hide-after="0"
                    @confirm="deleteWorkspace(workspace.id)"
                >
                    <template #reference>
                        <div
                            class="flex items-center h-full! p-2 rounded-md hover:bg-(--color-gray-200) transition-colors duration-200"
                            @click.stop=""
                        >
                            <el-icon><Delete /></el-icon>
                        </div>
                    </template>
                </el-popconfirm>
            </div>
            <EmptyState v-if="workspaces.length === 0" :icon="CirclePlusFilled" title="暂无工作区" />
            </template>
        </el-scrollbar>
    </div>
</template>

<script setup lang="ts">
import { useDataStore } from '@renderer/stores/data'
import EmptyState from '@renderer/components/EmptyState.vue'
import { computed, ref } from 'vue'
import { CopyOutline } from '@vicons/ionicons5'
import { Delete } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { CirclePlusFilled } from '@element-plus/icons-vue'
import { createError, notFoundError } from '@renderer/stores/error'
import log from 'electron-log/renderer'
import { cloneDeep } from 'lodash'
import { PromptTag } from '@shared/models/prompt-tag'

const dataStore = useDataStore()

const router = useRouter()

const newWorkspaceName = ref('')

const workspaces = computed(() =>
    dataStore.workspace.readonly.toSorted((a, b) => b.updateTime - a.updateTime)
)

function routeToWorkspace(workspaceId: string): void {
    router.push({ path: `/workspace/${workspaceId}` })
}

async function createWorkspace(name: string): Promise<void> {
    const newWorkspace = await dataStore.workspace.create({ name })
    if (newWorkspace) {
        await router.push({ path: `/workspace/${newWorkspace.id}` })
    } else {
        ElMessage.error('添加工作区失败')
    }
}

async function deleteWorkspace(workspaceId: string): Promise<void> {
    try {
        const success = await dataStore.workspace.delete(workspaceId)
        if (success) {
            ElMessage.success('工作区已删除')
        } else {
            ElMessage.error('删除工作区失败')
        }
    } catch (err) {
        if (err === notFoundError) {
            ElMessage.error('工作区不存在')
        } else {
            log.error('删除工作区失败', err)
            ElMessage.error('删除工作区失败')
        }
    }
}

async function copyWorkspace(workspaceId: string): Promise<void> {
    try {
        const workspace = await dataStore.workspace.readonly.find((w) => w.id === workspaceId)
        if (!workspace) {
            ElMessage.error('工作区不存在')
            return
        }
        let newWorkspaceName = `${workspace.name} (副本)`
        while (await dataStore.workspace.readonly.find((w) => w.name === newWorkspaceName)) {
            newWorkspaceName = `${newWorkspaceName} (副本)`
        }
        const newWorkspace = await dataStore.workspace.create({
            name: newWorkspaceName,
            positive: cloneDeep(workspace.positive) as PromptTag[],
            negative: cloneDeep(workspace.negative) as PromptTag[],
            tagIds: cloneDeep(workspace.tagIds) as string[],
        })
        if (newWorkspace) {
            ElMessage.success('工作区已复制')
        } else {
            ElMessage.error('复制工作区失败')
        }
    } catch (err) {
        if (err === notFoundError) {
            ElMessage.error('工作区不存在')
        } else if (err === createError) {
            ElMessage.error('创建工作区失败')
        } else {
            log.error('复制工作区失败', err)
            ElMessage.error('复制工作区失败')
        }
    }
}
</script>
