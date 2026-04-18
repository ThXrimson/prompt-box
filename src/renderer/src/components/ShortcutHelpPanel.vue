<template>
    <el-dialog
        v-model="visible"
        title="快捷键"
        width="420px"
        :show-close="true"
        @keyup.esc.stop.prevent="visible = false"
    >
        <el-input
            v-model="filter"
            placeholder="搜索快捷键..."
            clearable
            class="mb-3"
        />
        <div v-for="category in filteredCategories" :key="category" class="mb-3">
            <div class="text-xs font-semibold text-(--color-text-tertiary) mb-1 uppercase tracking-wider">
                {{ category }}
            </div>
            <div
                v-for="shortcut in filteredShortcutsByCategory(category)"
                :key="shortcut.id"
                class="flex items-center justify-between py-1.5 px-2 rounded hover:bg-(--color-gray-50)"
            >
                <span class="text-sm text-(--color-text-primary)">{{ shortcut.description }}</span>
                <div class="flex items-center gap-1">
                    <span
                        v-if="shortcut.when"
                        class="text-xs text-(--color-text-tertiary) mr-1"
                    >
                        {{ shortcut.when }}
                    </span>
                    <kbd
                        v-for="key in shortcut.keys.split('+')"
                        :key="key"
                        class="shortcut-key"
                    >
                        {{ key }}
                    </kbd>
                </div>
            </div>
        </div>
    </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useShortcutRegistry, type ShortcutDef } from '@renderer/hooks/useShortcutRegistry'

const visible = defineModel<boolean>({ default: false })

const { shortcuts, categories } = useShortcutRegistry()
const filter = ref('')

const filteredCategories = computed(() => {
    if (!filter.value) return categories.value
    return categories.value.filter((cat) =>
        shortcuts.value.some(
            (s) =>
                s.category === cat &&
                (s.description.toLowerCase().includes(filter.value.toLowerCase()) ||
                    s.keys.toLowerCase().includes(filter.value.toLowerCase()))
        )
    )
})

function filteredShortcutsByCategory(category: string): ShortcutDef[] {
    const list = shortcuts.value.filter((s) => s.category === category)
    if (!filter.value) return list
    return list.filter(
        (s) =>
            s.description.toLowerCase().includes(filter.value.toLowerCase()) ||
            s.keys.toLowerCase().includes(filter.value.toLowerCase())
    )
}
</script>

<style scoped>
.shortcut-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    font-size: 11px;
    font-family: inherit;
    line-height: 1;
    color: var(--color-text-secondary);
    background: var(--color-gray-100);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-sm);
    box-shadow: 0 1px 0 var(--color-border-light);
}
</style>
