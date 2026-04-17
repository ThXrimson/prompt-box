<template>
    <el-image
        v-if="!isNil(src)"
        :src="src"
        :preview-src-list="[src]"
        hide-on-click-modal
        class="w-40 h-40 object-cover rounded-md cursor-pointer hover:shadow-lg transition-shadow duration-300"
        fit="cover"
        loading="lazy"
    />
    <div
        v-else
        class="flex justify-center items-center w-40 h-40 bg-(--color-gray-200) text-(--color-text-tertiary) rounded-(--radius-md) cursor-pointer hover:shadow-lg transition-shadow duration-300"
    >
        <el-icon size="32"><ImageOutline /></el-icon>
    </div>
</template>
<script setup lang="ts">
import { isNil } from 'lodash'
import { Nullish } from 'utility-types'
import { ImageOutline } from '@vicons/ionicons5'

defineProps<{
    src: string | Nullish
}>()
</script>
<style scoped></style>
