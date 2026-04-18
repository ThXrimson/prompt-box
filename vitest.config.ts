import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/renderer/src/__tests__/**/*.test.ts'],
    },
    resolve: {
        alias: {
            '@renderer': resolve('src/renderer/src'),
            '@shared': resolve('src/shared'),
        },
    },
})
