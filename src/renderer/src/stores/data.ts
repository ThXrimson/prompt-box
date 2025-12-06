import { Example, NewExample, UpdateExample } from '@shared/models/example'
import { NewPrompt, Prompt, UpdatePrompt } from '@shared/models/prompt'
import { Tag, UpdateTag } from '@shared/models/tag'
import { Image } from '@shared/models/image'
import { NewWorkspace, UpdateWorkspace, Workspace } from '@shared/models/workspace'
import { defineStore } from 'pinia'
import { computed, readonly, ref } from 'vue'
import { createError, existsError, invalidParamError, notFoundError } from './error'
import { cloneDeep, isNil } from 'lodash'
import log from 'electron-log/renderer'

export const useDataStore = defineStore('data', () => {
    const prompts = ref<Prompt[]>([])
    const examples = ref<Example[]>([])
    const tags = ref<Tag[]>([])
    const workspaces = ref<Workspace[]>([])
    const images = ref<Image[]>([])

    const promptTextSet = new Set(prompts.value.map((prompt) => prompt.text))

    // TODO 提供一个接口处理数据和文件的一致性
    window.api.prompt.onNotify((_event, newPrompts) => {
        prompts.value = newPrompts
        promptTextSet.clear()
        prompts.value.forEach((prompt) => promptTextSet.add(prompt.text))
    })
    window.api.example.onNotify((_event, newExamples) => {
        examples.value = newExamples
    })
    window.api.tag.onNotify((_event, newTags) => {
        tags.value = newTags
    })
    window.api.workspace.onNotify((_event, newWorkspaces) => {
        workspaces.value = newWorkspaces
    })
    window.api.image.onNotify((_event, newImages) => {
        images.value = newImages
    })
    log.info(`send data store ready at: ${Date.now()}`)
    window.api.other.sendDataStoreReady()

    // TODO 测试关闭 定时持久化数据
    // setInterval(
    //     () => {
    //         window.api.prompt.update(prompts.value)
    //         window.api.example.update(examples.value)
    //         window.api.tag.update(tags.value)
    //         window.api.workspace.update(workspaces.value)
    //         window.api.image.update(images.value)
    //     },
    //     2 * 60 * 1000
    // )

    const promptView = {
        ref: prompts,
        readonly: readonly(prompts),
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
            return true
        },
    }
    const exampleView = {
        ref: examples,
        readonly: readonly(examples),
        idToImages: readonly(
            computed(() => {
                const map = new Map<string, Image[]>()
                for (const example of examples.value) {
                    const imgs = [] as Image[]
                    for (const imageId of example.imageIds) {
                        const image = images.value.find((i) => i.id === imageId)
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
            return newExample
        },
        async update(example: UpdateExample): Promise<Example> {
            const index = examples.value.findIndex((e) => e.id === example.id)
            if (index === -1) {
                throw notFoundError
            }
            examples.value[index] = { ...examples.value[index], ...example }
            window.api.example.update([cloneDeep(examples.value[index])])
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
            return true
        },
    }
    const tagView = {
        ref: tags,
        readonly: readonly(tags),
        async create(tag: string): Promise<Tag> {
            if (tags.value.some((t) => t.text === tag)) {
                throw existsError
            }
            const [newTag] = await window.api.tag.create([tag])
            if (isNil(newTag)) {
                throw createError
            }
            tags.value.push(newTag)
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
            return true
        },
    }
    const workspaceView = {
        ref: workspaces,
        readonly: readonly(workspaces),
        async create(workspace: NewWorkspace): Promise<Workspace> {
            const [newWorkspace] = await window.api.workspace.create([workspace])
            if (isNil(newWorkspace)) {
                throw createError
            }
            workspaces.value.push(newWorkspace)
            return newWorkspace
        },
        async update(workspace: UpdateWorkspace): Promise<Workspace> {
            const index = workspaces.value.findIndex((w) => w.id === workspace.id)
            if (index === -1) {
                throw notFoundError
            }
            workspaces.value[index] = { ...workspaces.value[index], ...workspace }
            window.api.workspace.update([cloneDeep(workspaces.value[index])])
            return workspaces.value[index]
        },
        async delete(id: string): Promise<boolean> {
            const index = workspaces.value.findIndex((w) => w.id === id)
            if (index === -1) {
                throw notFoundError
            }
            workspaces.value.splice(index, 1)
            window.api.workspace.delete([id])
            return true
        },
    }
    const imageView = {
        ref: images,
        readonly: readonly(images),
        async create(path: string): Promise<Image> {
            const [newImage] = await window.api.image.create([path])
            if (isNil(newImage)) {
                throw createError
            }
            images.value.push(newImage)
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
            return true
        },
    }

    return {
        prompt: promptView,
        example: exampleView,
        tag: tagView,
        workspace: workspaceView,
        image: imageView,
    }
})
