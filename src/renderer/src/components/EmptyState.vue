<template>
    <div class="empty-state">
        <el-icon class="empty-state-icon"><component :is="icon" /></el-icon>
        <span class="empty-state-title">{{ title }}</span>
        <span v-if="description" class="empty-state-description">{{ description }}</span>
    </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
    icon: Component
    title: string
    description?: string
}>()
</script>

<style lang="css" scoped>
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 0;
    color: var(--color-text-tertiary);
}

.empty-state-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
}

.empty-state-title {
    font-size: 0.875rem;
}

.empty-state-description {
    font-size: 0.75rem;
    margin-top: 0.25rem;
    color: var(--color-text-tertiary);
    opacity: 0.8;
}
</style>
