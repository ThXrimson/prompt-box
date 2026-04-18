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
    stringToEditor,
    stringToLoraPromptTag,
    SubTagPromptTag,
} from '@shared/models/prompt-tag'
import { clone, cloneDeep, debounce, isNil } from 'lodash'
import { Nullish } from 'utility-types'
import { computed, nextTick, ref } from 'vue'
import { useDataStore } from '@renderer/stores/data'
import log from 'electron-log/renderer'
import { PromptKind } from '@shared/models/prompt'
import { createError, existsError } from '@renderer/stores/error'
import Highlighter from 'vue-highlight-words'
import { VueDraggable } from 'vue-draggable-plus'
import { ChevronUp, Refresh, ChevronDown } from '@vicons/ionicons5'
import { useManualRefHistory } from '@vueuse/core'
import { handleError } from '@renderer/utils/error-handler'
import { ElMessageBox } from 'element-plus'
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
function collapseAll(): void {
    const res = [] as string[]
    for (const item of editor.value) {
        if (isGroupPromptTag(item)) {
            res.push(item.id)
        }
    }
    collapsed.value = res
}
function uncollapseAll(): void {
    collapsed.value = []
}
const disableDropdown = ref(false)
const { commit, canUndo, undo, canRedo, redo } = useManualRefHistory(editor, {
    clone: cloneDeep,
    capacity: 10,
})
const debouncedCommit = debounce(commit, 500)
defineExpose({ debouncedCommit, canUndo, undo, canRedo, redo, collapseAll, uncollapseAll })
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

async function editPromptTag(item: PromptTag): Promise<void> {
    try {
        const inputValue = isGroupPromptTag(item)
            ? item.text
            : promptTagToString(item, true, true, true)
        const { value } = await ElMessageBox.prompt('请输入新内容', '编辑标签', {
            inputValue,
            confirmButtonText: '确认',
            cancelButtonText: '取消',
        })
        if (value) {
            replacePromptTagContent(item.id, value)
        }
    } catch {
        // user cancelled
    }
}
function replacePromptTagContent(tagId: string, input: string): void {
    const editorClone = clone(editor.value)
    outer: for (const [i, tag] of editorClone.entries()) {
        if (tag.id === tagId) {
            if (isGroupPromptTag(tag)) {
                const newTag = cloneDeep(tag)
                newTag.text = input
                editorClone[i] = newTag
            } else if (isLoraString(input)) {
                const t = stringToLoraPromptTag(input)
                if (!isNil(t)) {
                    editorClone[i] = t
                }
            } else {
                const tags = stringToEditor(input)
                editorClone.splice(i, 1, ...tags)
            }
            break
        }
        if (isGroupPromptTag(tag)) {
            for (const [j, subTag] of tag.subTags.entries()) {
                if (subTag.id === tagId) {
                    if (isLoraString(input)) {
                        const t = stringToLoraPromptTag(input)
                        if (!isNil(t)) {
                            const newTag = clone(tag)
                            const newSubTags = clone(tag.subTags)
                            newSubTags[j] = t
                            newTag.subTags = newSubTags
                            editorClone[i] = newTag
                        }
                    } else {
                        const tags = stringToEditor(input).filter(
                            (t) => isMonoPromptTag(t) || isLoraPromptTag(t)
                        )
                        const newTag = clone(tag)
                        const newSubTags = clone(tag.subTags)
                        newSubTags.splice(j, 1, ...tags)
                        newTag.subTags = newSubTags
                        editorClone[i] = newTag
                    }
                    break outer
                }
            }
        }
    }
    editor.value = editorClone
    nextTick(() => debouncedCommit())
}
function toggleDisable(item: Wrapper): void {
    const newTag = cloneDeep(item.promptTag)
    newTag.disabled = !newTag.disabled
    if (isGroupPromptTag(newTag)) {
        for (const sub of newTag.subTags) {
            sub.disabled = newTag.disabled
        }
    }
    findPromptTagAndReplace(newTag)
}
function removePromptTag(id: string): void {
    const editorClone = clone(editor.value)
    outer: for (const [i, tag] of editorClone.entries()) {
        if (tag.id === id) {
            editorClone.splice(i, 1)
            break
        }
        if (isGroupPromptTag(tag)) {
            for (const [j, subTag] of tag.subTags.entries()) {
                if (subTag.id === id) {
                    const newTag = clone(tag)
                    const newSubTags = clone(tag.subTags)
                    newSubTags.splice(j, 1)
                    newTag.subTags = newSubTags
                    editorClone[i] = newTag
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
    return dataStore.prompt.textSet.has(promptTag.text)
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
        return 'var(--color-gray-300)'
    }
    if (item.kind === Kind.BorderStart || item.kind === Kind.Group) {
        return 'var(--color-gray-100)'
    }
    if (item.kind === Kind.BorderEnd) {
        return 'var(--color-gray-800)'
    }
    if (isEolPromptTag(promptTag)) {
        return 'var(--color-gray-800)'
    }
    if (isSpecialPromptTag(promptTag)) {
        return 'var(--color-warning)'
    }
    if (!isPromptTagCollected(item.promptTag)) {
        return 'var(--color-primary-400)'
    }
    return 'var(--color-tag-unselected)'
}
function copyText(text: string): void {
    window.api.other.copyToClipboard(text).then((res) => {
        if (res) {
            ElMessage.success('已复制到剪贴板')
        } else {
            ElMessage.error('复制失败，请重试')
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
    const newTag = addWeight(promptTag, delta)
    findPromptTagAndReplace(newTag)
    nextTick(() => debouncedCommit())
}
function clearPromptTagWeight(promptTag: PromptTag): void {
    if (!canAddWeight(promptTag)) {
        return
    }
    const newTag = clearWeight(promptTag)
    findPromptTagAndReplace(newTag)
    nextTick(() => debouncedCommit())
}
function addPromptTagBrackets(promptTag: PromptTag, ...brackets: Bracket[]): void {
    if (!isMonoPromptTag(promptTag) || brackets.length === 0) {
        return
    }
    const newTag = addBrackets(promptTag, ...brackets)
    if (newTag === promptTag) {
        return
    }
    findPromptTagAndReplace(newTag)
    nextTick(() => debouncedCommit())
}
function clearPromptTagBrackets(promptTag: PromptTag): void {
    if (!isMonoPromptTag(promptTag)) {
        return
    }
    const newTag = clearBrackets(promptTag)
    findPromptTagAndReplace(newTag)
    nextTick(() => debouncedCommit())
}
const translatingTagId = ref<string | Nullish>(undefined)
async function translatePromptTag(promptTag: MonoPromptTag): Promise<void> {
    translatingTagId.value = promptTag.id
    try {
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
        const newTag = {
            ...promptTag,
            translation,
        }
        findPromptTagAndReplace(newTag)
    } catch (error) {
        handleError(error, '翻译失败')
    } finally {
        translatingTagId.value = undefined
    }
}

function findPromptTagAndReplace(newTag: PromptTag): void {
    const editorClone = clone(editor.value)
    outer: for (const [i, tag] of editorClone.entries()) {
        if (tag.id === newTag.id) {
            editorClone[i] = newTag
            break
        }
        if (isGroupPromptTag(tag)) {
            for (const [j, sub] of tag.subTags.entries()) {
                if (sub.id === newTag.id) {
                    const newSubs = clone(tag.subTags)
                    newSubs[j] = newTag as SubTagPromptTag
                    editorClone[i] = {
                        ...tag,
                        subTags: newSubs,
                    }
                    break outer
                }
            }
        }
    }
    editor.value = editorClone
}
function getPromptTagText(item: Wrapper): string {
    let text = ''
    if (item.kind === Kind.Group) {
        text += '⣿\t'
    }
    if (item.kind === Kind.Default) {
        text += promptTagToString(item.promptTag, true, true, true)
    } else {
        if (isEolPromptTag(item.promptTag)) {
            return '<WRONG>'
        }
        text += item.promptTag.text
    }
    return text
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
        @start="disableDropdown = true"
        @end="disableDropdown = false"
    >
        <TransitionGroup name="tag-list">
            <div
                v-for="item in flatEditor"
                :key="item.promptTag.id + item.kind"
                class="my-[-0.5px]"
            >
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
                    :show-timeout="200"
                    :hide-timeout="50"
                    :hide-on-click="false"
                    :disabled="
                        disableDropdown ||
                        isEolPromptTag(item.promptTag) ||
                        isSpecialPromptTag(item.promptTag)
                    "
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
                                !(item.kind === Kind.BorderStart) &&
                                !(item.kind === Kind.BorderEnd),
                        }"
                        @click.left="switchCollapse(item.promptTag)"
                        @dblclick.left="toggleDisable(item)"
                        @click.right="
                            copyText(
                                promptTagToString(item.promptTag, true, true, true, true, false)
                            )
                        "
                        @mousedown.middle.prevent.stop="removePromptTag(item.promptTag.id)"
                    >
                        <span v-if="isEolPromptTag(item.promptTag)">EOL</span>
                        <span
                            v-else-if="item.kind === Kind.BorderStart"
                            :class="{ 'text-(--color-gray-800)!': !item.promptTag.disabled }"
                        >
                            ▶ {{ item.promptTag.text }}
                        </span>
                        <span
                            v-else-if="item.kind === Kind.BorderEnd"
                            class="text-(--color-gray-100)! font-light"
                        >
                            ◀ {{ item.promptTag.text }}
                        </span>
                        <Highlighter
                            v-if="!isEolPromptTag(item.promptTag) && item.kind !== Kind.BorderStart && item.kind !== Kind.BorderEnd"
                            :search-words="[searchText]"
                            :auto-escape="true"
                            :text-to-highlight="getPromptTagText(item)"
                            class="flex-1 block font-[500]"
                            :class="{
                                'text-(--color-gray-800)!': item.kind === Kind.Group,
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
                                    v-if="!isEolPromptTag(item.promptTag) && !isSpecialPromptTag(item.promptTag)"
                                    @click="editPromptTag(item.promptTag)"
                                >
                                    编辑
                                </el-dropdown-item>
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
                                    @click="addPromptTagWeight(item.promptTag, 0.1)"
                                >
                                    <el-icon class="mr-0!" size="large"><ChevronUp /></el-icon>
                                    <span class="text-xs">加重</span>
                                </el-dropdown-item>
                                <el-dropdown-item
                                    v-if="canAddWeight(item.promptTag)"
                                    @click="clearPromptTagWeight(item.promptTag)"
                                >
                                    <el-icon class="mr-0!" size="large"><Refresh /></el-icon>
                                    <span class="text-xs">重置</span>
                                </el-dropdown-item>
                                <el-dropdown-item
                                    v-if="canAddWeight(item.promptTag)"
                                    @click="addPromptTagWeight(item.promptTag, -0.1)"
                                >
                                    <el-icon class="mr-0!" size="large"><ChevronDown /></el-icon>
                                    <span class="text-xs">减轻</span>
                                </el-dropdown-item>
                            </div>
                            <div class="dropdown-menu-group">
                                <el-dropdown-item
                                    v-if="isMonoPromptTag(item.promptTag)"
                                    @click="addPromptTagBrackets(item.promptTag, Bracket.Round)"
                                >
                                    <span class="text-lg text-bold">()</span>
                                    <span class="text-xs">圆括号</span>
                                </el-dropdown-item>
                                <el-dropdown-item
                                    v-if="isMonoPromptTag(item.promptTag)"
                                    @click="clearPromptTagBrackets(item.promptTag)"
                                >
                                    <el-icon class="mr-0!" size="large"><Refresh /></el-icon>
                                    <span class="text-xs">重置</span>
                                </el-dropdown-item>
                                <el-dropdown-item
                                    v-if="isMonoPromptTag(item.promptTag)"
                                    @click="addPromptTagBrackets(item.promptTag, Bracket.Square)"
                                >
                                    <span class="text-lg text-bold">[]</span>
                                    <span class="text-xs">方括号</span>
                                </el-dropdown-item>
                            </div>
                            <div v-if="isMonoPromptTag(item.promptTag)" class="dropdown-menu-group">
                                <el-dropdown-item
                                    v-if="!item.promptTag.translation"
                                    :disabled="translatingTagId === item.promptTag.id"
                                    @click="translatePromptTag(item.promptTag)"
                                >
                                    {{ translatingTagId === item.promptTag.id ? '翻译中...' : '翻译' }}
                                </el-dropdown-item>
                                <div v-else class="flex-1 text-center italic">
                                    {{ item.promptTag.translation }}
                                </div>
                            </div>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>
        </TransitionGroup>
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
        border: 1px solid var(--color-border-light);
    }
}
.ghost-class {
    & :deep(.el-tag) {
        box-shadow: var(--shadow-md);
    }
}
.tag-list-enter-active,
.tag-list-leave-active {
    transition: all 150ms ease-in-out;
}
.tag-list-enter-from {
    opacity: 0;
    max-width: 0;
    margin: 0;
}
.tag-list-leave-to {
    opacity: 0;
    max-width: 0;
    margin: 0 0 0 -4px;
}
</style>
