<template>
    <div class="navigator">
        <slot />
    </div>
</template>
<script setup lang="ts"></script>
<style lang="css">
.navigator {
    background-color: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    padding: var(--spacing-sm) var(--spacing-md);
}
</style>
