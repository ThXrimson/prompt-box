<template>
  <div class="flex justify-start h-full w-full gap-1">
    <el-menu :default-active="activeMenu" collapse @select="handleMenuSelect">
      <el-menu-item index="/prompt-collection">
        <el-icon><prompt-icon /></el-icon>
        <template #title>提示词库</template>
      </el-menu-item>
      <el-menu-item index="/workspaces">
        <el-icon><workspace-icon /></el-icon>
        <template #title>工作区</template>
      </el-menu-item>
      <el-menu-item index="/examples">
        <el-icon><document-icon /></el-icon>
        <template #title>示例</template>
      </el-menu-item>
    </el-menu>
    <div class="flex flex-col flex-1 min-w-0 self-stretch my-1 mr-1">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useStorage } from '@renderer/stores/storage'
import { ElLoading } from 'element-plus'
import { Document as DocumentIcon } from '@element-plus/icons-vue'
import PromptIcon from '@renderer/icons/Prompt.vue'
import WorkspaceIcon from '@renderer/icons/Workspace.vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

const storage = useStorage()
const route = useRoute()

const loadingInstance = ElLoading.service({ body: true })

const initialized = ref(false)
watch(
  () => storage.initialized,
  () => {
    if (storage.initialized) {
      initialized.value = true
      loadingInstance.close()
    }
  },
  { immediate: true }
)

const activeMenu = ref('/prompt-collection')
watch(
  () => route.path,
  (newPath) => {
    if (newPath.startsWith('/workspace/')) {
      newPath = '/workspaces'
    }
    activeMenu.value = newPath
  },
  { immediate: true } // 立即执行一次，确保初始状态正确
)

const router = useRouter()

function handleMenuSelect(path: string): void {
  router.push(path)
}
</script>
