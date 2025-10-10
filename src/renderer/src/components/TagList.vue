<template>
  <el-scrollbar class="border-2 rounded-md border-gray-200">
    <vue-draggable
      :model-value="tagIDs"
      :animation="50"
      class="flex flex-col gap-1 p-2 pr-2.5"
      @update:model-value="emit('update:tagIDs', $event)"
    >
      <div
        v-for="tagID in tagIDs"
        :ref="tagIDRefs.set"
        :key="tagID"
        :tag-id="tagID"
        class="flex flex-1 cursor-pointer rounded-md p-2 justify-between items-center-safe transition-colors"
        :class="{
          'bg-teal-400 hover:bg-teal-600': selectedID !== tagID,
          'bg-sky-400 hover:bg-sky-600': selectedID === tagID,
        }"
        @click="emit('select', tagID)"
      >
        <el-text class="text-white! font-bold!">
          {{ getTagText(tagID) }}
        </el-text>
        <el-icon
          size="20px"
          class="rounded-full hover:bg-teal-800"
          @click.stop="emit('closeTag', tagID)"
        >
          <close class="text-white!" />
        </el-icon>
      </div>
    </vue-draggable>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import { useStorage } from '@renderer/stores/storage'
import { Close } from '@element-plus/icons-vue'
import { useTemplateRefsList } from '@vueuse/core'

defineProps<{
  tagIDs: string[]
  selectedID: string
}>()

const emit = defineEmits<{
  (e: 'update:tagIDs', tagIDs: string[]): void
  (e: 'closeTag', tagID: string): void
  (e: 'select', tagID: string): void
}>()

const tagIDRefs = useTemplateRefsList()

defineExpose({
  scrollTagIntoView(tagID: string): void {
    for (const ref of tagIDRefs.value) {
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

const storage = useStorage()

function getTagText(tagID: string): string {
  return storage.getTagByID(tagID)?.text ?? 'undefined'
}
</script>
