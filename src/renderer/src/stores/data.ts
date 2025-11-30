import { Example, NewExample, UpdateExample } from '@shared/models/example'
import { NewPrompt, Prompt, UpdatePrompt } from '@shared/models/prompt'
import { Tag } from '@shared/models/tag'
import { Image } from '@shared/models/image'
import { NewWorkspace, UpdateWorkspace, Workspace } from '@shared/models/workspace'
import { defineStore } from 'pinia'
import { readonly, ref } from 'vue'
import { createError, existsError, notFoundError } from './error'
import { isNil } from 'lodash'

export const useDataStore = defineStore('data', () => {
    const prompts = ref<Prompt[]>([])
    const examples = ref<Example[]>([])
    const tags = ref<Tag[]>([])
    const workspaces = ref<Workspace[]>([])
    const images = ref<Image[]>([])

    const promptTextSet = new Set(prompts.value.map((prompt) => prompt.text))

    {
        window.api.prompt.notify((_event, newPrompts) => {
            prompts.value = newPrompts
            promptTextSet.clear()
            prompts.value.forEach((prompt) => promptTextSet.add(prompt.text))
        })
        window.api.example.notify((_event, newExamples) => {
            examples.value = newExamples
        })
        window.api.tag.notify((_event, newTags) => {
            tags.value = newTags
        })
        window.api.workspace.notify((_event, newWorkspaces) => {
            workspaces.value = newWorkspaces
        })
        window.api.image.notify((_event, newImages) => {
            images.value = newImages
        })
    }

    // 定时持久化数据
    setInterval(
        () => {
            window.api.prompt.update(prompts.value)
            window.api.example.update(examples.value)
            window.api.tag.update(tags.value)
            window.api.workspace.update(workspaces.value)
            window.api.image.update(images.value)
        },
        2 * 60 * 1000
    )

    const promptView = {
        readonly: readonly(prompts.value),
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
            window.api.prompt.update([prompts.value[index]])
            return prompts.value[index]
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
        readonly: readonly(examples.value),
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
            window.api.example.update([examples.value[index]])
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
    }
    const tagView = {
        readonly: readonly(tags.value),
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
        async update(tag: string): Promise<Tag> {
            const index = tags.value.findIndex((t) => t.text === tag)
            if (index === -1) {
                throw notFoundError
            }
            tags.value[index] = { ...tags.value[index], text: tag }
            window.api.tag.update([tags.value[index]])
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
        readonly: readonly(workspaces.value),
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
            window.api.workspace.update([workspaces.value[index]])
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
        readonly: readonly(images.value),
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
        promptView,
        exampleView,
        tagView,
        workspaceView,
        imageView,
    }
})
