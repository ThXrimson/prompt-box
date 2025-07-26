<template>
  <div class="flex flex-col gap-2 m-2 flex-1 min-h-0">
    <div class="flex gap-2">
      <el-button
        type="success"
        :icon="CirclePlusFilled"
        class="self-start!"
        @click="handleAddWorkspace"
      >
        添加工作区
      </el-button>
      <el-input
        v-model="workspaceName"
        clearable
        placeholder="请输入工作区名称"
        class="h-full! [&_.el-input\_\_inner]:h-full!"
        @keydown.prevent.enter="handleAddWorkspace"
      />
    </div>
    <el-scrollbar class="flex-1 min-h-0" view-class="flex flex-col gap-2">
      <div
        v-for="workspace in workspaces"
        :key="workspace.id"
        class="flex justify-between items-center gap-2 p-2 border-b border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors duration-200 rounded-md"
        @click="handleRouteToWorkspace(workspace.id)"
      >
        <div class="flex flex-col gap-2">
          <el-text class="text-lg! font-bold! self-start!">
            {{ workspace.name || '未命名' }}
          </el-text>
          <el-text class="text-sm! italic! self-start!"> POSITIVE </el-text>
          <el-text class="text-gray-500! text-xs! self-start!">
            {{ workspace.positiveEditor }}
          </el-text>
          <el-text class="text-sm! italic! self-start!"> NEGATIVE </el-text>
          <el-text class="text-gray-500! text-xs! self-start!">
            {{ workspace.negativeEditor }}
          </el-text>
        </div>
        <el-popconfirm
          title="确定删除此工作区吗？"
          :hide-after="0"
          @confirm="handleDeleteWorkspace(workspace.id)"
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
import { useStorage } from '@renderer/stores/storage'
import { computed, ref } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { CirclePlusFilled } from '@element-plus/icons-vue'

const storage = useStorage()

const router = useRouter()

const workspaceName = ref('')

const workspaces = computed(() =>
  Array.from(storage.workspaces.values()).sort(
    (a, b) => b.updateTime - a.updateTime
  )
)

function handleRouteToWorkspace(workspaceID: string): void {
  router.push({ path: `/workspace/${workspaceID}` })
}

async function handleAddWorkspace(): Promise<void> {
  const newWorkspace = await storage.addWorkspace({ name: workspaceName.value })
  if (newWorkspace) {
    router.push({ path: `/workspace/${newWorkspace.id}` })
  } else {
    ElMessage.error('添加工作区失败')
  }
}

async function handleDeleteWorkspace(workspaceID: string): Promise<void> {
  const success = await storage.deleteWorkspace(workspaceID)
  if (success) {
    ElMessage.success('工作区已删除')
  } else {
    ElMessage.error('删除工作区失败')
  }
}
</script>
