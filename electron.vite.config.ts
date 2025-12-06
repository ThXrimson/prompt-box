import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { transformLazyShow } from 'v-lazy-show'

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        resolve: {
            alias: {
                '@shared': resolve('src/shared'),
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        resolve: {
            alias: {
                '@shared': resolve('src/shared'),
            },
        },
    },
    renderer: {
        resolve: {
            alias: {
                '@renderer': resolve('src/renderer/src'),
                '@shared': resolve('src/shared'),
            },
        },
        plugins: [
            vue({
                template: {
                    compilerOptions: {
                        nodeTransforms: [transformLazyShow],
                    },
                },
            }),
            tailwindcss(),
            AutoImport({
                resolvers: [ElementPlusResolver()],
            }),
            Components({
                resolvers: [ElementPlusResolver()],
            }),
        ],
    },
})
