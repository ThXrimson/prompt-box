<template>
    <div class="flex justify-start h-full w-full">
        <nav class="sidebar-nav">
            <el-tooltip content="提示词库" placement="right">
                <div
                    class="nav-item"
                    :class="{ 'nav-item--active': activeMenu === '/prompt-collection' }"
                    @click="handleMenuSelect('/prompt-collection')"
                >
                    <div
                        v-if="activeMenu === '/prompt-collection'"
                        class="nav-item__indicator"
                    ></div>
                    <Language class="nav-item__icon" />
                </div>
            </el-tooltip>
            <el-tooltip content="工作区" placement="right">
                <div
                    class="nav-item"
                    :class="{ 'nav-item--active': activeMenu === '/workspaces' }"
                    @click="handleMenuSelect('/workspaces')"
                >
                    <div
                        v-if="activeMenu === '/workspaces'"
                        class="nav-item__indicator"
                    ></div>
                    <WorkspaceIcon class="nav-item__icon" />
                </div>
            </el-tooltip>
            <el-tooltip content="示例" placement="right">
                <div
                    class="nav-item"
                    :class="{ 'nav-item--active': activeMenu === '/examples' }"
                    @click="handleMenuSelect('/examples')"
                >
                    <div
                        v-if="activeMenu === '/examples'"
                        class="nav-item__indicator"
                    ></div>
                    <DocumentIcon class="nav-item__icon" />
                </div>
            </el-tooltip>
        </nav>
        <div class="flex flex-col flex-1 min-w-0 self-stretch p-1.5">
            <router-view v-slot="{ Component }">
                <transition name="page-fade" mode="out-in">
                    <keep-alive>
                        <component :is="Component" />
                    </keep-alive>
                </transition>
            </router-view>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Document as DocumentIcon } from '@element-plus/icons-vue'
import WorkspaceIcon from '@renderer/icons/Workspace.vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { Language } from '@vicons/ionicons5'

const route = useRoute()

const activeMenu = ref('/prompt-collection')
watch(
    () => route.path,
    (newPath) => {
        if (newPath.startsWith('/workspace/')) {
            newPath = '/workspaces'
        }
        activeMenu.value = newPath
    },
    { immediate: true }
)

const router = useRouter()

function handleMenuSelect(path: string): void {
    router.push(path)
}
</script>

<style lang="css" scoped>
.sidebar-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 56px;
    background-color: var(--color-bg-card);
    border-right: 1px solid var(--color-border);
}

.nav-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    cursor: pointer;
    transition: all 0.2s;
}

.nav-item:hover {
    background-color: var(--color-gray-100);
}

.nav-item--active {
    background-color: var(--color-primary-50);
}

.nav-item--active:hover {
    background-color: var(--color-primary-50);
}

.nav-item__indicator {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background-color: var(--color-primary);
    border-radius: 0 2px 2px 0;
}

.nav-item__icon {
    width: 22px;
    height: 22px;
    color: var(--color-text-tertiary);
    transition: all 0.2s;
}

.nav-item:hover .nav-item__icon {
    color: var(--color-text-secondary);
}

.nav-item--active .nav-item__icon {
    color: var(--color-primary);
}
</style>
