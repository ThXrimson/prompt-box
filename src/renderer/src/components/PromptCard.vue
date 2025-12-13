<template>
    <div @contextmenu="openImage">
        <Teleport to="body">
            <el-image
                v-if="!isNil(promptImageFileName)"
                ref="image"
                :src="getImageUrl(promptImageFileName)"
                :preview-src-list="[getImageUrl(promptImageFileName)]"
                hide-on-click-modal
                loading="lazy"
                class="[&_.el-image\_\_preview]:hidden"
            />
        </Teleport>
        <div
            ref="card"
            class="max-w-100 flex gap-1 justify-between border border-gray-200 rounded-sm p-1.5 transition-all duration-300 relative"
            :class="{
                'bg-orange-400 hover:bg-orange-500': selected,
                'bg-teal-400 hover:bg-teal-500': !selected,
            }"
        >
            <div class="absolute! top-px right-[2px] flex gap-1 text-teal-800!">
                <span
                    v-if="props.prompt.kind === PromptKind.Lora"
                    class="text-[9px] italic leading-[1.2]"
                >
                    LORA
                </span>
                <el-icon v-if="!isNil(props.promptImageFileName)" size="small">
                    <ImageOutline />
                </el-icon>
            </div>
            <div
                class="flex flex-col gap-0.5 cursor-pointer items-start flex-1 min-w-0"
                @click="emit('select', prompt.id)"
            >
                <el-text truncated class="text-white! font-bold self-auto!">
                    {{ prompt.text }}
                </el-text>
                <el-text truncated class="text-teal-100! font-light text-xs! self-auto!">
                    {{ prompt.translation === '' ? prompt.text : prompt.translation }}
                </el-text>
            </div>
            <div class="flex items-center gap-1">
                <el-tooltip content="添加到编辑栏" placement="top" :hide-after="0">
                    <el-icon
                        class="text-white! hover:text-gray-700! cursor-pointer"
                        @click="emit('addToWorkspace', cloneDeep(prompt) as Prompt)"
                    >
                        <AddCircleOutline />
                    </el-icon>
                </el-tooltip>
                <el-tooltip content="复制到剪贴板" placement="top" :hide-after="0">
                    <el-icon
                        class="text-white! hover:text-gray-700! cursor-pointer"
                        @click="copyText(prompt.text)"
                    >
                        <CopyOutline />
                    </el-icon>
                </el-tooltip>
                <el-popconfirm
                    v-if="prompt.tagIds.length > 0"
                    title="确定从标签中移除提示词？"
                    :hide-after="0"
                    @confirm="emit('remove', prompt.id)"
                >
                    <template #reference>
                        <el-icon class="text-white! hover:text-gray-700! cursor-pointer">
                            <RemoveCircleOutline />
                        </el-icon>
                    </template>
                </el-popconfirm>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getImageUrl } from '@renderer/utils/utils'
import { PromptKind, type Prompt } from '@shared/models/prompt'
import { DeepReadonly, useTemplateRef } from 'vue'
import { AddCircleOutline, CopyOutline, RemoveCircleOutline } from '@vicons/ionicons5'
import { cloneDeep, isNil } from 'lodash'
import { ImageOutline } from '@vicons/ionicons5'

const props = defineProps<{
    prompt: DeepReadonly<Prompt>
    selected: boolean
    promptImageFileName?: string
}>()

const emit = defineEmits<{
    addToWorkspace: [prompt: Prompt]
    remove: [promptId: string]
    select: [promptId: string]
}>()

const cardRef = useTemplateRef('card')
defineExpose({
    glow(): void {
        cardRef.value?.classList.add('glowing-bg')
        setTimeout(() => {
            cardRef.value?.classList.remove('glowing-bg')
        }, 2000)
    },
    promptText: props.prompt.text,
})

function copyText(text: string): void {
    window.api.other.copyToClipboard(text).then((res) => {
        if (res) {
            ElMessage.success('已复制到剪贴板')
        } else {
            ElMessage.error('复制失败，请重试')
        }
    })
}

const imageRef = useTemplateRef('image')
function openImage(): void {
    if (!isNil(props.promptImageFileName)) {
        imageRef.value?.showPreview()
    }
}
</script>

<style lang="css" scoped>
@reference 'tailwindcss';

.glowing-bg {
    @apply bg-blue-400;
}
</style>
