<template>
    <el-scrollbar class="border-2 rounded-md border-gray-200">
        <vue-draggable v-model="tagIds" :animation="50" class="flex flex-col gap-1 p-2 pr-2.5">
            <div
                v-for="tagId in tagIds"
                :ref="tagIdRefs.set"
                :key="tagId"
                :tag-id="tagId"
                class="flex flex-1 cursor-pointer rounded-md p-2 justify-between items-center-safe transition-colors"
                :class="{
                    'bg-teal-400 hover:bg-teal-600': selectedId !== tagId,
                    'bg-sky-400 hover:bg-sky-600': selectedId === tagId,
                }"
                @click="emit('select', tagId)"
            >
                <el-text class="text-white! font-bold!">
                    {{ getTagText(tagId) }}
                </el-text>
                <el-icon
                    size="20px"
                    class="rounded-full hover:bg-teal-800"
                    @click.stop="emit('closeTag', tagId)"
                >
                    <close class="text-white!" />
                </el-icon>
            </div>
        </vue-draggable>
    </el-scrollbar>
</template>

<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import { useDataStore } from '@renderer/stores/data'
import { Close } from '@element-plus/icons-vue'
import { useTemplateRefsList } from '@vueuse/core'
import { UNCATEGORIZED_TAG_ID } from '@shared/models/tag'

defineProps<{
    selectedId: string
}>()

const tagIds = defineModel<string[]>('tag-ids', { required: true })

const emit = defineEmits<{
    (e: 'closeTag', tagId: string): void
    (e: 'select', tagId: string): void
}>()

const tagIdRefs = useTemplateRefsList()

defineExpose({
    scrollTagIntoView(tagID: string): void {
        for (const ref of tagIdRefs.value) {
            if (ref.getAttribute('tag-id') === tagID) {
                ref.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center',
                })
                break
            }
        }
    },
})

const dataStore = useDataStore()

function getTagText(tagId: string): string {
    if (tagId === UNCATEGORIZED_TAG_ID) {
        return '未分类'
    }
    return dataStore.tag.readonly.find((t) => t.id === tagId)?.text ?? 'undefined'
}
</script>
