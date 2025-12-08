<script setup lang="ts">
import {
    GroupPromptTag,
    isEolPromptTag,
    isGroupPromptTag,
    isLoraPromptTag,
    isLoraString,
    isMonoPromptTag,
    isSpecialPromptTag,
    LoraPromptTag,
    MonoPromptTag,
    PromptTag,
    PromptTagKind,
    promptTagToString,
    stringToLoraPromptTag,
    stringToMonoPromptTag,
} from '@shared/models/prompt-tag'
import { clone, isNil } from 'lodash'
import { Nullish } from 'utility-types'
import { computed, ref, useTemplateRef } from 'vue'
import { useDataStore } from '@renderer/stores/data'
import { ElInput } from 'element-plus'
import { useHandleClickGesture } from '@renderer/hooks/useHandleClickGesture'
import log from 'electron-log/renderer'
import { PromptKind } from '@shared/models/prompt'
import { createError, existsError } from '@renderer/stores/error'
import Highlighter from 'vue-highlight-words'
import { VueDraggable } from 'vue-draggable-plus'
// TODO 添加对标签增减括号，增减权重的按钮
const enum Kind {
    Default = 'default',
    BorderStart = 'border-start',
    BorderEnd = 'border-end',
    Group = 'group',
}

interface Wrapper {
    promptTag: PromptTag
    kind: Kind
}

defineProps<{
    searchText: string
}>()

const emit = defineEmits<{
    selectPrompt: [promptId: string]
}>()

const dataStore = useDataStore()
const editor = defineModel<PromptTag[]>({ required: true })
const collapsed = ref<string[]>([])
const flatEditor = computed({
    get() {
        return editor.value.flatMap((item): Wrapper[] => {
            if (isGroupPromptTag(item)) {
                if (collapsed.value.includes(item.id)) {
                    return [
                        {
                            promptTag: item,
                            kind: Kind.Group,
                        },
                    ]
                }
                return [
                    {
                        promptTag: item,
                        kind: Kind.BorderStart,
                    },
                    ...item.subTags.map((child) => ({
                        promptTag: child,
                        kind: Kind.Default,
                    })),
                    {
                        promptTag: item,
                        kind: Kind.BorderEnd,
                    },
                ]
            }
            return [
                {
                    promptTag: item,
                    kind: Kind.Default,
                },
            ]
        })
    },
    set(newVal: Wrapper[]) {
        const newEditor = [] as PromptTag[]
        let group: GroupPromptTag | Nullish = undefined
        for (const item of newVal) {
            if (item.kind === Kind.BorderStart) {
                if (!isNil(group)) return
                if (!isGroupPromptTag(item.promptTag)) return
                group = {
                    ...item.promptTag,
                    subTags: [],
                }
            } else if (item.kind === Kind.BorderEnd) {
                if (isNil(group)) return
                newEditor.push(group)
                group = undefined
            } else {
                if (!isNil(group) && isGroupPromptTag(group)) {
                    if (item.kind === Kind.Group) return
                    if (!isMonoPromptTag(item.promptTag) && !isLoraPromptTag(item.promptTag)) return
                    group.subTags.push(item.promptTag)
                } else {
                    newEditor.push(item.promptTag)
                }
            }
        }
        editor.value = newEditor
    },
})

function findPromptId(item: PromptTag): string | Nullish {
    if (!validPromptTagToCollect(item)) {
        return undefined
    }
    return dataStore.prompt.readonly.find((p) => p.text === item.text)?.id
}
function selectPrompt(item: PromptTag): void {
    const promptId = findPromptId(item)
    if (!isNil(promptId)) {
        emit('selectPrompt', promptId)
    } else {
        ElMessage.warning('提示词不存在')
    }
}

const promptTagInput = useTemplateRef<InstanceType<typeof ElInput>>('promptTagInput')
function openEditDialog(): void {
    promptTagInput.value?.focus()
}
// 是否正在编辑提示词
const isEditingPromptTag = ref(false)
const editingPromptTagId = ref<string | Nullish>(undefined)
const editingPromptTagInput = ref('')
function editPromptTag(item: PromptTag): void {
    isEditingPromptTag.value = true
    editingPromptTagId.value = item.id
    editingPromptTagInput.value = promptTagToString(item)
}
const handleClickGesture = useHandleClickGesture()
function handleLeftClickPromptTag(item: Wrapper): void {
    handleClickGesture(
        () => {
            if (isEolPromptTag(item.promptTag)) {
                return
            }
            editPromptTag(item.promptTag)
        },
        () => {
            item.promptTag.disabled = !item.promptTag.disabled
        }
    )
}
function confirmEditPrompt(): void {
    isEditingPromptTag.value = false
    const index = editor.value.findIndex((tag) => tag.id === editingPromptTagId.value)
    if (index === -1) {
        return
    }
    let promptTag: PromptTag | Nullish
    if (isLoraString(editingPromptTagInput.value)) {
        promptTag = stringToLoraPromptTag(editingPromptTagInput.value)
    } else {
        promptTag = stringToMonoPromptTag(editingPromptTagInput.value)
    }
    if (isNil(promptTag)) {
        return
    }
    const editorClone = clone(editor.value)
    editorClone[index] = promptTag
    editor.value = editorClone
}
function removePromptTag(id: string): void {
    const editorClone = clone(editor.value)
    const index = editorClone.findIndex((tag) => tag.id === id)
    if (index !== -1) {
        editorClone.splice(index, 1)
        editor.value = editorClone
    }
}
function isPromptTagCollected(promptTag: PromptTag): boolean {
    if (!isLoraPromptTag(promptTag) && !isMonoPromptTag(promptTag)) {
        return false
    }
    return dataStore.prompt.readonly.some((p) => p.text === promptTag.text)
}
function validPromptTagToCollect(promptTag: PromptTag): promptTag is LoraPromptTag | MonoPromptTag {
    return isLoraPromptTag(promptTag) || isMonoPromptTag(promptTag)
}
function validPromptTagToCreate(promptTag: PromptTag): promptTag is LoraPromptTag | MonoPromptTag {
    return validPromptTagToCollect(promptTag) && !isPromptTagCollected(promptTag)
}
async function createPrompt(promptTag: PromptTag): Promise<void> {
    if (!validPromptTagToCreate(promptTag)) {
        ElMessage.warning('不能添加已收藏或该类型的提示词')
        return
    }
    if (dataStore.prompt.readonly.some((p) => p.text === promptTag.text)) {
        ElMessage.warning('提示词已存在')
        return
    }
    try {
        await dataStore.prompt.create({
            text: promptTag.text,
            kind: isLoraPromptTag(promptTag) ? PromptKind.Lora : PromptKind.Normal,
        })
    } catch (err) {
        if (err === existsError) {
            ElMessage.error('提示词已存在')
            return
        } else if (err === createError) {
            ElMessage.error('添加提示词失败')
            return
        } else {
            ElMessage.error('添加提示词失败')
            log.error(`添加提示词失败: ${err}`)
            return
        }
    }
}
function getTagColor(item: Wrapper): string {
    if (item.kind === Kind.BorderStart || item.kind === Kind.BorderEnd) {
        return '#DD4F4F'
    }
    if (item.kind === Kind.Group) {
        return 'red'
    }
    const promptTag = item.promptTag
    if (promptTag.disabled) {
        return 'gray'
    }
    if (isEolPromptTag(promptTag)) {
        return 'black'
    }
    if (isSpecialPromptTag(promptTag)) {
        return 'brown'
    }
    if (!isPromptTagCollected(item.promptTag)) {
        return '#2D89BF'
    }
    return '#6CC33C'
}
function copyText(text: string): void {
    window.api.other.copyToClipboard(text).then((res) => {
        if (res) {
            ElMessage.success('已复制到剪贴板')
        } else {
            ElMessage.error('复制失败')
        }
    })
}
function canCreateGroup(promptTag: PromptTag): promptTag is LoraPromptTag | MonoPromptTag {
    return isLoraPromptTag(promptTag) || isMonoPromptTag(promptTag)
}
function createGroup(promptTag: PromptTag): void {
    if (!canCreateGroup(promptTag)) {
        return
    }
    const index = editor.value.findIndex((tag) => tag.id === promptTag.id)
    if (index === -1) {
        return
    }
    const groupPromptTag: GroupPromptTag = {
        id: crypto.randomUUID(),
        kind: PromptTagKind.Group,
        text: 'new group',
        disabled: false,
        subTags: [promptTag],
    }
    const editorClone = clone(editor.value)
    editorClone.splice(index, 1, groupPromptTag)
    editor.value = editorClone
}
function disgroup(promptTag: PromptTag): void {
    if (!isGroupPromptTag(promptTag)) {
        return
    }
    const index = editor.value.findIndex((tag) => tag.id === promptTag.id)
    if (index === -1) {
        return
    }
    const subTags = promptTag.subTags
    if (subTags.length === 0) {
        return
    }
    const editorClone = clone(editor.value)
    editorClone.splice(index, 1, ...subTags)
    editor.value = editorClone
}
function switchCollapse(promptTag: PromptTag): void {
    if (!isGroupPromptTag(promptTag)) {
        return
    }
    if (collapsed.value.includes(promptTag.id)) {
        collapsed.value = collapsed.value.filter((id) => id !== promptTag.id)
    } else {
        collapsed.value.push(promptTag.id)
    }
}
</script>
<template>
    <vue-draggable
        v-model="flatEditor"
        :animation="50"
        class="flex flex-wrap p-2"
        easing="ease-in-out"
        handle=".drag-handle"
    >
        <div v-for="item in flatEditor" :key="item.promptTag.id + item.kind">
            <el-dropdown
                trigger="hover"
                size="small"
                placement="top"
                :hide-on-click="false"
                class="mx-0.5"
                :disabled="isEolPromptTag(item.promptTag) || isSpecialPromptTag(item.promptTag)"
            >
                <el-tag
                    :color="getTagColor(item)"
                    effect="dark"
                    size="small"
                    disable-transitions
                    class="cursor-pointer border! border-transparent hover:border-blue-500! transition-all duration-200"
                    :class="{
                        'line-through': item.promptTag.disabled,
                        'font-bold': true,
                        'drag-handle':
                            !(item.kind === Kind.BorderStart) && !(item.kind === Kind.BorderEnd),
                    }"
                    @click.left="handleLeftClickPromptTag(item)"
                    @click.right="copyText(promptTagToString(item.promptTag))"
                    @mousedown.middle.prevent.stop="removePromptTag(item.promptTag.id)"
                    @close="removePromptTag(item.promptTag.id)"
                >
                    <span v-if="isEolPromptTag(item.promptTag)">EOL</span>
                    <Highlighter
                        v-else
                        :search-words="[searchText]"
                        :auto-escape="true"
                        :text-to-highlight="
                            item.kind === Kind.Default
                                ? promptTagToString(item.promptTag)
                                : item.promptTag.text
                        "
                    />
                </el-tag>

                <template #dropdown>
                    <el-dropdown-menu
                        class="flex! flex-row! p-0!"
                        :item-classes="['px-2', 'py-1', 'whitespace-nowrap']"
                    >
                        <el-dropdown-item
                            v-if="canCreateGroup(item.promptTag)"
                            @click="createGroup(item.promptTag)"
                        >
                            建组
                        </el-dropdown-item>
                        <el-dropdown-item
                            v-if="
                                item.kind === Kind.Group ||
                                item.kind === Kind.BorderStart ||
                                item.kind === Kind.BorderEnd
                            "
                            @click="disgroup(item.promptTag)"
                        >
                            解组
                        </el-dropdown-item>
                        <el-dropdown-item
                            v-if="item.kind !== Kind.Default"
                            @click="switchCollapse(item.promptTag)"
                        >
                            {{ collapsed.includes(item.promptTag.id) ? '展开' : '收起' }}
                        </el-dropdown-item>
                        <el-dropdown-item
                            v-if="validPromptTagToCreate(item.promptTag)"
                            @click="createPrompt(item.promptTag)"
                        >
                            收藏
                        </el-dropdown-item>
                        <el-dropdown-item
                            v-if="isPromptTagCollected(item.promptTag)"
                            @click="selectPrompt(item.promptTag)"
                        >
                            详情
                        </el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>
        <!-- TODO 当输入逗号分割字符串时，创建 group 标签 -->
        <el-dialog
            v-model="isEditingPromptTag"
            title="编辑提示词文本"
            append-to-body
            @keyup.esc.stop.prevent="isEditingPromptTag = false"
            @opened="promptTagInput?.focus()"
            @open.once="openEditDialog"
        >
            <div class="flex flex-col gap-2">
                <el-input
                    ref="promptTagInput"
                    v-model="editingPromptTagInput"
                    placeholder="编辑提示词"
                    @keyup.enter="confirmEditPrompt"
                />
            </div>
            <template #footer>
                <el-button type="primary" @click="confirmEditPrompt"> 确定 </el-button>
                <el-button @click="isEditingPromptTag = false"> 取消 </el-button>
            </template>
        </el-dialog>
    </vue-draggable>
</template>
