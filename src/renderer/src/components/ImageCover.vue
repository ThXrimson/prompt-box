<template>
    <el-image
        v-if="!isNil(src)"
        :src="src"
        class="w-40 h-40 object-cover rounded-md cursor-pointer hover:shadow-lg transition-shadow duration-300"
        fit="cover"
        loading="lazy"
    />
    <div
        v-else
        class="flex justify-center items-center w-40 h-40 bg-gray-300 text-gray-400 rounded-md cursor-pointer hover:shadow-lg transition-shadow duration-300"
    >
        Empty
    </div>
</template>
<script setup lang="ts">
import { isNil } from 'lodash'
import { Nullish } from 'utility-types'

defineProps<{
    src: string | Nullish
}>()
</script>
<style scoped></style>
