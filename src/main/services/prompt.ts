import { join } from 'path'
import { getDataDir } from '../utils'
import { PromptService } from './interfaces/prompt'
import { JSONFilePreset } from 'lowdb/node'
import { NewPrompt, Prompt, UpdatePrompt } from '@shared/models/prompt'
import { isNil } from 'lodash'

const DB_FILENAME = 'prompt.json'
const DB_PATH = join(getDataDir(), DB_FILENAME)

export default class PromptLowdbService implements PromptService {
    private db?: Awaited<ReturnType<typeof JSONFilePreset<{ prompts: Prompt[] }>>>
    private static instance?: PromptLowdbService
    private constructor() {
        //
    }
    static getInstance(): PromptLowdbService {
        if (isNil(PromptLowdbService.instance)) {
            PromptLowdbService.instance = new PromptLowdbService()
        }
        return PromptLowdbService.instance
    }
    private async getDb(): Promise<
        Awaited<ReturnType<typeof JSONFilePreset<{ prompts: Prompt[] }>>>
    > {
        if (isNil(this.db)) {
            this.db = await JSONFilePreset<{ prompts: Prompt[] }>(DB_PATH, { prompts: [] })
            await this.db.read()
        }
        return this.db
    }
    async getAll(): Promise<Prompt[]> {
        const db = await this.getDb()
        return db.data.prompts
    }
    async create(prompts: NewPrompt[]): Promise<Prompt[]> {
        const db = await this.getDb()
        const newPrompts = [] as Prompt[]
        for (const prompt of prompts) {
            const newPrompt = {
                id: crypto.randomUUID(),
                text: prompt.text,
                translation: prompt.translation || '',
                description: prompt.description || '',
                tagIds: prompt.tagIds || [],
                exampleIds: prompt.exampleIds || [],
                createTime: Date.now(),
                updateTime: Date.now(),
            }
            newPrompts.push(newPrompt)
        }
        db.data.prompts.push(...newPrompts)
        db.write()
        return newPrompts
    }
    async delete(ids: string[]): Promise<boolean> {
        const db = await this.getDb()
        db.data.prompts = db.data.prompts.filter((prompt) => !ids.includes(prompt.id))
        db.write()
        return true
    }
    async update(prompts: UpdatePrompt[]): Promise<Prompt[]> {
        const db = await this.getDb()
        const updatedPrompts = [] as Prompt[]
        for (const prompt of prompts) {
            const index = db.data.prompts.findIndex((p) => p.id === prompt.id)
            if (index !== -1) {
                db.data.prompts[index] = {
                    ...db.data.prompts[index],
                    ...prompt,
                    updateTime: Date.now(),
                }
                updatedPrompts.push(db.data.prompts[index])
            }
        }
        db.write()
        return updatedPrompts
    }
}
