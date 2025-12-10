<script setup lang="ts">
import {
    addBrackets,
    addWeight,
    Bracket,
    clearBrackets,
    clearWeight,
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
    SubTagPromptTag,
} from '@shared/models/prompt-tag'
import { clone, cloneDeep, debounce, isNil } from 'lodash'
import { Nullish } from 'utility-types'
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useDataStore } from '@renderer/stores/data'
import { ElInput } from 'element-plus'
import { useHandleClickGesture } from '@renderer/hooks/useHandleClickGesture'
import log from 'electron-log/renderer'
import { PromptKind } from '@shared/models/prompt'
import { createError, existsError } from '@renderer/stores/error'
import Highlighter from 'vue-highlight-words'
import { VueDraggable } from 'vue-draggable-plus'
import { ChevronUp, Refresh, ChevronDown } from '@vicons/ionicons5'
import { useManualRefHistory } from '@vueuse/core'
// TODO 长按
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
const { commit, canUndo, undo, canRedo, redo } = useManualRefHistory(editor, {
    clone: cloneDeep,
    capacity: 10,
})
const debouncedCommit = debounce(commit, 500)
defineExpose({ canUndo, undo, canRedo, redo })
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
function onOpenEditDialog(): void {
    promptTagInput.value?.focus()
}
// 是否正在编辑提示词
const isEditingPromptTag = ref(false)
const editingPromptTagId = ref<string | Nullish>(undefined)
const editingPromptTagInput = ref('')
function editPromptTag(item: PromptTag): void {
    isEditingPromptTag.value = true
    editingPromptTagId.value = item.id
    if (isGroupPromptTag(item)) {
        editingPromptTagInput.value = item.text
    } else {
        editingPromptTagInput.value = promptTagToString(item, true, true, true)
    }
}
const handleClickGesture = useHandleClickGesture(200)
function handleLeftClickPromptTag(item: Wrapper): void {
    handleClickGesture(
        () => {
            if (isEolPromptTag(item.promptTag)) {
                return
            }
            if (isGroupPromptTag(item.promptTag)) {
                switchCollapse(item.promptTag)
                return
            }
            editPromptTag(item.promptTag)
        },
        () => {
            item.promptTag.disabled = !item.promptTag.disabled
            if (isGroupPromptTag(item.promptTag)) {
                for (const subTag of item.promptTag.subTags) {
                    subTag.disabled = item.promptTag.disabled
                }
            }
        }
    )
}
function confirmEditPrompt(): void {
    isEditingPromptTag.value = false
    if (isNil(editingPromptTagId.value)) {
        return
    }
    const editorClone = clone(editor.value)
    outer: for (const [i, tag] of editorClone.entries()) {
        if (tag.id === editingPromptTagId.value) {
            if (isGroupPromptTag(tag)) {
                tag.text = editingPromptTagInput.value
                break
            }
            if (isLoraString(editingPromptTagInput.value)) {
                const t = stringToLoraPromptTag(editingPromptTagInput.value)
                if (!isNil(t)) {
                    editorClone[i] = t
                    break
                }
            } else {
                const t = stringToMonoPromptTag(editingPromptTagInput.value)
                if (!isNil(t)) {
                    editorClone[i] = t
                    break
                }
            }
            break
        }
        if (isGroupPromptTag(tag)) {
            for (const [j, subTag] of tag.subTags.entries()) {
                if (subTag.id === editingPromptTagId.value) {
                    if (isLoraString(editingPromptTagInput.value)) {
                        const t = stringToLoraPromptTag(editingPromptTagInput.value)
                        if (!isNil(t)) {
                            tag.subTags[j] = t
                            break outer
                        }
                    } else {
                        const t = stringToMonoPromptTag(editingPromptTagInput.value)
                        if (!isNil(t)) {
                            tag.subTags[j] = t
                            break outer
                        }
                    }
                    break outer
                }
            }
        }
    }
    editor.value = editorClone
    nextTick(() => debouncedCommit())
}
function removePromptTag(id: string): void {
    const editorClone = clone(editor.value)
    outer: for (const [index, tag] of editorClone.entries()) {
        if (tag.id === id) {
            editorClone.splice(index, 1)
            break outer
        }
        if (isGroupPromptTag(tag)) {
            for (const [index, subTag] of tag.subTags.entries()) {
                if (subTag.id === id) {
                    tag.subTags.splice(index, 1)
                    break outer
                }
            }
        }
    }
    editor.value = editorClone
    nextTick(() => debouncedCommit())
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
    const promptTag = item.promptTag
    if (promptTag.disabled) {
        return 'gray'
    }
    if (
        item.kind === Kind.BorderStart ||
        item.kind === Kind.BorderEnd ||
        item.kind === Kind.Group
    ) {
        return 'white'
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
    for (const pt of editor.value) {
        if (isGroupPromptTag(pt) && pt.subTags.map((t) => t.id).includes(promptTag.id)) {
            return false
        }
    }
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
    nextTick(() => debouncedCommit())
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
    nextTick(() => debouncedCommit())
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
function canAddWeight(promptTag: PromptTag): boolean {
    return !isEolPromptTag(promptTag) && !isSpecialPromptTag(promptTag)
}
function addPromptTagWeight(promptTag: PromptTag, delta: number = 0.1): void {
    if (!canAddWeight(promptTag)) {
        return
    }
    const editorClone = clone(editor.value)
    outer: for (const [index, tag] of editorClone.entries()) {
        if (tag.id === promptTag.id) {
            editorClone[index] = addWeight(tag, delta)
            break
        }
        if (isGroupPromptTag(tag)) {
            for (const [i, subTag] of tag.subTags.entries()) {
                if (subTag.id === promptTag.id) {
                    tag.subTags[i] = addWeight(subTag, delta) as SubTagPromptTag
                    break outer
                }
            }
        }
    }
    editor.value = editorClone
    nextTick(() => debouncedCommit())
}
function clearPromptTagWeight(promptTag: PromptTag): void {
    if (!canAddWeight(promptTag)) {
        return
    }
    const editorClone = clone(editor.value)
    outer: for (const [index, tag] of editorClone.entries()) {
        if (tag.id === promptTag.id) {
            editorClone[index] = clearWeight(tag)
            break
        }
        if (isGroupPromptTag(tag)) {
            for (const [i, subTag] of tag.subTags.entries()) {
                if (subTag.id === promptTag.id) {
                    tag.subTags[i] = clearWeight(subTag) as SubTagPromptTag
                    break outer
                }
            }
        }
    }
    editor.value = editorClone
    nextTick(() => debouncedCommit())
}
function addPromptTagBrackets(promptTag: PromptTag, ...brackets: Bracket[]): void {
    if (!isMonoPromptTag(promptTag) || brackets.length === 0) {
        return
    }
    const editorClone = clone(editor.value)
    outer: for (const [index, tag] of editorClone.entries()) {
        if (tag.id === promptTag.id) {
            editorClone[index] = addBrackets(tag, ...brackets)
            break
        }
        if (isGroupPromptTag(tag)) {
            for (const [i, subTag] of tag.subTags.entries()) {
                if (subTag.id === promptTag.id) {
                    tag.subTags[i] = addBrackets(subTag, ...brackets) as SubTagPromptTag
                    break outer
                }
            }
        }
    }
    editor.value = editorClone
    nextTick(() => debouncedCommit())
}
function clearPromptTagBrackets(promptTag: PromptTag): void {
    if (!isMonoPromptTag(promptTag)) {
        return
    }
    const editorClone = clone(editor.value)
    outer: for (const [index, tag] of editorClone.entries()) {
        if (tag.id === promptTag.id) {
            editorClone[index] = clearBrackets(tag)
            break
        }
        if (isGroupPromptTag(tag)) {
            for (const [i, subTag] of tag.subTags.entries()) {
                if (subTag.id === promptTag.id) {
                    tag.subTags[i] = clearBrackets(subTag) as SubTagPromptTag
                    break outer
                }
            }
        }
    }
    editor.value = editorClone
    nextTick(() => debouncedCommit())
}
async function translatePromptTag(promptTag: MonoPromptTag): Promise<void> {
    let translation = ''
    if (isLoraPromptTag(promptTag) || isMonoPromptTag(promptTag)) {
        const prompt = dataStore.prompt.readonly.find((p) => p.text === promptTag.text)
        if (!isNil(prompt)) {
            translation = prompt.translation
        }
    }
    if (translation.length <= 0) {
        translation = await window.api.other.translateByDeepLX(promptTag.text)
    }
    const editorClone = clone(editor.value)
    outer: for (const [index, tag] of editorClone.entries()) {
        if (tag.id === promptTag.id && isMonoPromptTag(tag)) {
            editorClone[index] = {
                ...tag,
                translation,
            }
            break
        }
        if (isGroupPromptTag(tag)) {
            for (const [i, subTag] of tag.subTags.entries()) {
                if (subTag.id === promptTag.id && isMonoPromptTag(subTag)) {
                    tag.subTags[i] = {
                        ...subTag,
                        translation,
                    }
                    break outer
                }
            }
        }
    }
    editor.value = editorClone
}
</script>
<template>
    <vue-draggable
        v-model="flatEditor"
        :animation="50"
        class="flex flex-wrap p-2 gap-x-1"
        easing="ease-in-out"
        handle=".drag-handle"
        drag-class="opacity-0"
        ghost-class="ghost-class"
        @update="nextTick(() => debouncedCommit())"
    >
        <div v-for="item in flatEditor" :key="item.promptTag.id + item.kind" class="my-[-0.5px]">
            <el-dropdown
                trigger="hover"
                size="small"
                placement="top"
                :show-arrow="false"
                :popper-options="{
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 0],
                            },
                        },
                    ],
                }"
                :show-timeout="50"
                :hide-timeout="50"
                :hide-on-click="false"
                :disabled="isEolPromptTag(item.promptTag) || isSpecialPromptTag(item.promptTag)"
            >
                <el-tag
                    :color="getTagColor(item)"
                    effect="dark"
                    size="small"
                    disable-transitions
                    class="cursor-pointer"
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
                    <span v-else-if="item.kind === Kind.BorderStart" class="text-teal-800!">
                        ▶
                    </span>
                    <span v-else-if="item.kind === Kind.BorderEnd" class="text-teal-800!">
                        ◀
                    </span>
                    <Highlighter
                        v-else
                        :search-words="[searchText]"
                        :auto-escape="true"
                        :text-to-highlight="
                            (item.kind === Kind.Group ? '◀\t' : '') +
                            (item.kind === Kind.Default
                                ? promptTagToString(item.promptTag)
                                : item.promptTag.text) +
                            (item.kind === Kind.Group ? '\t▶' : '')
                        "
                        class="flex-1 block font-[500]"
                        :class="{
                            'text-teal-800!': item.kind === Kind.Group,
                        }"
                    />
                </el-tag>

                <template #dropdown>
                    <el-dropdown-menu
                        class="flex flex-col p-0! overflow-hidden"
                        :item-classes="['px-2', 'py-1', 'whitespace-nowrap']"
                    >
                        <div class="dropdown-menu-group">
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
                                v-if="
                                    item.kind === Kind.Group ||
                                    item.kind === Kind.BorderStart ||
                                    item.kind === Kind.BorderEnd
                                "
                                @click="editPromptTag(item.promptTag)"
                            >
                                命名
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
                        </div>
                        <div class="dropdown-menu-group">
                            <el-dropdown-item
                                v-if="canAddWeight(item.promptTag)"
                                @click="addPromptTagWeight(item.promptTag, 0.05)"
                            >
                                <el-icon class="mr-0!" size="large"><ChevronUp /></el-icon>
                            </el-dropdown-item>
                            <el-dropdown-item
                                v-if="canAddWeight(item.promptTag)"
                                @click="clearPromptTagWeight(item.promptTag)"
                            >
                                <el-icon class="mr-0!" size="large"><Refresh /></el-icon>
                            </el-dropdown-item>
                            <el-dropdown-item
                                v-if="canAddWeight(item.promptTag)"
                                @click="addPromptTagWeight(item.promptTag, -0.05)"
                            >
                                <el-icon class="mr-0!" size="large"><ChevronDown /></el-icon>
                            </el-dropdown-item>
                        </div>
                        <div class="dropdown-menu-group">
                            <el-dropdown-item
                                v-if="isMonoPromptTag(item.promptTag)"
                                @click="addPromptTagBrackets(item.promptTag, Bracket.Round)"
                            >
                                <span class="text-lg text-bold">()</span>
                            </el-dropdown-item>
                            <el-dropdown-item
                                v-if="isMonoPromptTag(item.promptTag)"
                                @click="clearPromptTagBrackets(item.promptTag)"
                            >
                                <el-icon class="mr-0!" size="large"><Refresh /></el-icon>
                            </el-dropdown-item>
                            <el-dropdown-item
                                v-if="isMonoPromptTag(item.promptTag)"
                                @click="addPromptTagBrackets(item.promptTag, Bracket.Square)"
                            >
                                <span class="text-lg text-bold">[]</span>
                            </el-dropdown-item>
                        </div>
                        <div v-if="isMonoPromptTag(item.promptTag)" class="dropdown-menu-group">
                            <el-dropdown-item
                                v-if="!item.promptTag.translation"
                                @click="translatePromptTag(item.promptTag)"
                            >
                                翻译
                            </el-dropdown-item>
                            <div v-else class="flex-1 text-center italic">
                                {{ item.promptTag.translation }}
                            </div>
                        </div>
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
            @opened="onOpenEditDialog"
        >
            <div class="flex flex-col gap-2">
                <el-input
                    ref="promptTagInput"
                    v-model="editingPromptTagInput"
                    placeholder="编辑提示词"
                    autocorrect="off"
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
<style scoped>
.dropdown-menu-group {
    display: flex;
    width: 100%;
    padding: 0;
    & > :deep(.el-dropdown-menu__item) {
        flex: 1;
        justify-content: center;
        height: 1.5rem;
        border: 1px solid #eee;
    }
}
.ghost-class {
    & :deep(.el-tag) {
        box-shadow: 0px 0px 8px 0px #666;
    }
}
</style>
