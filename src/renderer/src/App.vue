<template>
    <div class="flex justify-start h-full w-full">
        <div v-if="!dataStore.isDataLoaded" class="global-loading w-full">
            <div class="global-loading__spinner"></div>
            <span class="global-loading__text">加载中...</span>
        </div>
        <template v-else>
            <nav class="sidebar-nav">
                <el-tooltip content="提示词库 (Ctrl+1)" placement="right">
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
                <el-tooltip :content="workspaceTooltip + ' (Ctrl+2)'" placement="right">
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
                <el-tooltip content="示例 (Ctrl+3)" placement="right">
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
        </template>
        <transition name="save-fade">
            <div v-if="showSaveIndicator" class="save-indicator">已保存</div>
        </transition>
        <ShortcutHelpPanel v-model="showShortcutHelp" />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Document as DocumentIcon } from '@element-plus/icons-vue'
import WorkspaceIcon from '@renderer/icons/Workspace.vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { Language } from '@vicons/ionicons5'
import { useDataStore } from '@renderer/stores/data'
import ShortcutHelpPanel from '@renderer/components/ShortcutHelpPanel.vue'

const dataStore = useDataStore()
const showSaveIndicator = ref(false)
const showShortcutHelp = ref(false)

watch(() => dataStore.lastSaveTime, () => {
    showSaveIndicator.value = true
    setTimeout(() => {
        showSaveIndicator.value = false
    }, 1500)
})

const route = useRoute()

const workspaceTooltip = computed(() => {
    if (route.path.startsWith('/workspace/')) {
        const workspaceId = route.params.workspaceId as string
        if (workspaceId) {
            const workspace = dataStore.workspace.readonly.find((w) => w.id === workspaceId)
            if (workspace) {
                return `工作区 - ${workspace.name}`
            }
        }
    }
    return '工作区'
})

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

function handleGlobalKeydown(e: KeyboardEvent): void {
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
            e.preventDefault()
            router.push('/prompt-collection')
        } else if (e.key === '2') {
            e.preventDefault()
            router.push('/workspaces')
        } else if (e.key === '3') {
            e.preventDefault()
            router.push('/examples')
        }
    }
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        const searchWrapper = document.querySelector('[data-search-input]')
        if (searchWrapper) {
            const input = searchWrapper.querySelector('input')
            if (input) input.focus()
        }
    }
    if (e.ctrlKey && e.key === '/') {
        e.preventDefault()
        showShortcutHelp.value = !showShortcutHelp.value
    }
}

onMounted(() => {
    document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleGlobalKeydown)
})
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

.save-indicator {
    position: fixed;
    bottom: 12px;
    right: 12px;
    padding: 4px 12px;
    background: var(--color-success);
    color: white;
    border-radius: var(--radius-sm);
    font-size: 12px;
    z-index: 9999;
}

.save-fade-enter-active,
.save-fade-leave-active {
    transition: opacity 0.3s ease;
}

.save-fade-enter-from,
.save-fade-leave-to {
    opacity: 0;
}
</style>
