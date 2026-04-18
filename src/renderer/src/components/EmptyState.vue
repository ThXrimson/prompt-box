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
    padding: 3rem 0;
    color: var(--color-text-tertiary);
    animation: empty-fade-in 0.4s ease-out;
}

.empty-state-icon {
    font-size: 3rem;
    margin-bottom: var(--spacing-md);
    opacity: 0.35;
}

.empty-state-title {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-text-secondary);
}

.empty-state-description {
    font-size: 0.8125rem;
    margin-top: var(--spacing-xs);
    color: var(--color-text-tertiary);
}

@keyframes empty-fade-in {
    from {
        opacity: 0;
        transform: translateY(8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
