<template>
    <el-scrollbar class="border-2 rounded-md border-gray-200">
        <vue-draggable
            :model-value="tagIds"
            :animation="50"
            class="flex flex-col gap-1 p-2 pr-2.5"
            @update:model-value="emit('update:tagIDs', $event)"
        >
            <div
                v-for="tagId in tagIds"
                :ref="tagIdRefs.set"
                :key="tagId"
                :tag-id="tagId"
                class="flex flex-1 cursor-pointer rounded-md p-2 justify-between items-center-safe transition-colors"
                :class="{
                    'bg-teal-400 hover:bg-teal-600': selectedID !== tagId,
                    'bg-sky-400 hover:bg-sky-600': selectedID === tagId,
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

defineProps<{
    tagIds: string[]
    selectedID: string
}>()

const emit = defineEmits<{
    (e: 'update:tagIDs', tagIDs: string[]): void
    (e: 'closeTag', tagID: string): void
    (e: 'select', tagID: string): void
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

function getTagText(tagID: string): string {
    return dataStore.tag.readonly.find((t) => t.id === tagID)?.text ?? 'undefined'
}
</script>
