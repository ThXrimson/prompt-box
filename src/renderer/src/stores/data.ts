import { Example, NewExample, UpdateExample } from '@shared/models/example'
import { NewPrompt, Prompt, UpdatePrompt } from '@shared/models/prompt'
import { Tag, UpdateTag } from '@shared/models/tag'
import { Image } from '@shared/models/image'
import { NewWorkspace, UpdateWorkspace, Workspace } from '@shared/models/workspace'
import { AUTO_SAVE_INTERVAL } from '@shared/constants/app'
import { defineStore } from 'pinia'
import { computed, onMounted, reactive, readonly, ref } from 'vue'
import { createError, existsError, invalidParamError, notFoundError } from './error'
import { cloneDeep, isNil } from 'lodash'
import log from 'electron-log/renderer'

export const useDataStore = defineStore('data', () => {
    const prompts = ref<Prompt[]>([])
    const examples = ref<Example[]>([])
    const tags = ref<Tag[]>([])
    const workspaces = ref<Workspace[]>([])
    const images = ref<Image[]>([])

    const promptMap = computed(() => new Map<string, Prompt>(prompts.value.map((p) => [p.id, p])))
    const tagMap = computed(() => new Map<string, Tag>(tags.value.map((t) => [t.id, t])))
    const exampleMap = computed(() => new Map<string, Example>(examples.value.map((e) => [e.id, e])))
    const workspaceMap = computed(() => new Map<string, Workspace>(workspaces.value.map((w) => [w.id, w])))
    const imageMap = computed(() => new Map<string, Image>(images.value.map((i) => [i.id, i])))

    const promptTextSet = new Set(prompts.value.map((prompt) => prompt.text))

    const dirtyFlags = reactive({
        prompts: false,
        examples: false,
        tags: false,
        workspaces: false,
        images: false,
    })

    const isDataLoaded = ref(false)
    const lastSaveTime = ref(0)
    const loadedFlags = reactive({
        prompts: false,
        examples: false,
        tags: false,
        workspaces: false,
        images: false,
    })

    function checkAllLoaded(): void {
        if (Object.values(loadedFlags).every((v) => v) && !isDataLoaded.value) {
            isDataLoaded.value = true
        }
    }

    window.api.prompt.onNotify((_event, newPrompts) => {
        prompts.value = newPrompts
        promptTextSet.clear()
        prompts.value.forEach((prompt) => promptTextSet.add(prompt.text))
        loadedFlags.prompts = true
        checkAllLoaded()
    })
    window.api.example.onNotify((_event, newExamples) => {
        examples.value = newExamples
        loadedFlags.examples = true
        checkAllLoaded()
    })
    window.api.tag.onNotify((_event, newTags) => {
        tags.value = newTags
        loadedFlags.tags = true
        checkAllLoaded()
    })
    window.api.workspace.onNotify((_event, newWorkspaces) => {
        workspaces.value = newWorkspaces
        loadedFlags.workspaces = true
        checkAllLoaded()
    })
    window.api.image.onNotify((_event, newImages) => {
        images.value = newImages
        loadedFlags.images = true
        checkAllLoaded()
    })
    onMounted(() => {
        log.info(`send data store ready at: ${Date.now()}`)
        window.api.other.sendDataStoreReady()
    })

    setInterval(() => {
        const hadDirty = Object.values(dirtyFlags).some((v) => v)
        if (dirtyFlags.prompts) {
            window.api.prompt.update(cloneDeep(prompts.value))
            dirtyFlags.prompts = false
        }
        if (dirtyFlags.examples) {
            window.api.example.update(cloneDeep(examples.value))
            dirtyFlags.examples = false
        }
        if (dirtyFlags.tags) {
            window.api.tag.update(cloneDeep(tags.value))
            dirtyFlags.tags = false
        }
        if (dirtyFlags.workspaces) {
            window.api.workspace.update(cloneDeep(workspaces.value))
            dirtyFlags.workspaces = false
        }
        if (dirtyFlags.images) {
            window.api.image.update(cloneDeep(images.value))
            dirtyFlags.images = false
        }
        if (hadDirty) {
            lastSaveTime.value = Date.now()
        }
    }, AUTO_SAVE_INTERVAL)

    const promptView = {
        ref: prompts,
        readonly: readonly(prompts),
        map: promptMap,
        textSet: readonly(promptTextSet),
        async create(prompt: NewPrompt): Promise<Prompt> {
            if (promptTextSet.has(prompt.text)) {
                throw existsError
            }
            const [newPrompt] = await window.api.prompt.create([prompt])
            if (isNil(newPrompt)) {
                throw createError
            }
            prompts.value.push(newPrompt)
            promptTextSet.add(newPrompt.text)
            dirtyFlags.prompts = true
            return newPrompt
        },
        async update(prompt: UpdatePrompt): Promise<Prompt> {
            const index = prompts.value.findIndex((p) => p.id === prompt.id)
            if (index === -1) {
                throw notFoundError
            }
            if (!isNil(prompt.text) && prompts.value[index].text !== prompt.text) {
                if (promptTextSet.has(prompt.text)) {
                    throw existsError
                } else {
                    promptTextSet.delete(prompts.value[index].text)
                    promptTextSet.add(prompt.text)
                }
            }
            prompts.value[index] = { ...prompts.value[index], ...prompt }
            window.api.prompt.update([cloneDeep(prompts.value[index])])
            dirtyFlags.prompts = true
            return prompts.value[index]
        },
        async updateMany(updatePrompts: UpdatePrompt[]): Promise<Prompt[]> {
            const toUpdate = updatePrompts.filter((up) => prompts.value.some((p) => p.id === up.id))
            if (toUpdate.length === 0) {
                throw notFoundError
            }
            for (const [index, p] of prompts.value.entries()) {
                const up = toUpdate.find((u) => u.id === p.id)
                if (!isNil(up)) {
                    prompts.value[index] = { ...prompts.value[index], ...up }
                }
            }
            dirtyFlags.prompts = true
            return window.api.prompt.update(cloneDeep(toUpdate))
        },
        async delete(id: string): Promise<boolean> {
            const target = prompts.value.find((p) => p.id === id)
            if (isNil(target)) {
                throw notFoundError
            }
            prompts.value = prompts.value.filter((p) => p.id !== id)
            promptTextSet.delete(target.text)
            window.api.prompt.delete([id])
            dirtyFlags.prompts = true
            return true
        },
    }
    const exampleView = {
        ref: examples,
        readonly: readonly(examples),
        map: exampleMap,
        idToImages: readonly(
            computed(() => {
                const map = new Map<string, Image[]>()
                for (const example of examples.value) {
                    const imgs = [] as Image[]
                    for (const imageId of example.imageIds) {
                        const image = imageMap.value.get(imageId)
                        if (!isNil(image)) {
                            imgs.push(image)
                        }
                    }
                    map.set(example.id, imgs)
                }
                return map
            })
        ),
        async create(example: NewExample): Promise<Example> {
            const [newExample] = await window.api.example.create([example])
            if (isNil(newExample)) {
                throw createError
            }
            examples.value.push(newExample)
            dirtyFlags.examples = true
            return newExample
        },
        async update(example: UpdateExample): Promise<Example> {
            const index = examples.value.findIndex((e) => e.id === example.id)
            if (index === -1) {
                throw notFoundError
            }
            examples.value[index] = { ...examples.value[index], ...example }
            window.api.example.update([cloneDeep(examples.value[index])])
            dirtyFlags.examples = true
            return examples.value[index]
        },
        async delete(id: string): Promise<boolean> {
            const index = examples.value.findIndex((e) => e.id === id)
            if (index === -1) {
                throw notFoundError
            }
            for (const prompt of prompts.value) {
                if (prompt.exampleIds.includes(id)) {
                    prompt.exampleIds = prompt.exampleIds.filter((e) => e !== id)
                }
            }
            for (const imageId of examples.value[index].imageIds) {
                images.value = images.value.filter((i) => i.id !== imageId)
            }
            examples.value.splice(index, 1)
            window.api.example.delete([id])
            dirtyFlags.examples = true
            dirtyFlags.images = true
            dirtyFlags.prompts = true
            return true
        },
        async deleteMany(ids: string[]): Promise<boolean> {
            const toDelete = examples.value.filter((e) => ids.includes(e.id))
            if (toDelete.length === 0) {
                throw notFoundError
            }
            for (const prompt of prompts.value) {
                prompt.exampleIds = prompt.exampleIds.filter(
                    (e) => !toDelete.some((d) => d.id === e)
                )
            }
            for (const imageId of toDelete.flatMap((e) => e.imageIds)) {
                images.value = images.value.filter((i) => i.id !== imageId)
            }
            window.api.example.delete(toDelete.map((e) => e.id))
            dirtyFlags.examples = true
            dirtyFlags.images = true
            dirtyFlags.prompts = true
            return true
        },
    }
    const tagView = {
        ref: tags,
        readonly: readonly(tags),
        map: tagMap,
        async create(tag: string): Promise<Tag> {
            if (tags.value.some((t) => t.text === tag)) {
                throw existsError
            }
            const [newTag] = await window.api.tag.create([tag])
            if (isNil(newTag)) {
                throw createError
            }
            tags.value.push(newTag)
            dirtyFlags.tags = true
            return newTag
        },
        async update(tag: UpdateTag): Promise<Tag> {
            if (isNil(tag.text)) {
                throw invalidParamError
            }
            const index = tags.value.findIndex((t) => t.id === tag.id)
            if (index === -1) {
                throw notFoundError
            }
            tags.value[index] = { ...tags.value[index], ...tag }
            window.api.tag.update([cloneDeep(tags.value[index])])
            dirtyFlags.tags = true
            return tags.value[index]
        },
        async delete(id: string): Promise<boolean> {
            const index = tags.value.findIndex((t) => t.id === id)
            if (index === -1) {
                throw notFoundError
            }
            for (const prompt of prompts.value) {
                if (prompt.tagIds.includes(id)) {
                    prompt.tagIds = prompt.tagIds.filter((t) => t !== id)
                }
            }
            for (const workspace of workspaces.value) {
                if (workspace.tagIds.includes(id)) {
                    workspace.tagIds = workspace.tagIds.filter((t) => t !== id)
                }
            }
            tags.value.splice(index, 1)
            window.api.tag.delete([id])
            dirtyFlags.tags = true
            dirtyFlags.prompts = true
            dirtyFlags.workspaces = true
            return true
        },
    }
    const workspaceView = {
        ref: workspaces,
        readonly: readonly(workspaces),
        map: workspaceMap,
        async create(workspace: NewWorkspace): Promise<Workspace> {
            const [newWorkspace] = await window.api.workspace.create([workspace])
            if (isNil(newWorkspace)) {
                throw createError
            }
            workspaces.value.push(newWorkspace)
            dirtyFlags.workspaces = true
            return newWorkspace
        },
        async update(workspace: UpdateWorkspace): Promise<Workspace> {
            const index = workspaces.value.findIndex((w) => w.id === workspace.id)
            if (index === -1) {
                throw notFoundError
            }
            workspaces.value[index] = { ...workspaces.value[index], ...workspace }
            window.api.workspace.update([cloneDeep(workspaces.value[index])])
            dirtyFlags.workspaces = true
            return workspaces.value[index]
        },
        async delete(id: string): Promise<boolean> {
            const index = workspaces.value.findIndex((w) => w.id === id)
            if (index === -1) {
                throw notFoundError
            }
            workspaces.value.splice(index, 1)
            window.api.workspace.delete([id])
            dirtyFlags.workspaces = true
            return true
        },
    }
    const imageView = {
        ref: images,
        readonly: readonly(images),
        map: imageMap,
        async create(path: string): Promise<Image> {
            const [newImage] = await window.api.image.create([path])
            if (isNil(newImage)) {
                throw createError
            }
            images.value.push(newImage)
            dirtyFlags.images = true
            return newImage
        },
        async delete(id: string): Promise<boolean> {
            const target = images.value.find((i) => i.id === id)
            if (isNil(target)) {
                throw notFoundError
            }
            images.value = images.value.filter((i) => i.id !== id)
            for (const example of examples.value) {
                example.imageIds = example.imageIds.filter((i) => i !== id)
            }
            window.api.image.delete([id])
            dirtyFlags.images = true
            dirtyFlags.examples = true
            return true
        },
    }

    return {
        prompt: promptView,
        example: exampleView,
        tag: tagView,
        workspace: workspaceView,
        image: imageView,
        isDataLoaded: readonly(isDataLoaded),
        lastSaveTime: readonly(lastSaveTime),
    }
})
