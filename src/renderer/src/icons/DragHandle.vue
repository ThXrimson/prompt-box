<template>
    <svg
        :width="width"
        :height="height"
        viewBox="0 0 18 5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M1 1h16M1 4h16"
            :stroke="stroke"
            :stroke-width="strokeWidth"
            stroke-miterlimit="10"
            stroke-linecap="round"
        />
    </svg>
</template>

<script setup lang="ts">
defineProps({
    width: {
        type: String,
    },
    height: {
        type: String,
    },
    stroke: {
        type: String,
        default: 'currentColor',
    },
    strokeWidth: {
        type: String,
        default: '1.5',
    },
})
</script>
