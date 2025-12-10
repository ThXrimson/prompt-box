<template>
    <div class="flex flex-col gap-2 m-2 flex-1 min-h-0">
        <div class="flex gap-2">
            <el-button
                type="success"
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
            <div
                v-for="workspace in workspaces"
                :key="workspace.id"
                class="flex justify-between items-center gap-2 p-2 border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors duration-200 rounded-md"
                @click="routeToWorkspace(workspace.id)"
            >
                <div class="flex flex-col gap-2">
                    <el-text class="text-lg! font-bold! self-start!">
                        {{ workspace.name || '未命名' }}
                    </el-text>
                </div>
                <el-popconfirm
                    title="确定删除此工作区吗？"
                    :hide-after="0"
                    @confirm="deleteWorkspace(workspace.id)"
                >
                    <template #reference>
                        <div
                            class="flex items-center gap-2 h-full! p-4 rounded-md hover:bg-gray-200 transition-colors duration-200"
                            @click.stop=""
                        >
                            <el-icon><Delete /></el-icon>
                        </div>
                    </template>
                </el-popconfirm>
            </div>
        </el-scrollbar>
    </div>
</template>

<script setup lang="ts">
import { useDataStore } from '@renderer/stores/data'
import { computed, ref } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { CirclePlusFilled } from '@element-plus/icons-vue'
import { notFoundError } from '@renderer/stores/error'
import log from 'electron-log/renderer'

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
</script>
