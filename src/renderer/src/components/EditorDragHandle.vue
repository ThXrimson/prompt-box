<template>
    <div
        class="mt-1 h-2 cursor-ns-resize rounded-t-lg flex items-center justify-center hover:[&>div]:bg-(--color-primary)"
        @mousedown="$emit('startDragging', $event)"
    >
        <div class="w-8 h-1 bg-(--color-gray-400) rounded" />
    </div>
</template>

<script setup lang="ts">
defineEmits<{
    startDragging: [event: MouseEvent]
}>()
</script>
