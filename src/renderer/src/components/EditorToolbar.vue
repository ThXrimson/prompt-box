<template>
    <div class="flex justify-between gap-2">
        <div class="flex gap-2 justify-start">
            <el-tooltip
                v-if="false"
                content="添加为示例"
                :enterable="false"
                placement="top-end"
                :hide-after="0"
            >
                <el-button :icon="Plus" />
            </el-tooltip>
            <el-tooltip
                v-if="false"
                content="选择示例为模板"
                :enterable="false"
                placement="top-end"
                :hide-after="0"
            >
                <el-button :icon="Star" class="m-0!" />
            </el-tooltip>
            <el-tooltip
                content="克隆工作区"
                :enterable="false"
                placement="top-end"
                :hide-after="0"
            >
                <el-button :icon="DuplicateOutline" @click="emit('clone')" />
            </el-tooltip>
            <el-tooltip
                content="撤回 (Ctrl+Z)"
                :enterable="false"
                placement="top-end"
                :hide-after="0"
            >
                <el-button
                    :icon="ArrowUndoOutline"
                    class="m-0!"
                    :disabled="!canUndo"
                    @click="emit('undo')"
                />
            </el-tooltip>
            <el-tooltip
                content="重做 (Ctrl+Y)"
                :enterable="false"
                placement="top-end"
                :hide-after="0"
            >
                <el-button
                    :icon="ArrowRedoOutline"
                    class="m-0!"
                    :disabled="!canRedo"
                    @click="emit('redo')"
                />
            </el-tooltip>
            <div class="w-px h-6 bg-(--color-border) self-center mx-1"></div>
            <el-tooltip
                :content="!editMode ? '编辑模式' : '显示模式'"
                :enterable="false"
                placement="top-start"
                :hide-after="0"
            >
                <el-button
                    :icon="Edit"
                    :type="!editMode ? 'default' : 'success'"
                    class="m-0!"
                    @click="emit('toggleEditMode')"
                />
            </el-tooltip>
            <el-tooltip
                content="复制"
                :enterable="false"
                placement="top-start"
                :hide-after="0"
            >
                <el-button :icon="CopyDocument" class="m-0!" @click="emit('copy')" />
            </el-tooltip>
            <div class="w-px h-6 bg-(--color-border) self-center mx-1"></div>
            <el-switch
                :model-value="removeLora"
                inline-prompt
                active-text="去掉LORA"
                inactive-text="保留LORA"
                style="
                    --el-switch-on-color: var(--color-success);
                    --el-switch-off-color: var(--color-danger);
                "
                class="[&_.is-text]:font-sans [&_.is-text]:italic"
                @update:model-value="onUpdateRemoveLora"
            />
            <div class="w-px h-6 bg-(--color-border) self-center mx-1"></div>
            <el-tooltip
                v-if="false"
                content="复制Lora提示词"
                :enterable="false"
                placement="top-start"
                :hide-after="0"
            >
                <el-button class="m-0!"> Lora </el-button>
            </el-tooltip>
            <el-tooltip
                content="添加换行"
                :enterable="false"
                placement="top-end"
                :hide-after="0"
            >
                <el-button class="m-0! italic" @click="emit('addEol')">EOL</el-button>
            </el-tooltip>
            <el-switch
                :model-value="isPositiveEditor"
                inline-prompt
                active-text="POSITIVE"
                inactive-text="NEGATIVE"
                style="
                    --el-switch-on-color: var(--color-success);
                    --el-switch-off-color: var(--color-danger);
                "
                class="[&_.is-text]:font-mono [&_.is-text]:italic"
                @update:model-value="onUpdateIsPositiveEditor"
            />
            <div class="w-px h-6 bg-(--color-border) self-center mx-1"></div>
            <el-tooltip
                content="展开所有"
                :enterable="false"
                placement="top-end"
                :hide-after="0"
            >
                <el-button
                    :icon="Expand"
                    class="m-0!"
                    @click="emit('expandAll')"
                />
            </el-tooltip>
            <el-tooltip
                content="折叠所有"
                :enterable="false"
                placement="top-end"
                :hide-after="0"
            >
                <el-button
                    :icon="Contract"
                    class="m-0!"
                    @click="emit('collapseAll')"
                />
            </el-tooltip>
        </div>
        <el-input
            :model-value="searchText"
            placeholder="搜索或添加"
            clearable
            spellcheck="false"
            @update:model-value="emit('update:searchText', $event)"
            @keyup.enter="emit('createTag', searchText)"
            @keyup.esc="emit('update:searchText', '')"
        >
            <template #prefix>
                <el-icon class="cursor-pointer" @click.stop="emit('copySearchText')">
                    <copy-document />
                </el-icon>
            </template>
        </el-input>
        <el-button
            :icon="containerHeight === minHeight ? CaretUp : CaretDown"
            circle
            @click="emit('toggleHeight')"
        />
        <el-popover title="操作说明" placement="top-end" :width="220">
            <div class="text-sm leading-6">
                <div>🖱️ 单击 — 折叠/展开组</div>
                <div>🖱️ 双击 — 切换禁用</div>
                <div>🖱️ 右键 — 复制文本</div>
                <div>🖱️ 中键 — 删除标签</div>
                <div>🖱️ 悬停 — 打开菜单</div>
                <div>⌨️ Ctrl+Z — 撤销</div>
                <div>⌨️ Ctrl+Y — 重做</div>
                <div>⌨️ Ctrl+/ — 快捷键帮助</div>
            </div>
            <template #reference>
                <el-button :icon="Information" circle class="ml-0!" />
            </template>
        </el-popover>
    </div>
</template>

<script setup lang="ts">
import { CopyDocument, Edit, Plus, Star } from '@element-plus/icons-vue'
import {
    Information,
    CaretUp,
    CaretDown,
    ArrowUndoOutline,
    ArrowRedoOutline,
    Expand,
    Contract,
    DuplicateOutline,
} from '@vicons/ionicons5'

defineProps<{
    editMode: boolean
    removeLora: boolean
    isPositiveEditor: boolean
    searchText: string
    containerHeight: number
    canUndo: boolean
    canRedo: boolean
    minHeight: number
}>()

const emit = defineEmits<{
    (e: 'clone'): void
    (e: 'undo'): void
    (e: 'redo'): void
    (e: 'toggleEditMode'): void
    (e: 'copy'): void
    (e: 'update:removeLora', value: boolean): void
    (e: 'addEol'): void
    (e: 'update:isPositiveEditor', value: boolean): void
    (e: 'expandAll'): void
    (e: 'collapseAll'): void
    (e: 'update:searchText', value: string): void
    (e: 'createTag', text: string): void
    (e: 'copySearchText'): void
    (e: 'toggleHeight'): void
}>()

function onUpdateRemoveLora(value: string | number | boolean): void {
    emit('update:removeLora', !!value)
}

function onUpdateIsPositiveEditor(value: string | number | boolean): void {
    emit('update:isPositiveEditor', !!value)
}
</script>
