import { type ComputedRef, computed, type Ref, ref } from 'vue'

export interface ShortcutDef {
    id: string
    keys: string
    description: string
    category: string
    when?: string
}

const shortcuts = ref<ShortcutDef[]>([
    { id: 'nav-prompt', keys: 'Ctrl+1', description: '提示词库', category: '导航' },
    { id: 'nav-workspace', keys: 'Ctrl+2', description: '工作区', category: '导航' },
    { id: 'nav-examples', keys: 'Ctrl+3', description: '示例', category: '导航' },
    { id: 'global-search', keys: 'Ctrl+F', description: '搜索', category: '全局' },
    { id: 'shortcut-help', keys: 'Ctrl+/', description: '快捷键帮助', category: '全局' },
    { id: 'editor-undo', keys: 'Ctrl+Z', description: '撤回', category: '编辑器', when: '工作区页面' },
    { id: 'editor-redo', keys: 'Ctrl+Y', description: '重做', category: '编辑器', when: '工作区页面' },
    { id: 'tag-single-click', keys: '单击', description: '折叠/展开组', category: '标签操作', when: '工作区编辑器' },
    { id: 'tag-double-click', keys: '双击', description: '切换禁用', category: '标签操作', when: '工作区编辑器' },
    { id: 'tag-right-click', keys: '右键', description: '复制文本', category: '标签操作', when: '工作区编辑器' },
    { id: 'tag-middle-click', keys: '中键', description: '删除标签', category: '标签操作', when: '工作区编辑器' },
    { id: 'tag-hover-menu', keys: '悬停', description: '打开菜单(含编辑)', category: '标签操作', when: '工作区编辑器' },
])

export function useShortcutRegistry(): {
    shortcuts: Ref<ShortcutDef[]>
    categories: ComputedRef<string[]>
    registerShortcut: (shortcut: ShortcutDef) => void
    unregisterShortcut: (id: string) => void
    getShortcutsByCategory: (category: string) => ShortcutDef[]
    formatShortcutTooltip: (description: string, keys?: string) => string
    findShortcutById: (id: string) => ShortcutDef | undefined
} {
    function registerShortcut(shortcut: ShortcutDef): void {
        const index = shortcuts.value.findIndex((s) => s.id === shortcut.id)
        if (index !== -1) {
            shortcuts.value[index] = shortcut
        } else {
            shortcuts.value.push(shortcut)
        }
    }

    function unregisterShortcut(id: string): void {
        shortcuts.value = shortcuts.value.filter((s) => s.id !== id)
    }

    const categories = computed(() => {
        const cats = new Set<string>()
        for (const s of shortcuts.value) {
            cats.add(s.category)
        }
 return Array.from(cats)
    })

    function getShortcutsByCategory(category: string): ShortcutDef[] {
        return shortcuts.value.filter((s) => s.category === category)
    }

    function formatShortcutTooltip(description: string, keys?: string): string {
        if (!keys) return description
        return `${description} (${keys})`
    }

    function findShortcutById(id: string): ShortcutDef | undefined {
        return shortcuts.value.find((s) => s.id === id)
    }

    return {
        shortcuts,
        categories,
        registerShortcut,
        unregisterShortcut,
        getShortcutsByCategory,
        formatShortcutTooltip,
        findShortcutById,
    }
}
