import { join } from 'path'
import { getDataDir } from '../utils'
import { PromptService } from './interfaces/prompt'
import { JSONFilePreset } from 'lowdb/node'
import { NewPrompt, Prompt, PromptKind, UpdatePrompt } from '@shared/models/prompt'
import { isNil } from 'lodash'
import fs from 'fs/promises'
import path from 'path'

const DB_FILENAME = 'prompt.json'
const DB_PATH = join(getDataDir(), DB_FILENAME)

export default class PromptLowdbService implements PromptService {
    private db?: Awaited<ReturnType<typeof JSONFilePreset<Prompt[]>>>
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
    private async getDb(): Promise<Awaited<ReturnType<typeof JSONFilePreset<Prompt[]>>>> {
        if (isNil(this.db)) {
            await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
            this.db = await JSONFilePreset<Prompt[]>(DB_PATH, [])
            await this.db.read()
        }
        return this.db
    }
    async getAll(): Promise<Prompt[]> {
        const db = await this.getDb()
        return db.data
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
                source: prompt.source || '',
                kind: prompt.kind || PromptKind.Normal,
                relatedTexts: prompt.relatedTexts || [],
                tagIds: prompt.tagIds || [],
                exampleIds: prompt.exampleIds || [],
                rate: prompt.rate || 0,
                createTime: Date.now(),
                updateTime: Date.now(),
            }
            newPrompts.push(newPrompt)
        }
        db.data.push(...newPrompts)
        db.write()
        return newPrompts
    }
    async delete(ids: string[]): Promise<boolean> {
        const db = await this.getDb()
        db.data = db.data.filter((prompt) => !ids.includes(prompt.id))
        db.write()
        return true
    }
    async update(prompts: UpdatePrompt[]): Promise<Prompt[]> {
        const db = await this.getDb()
        const updatedPrompts = [] as Prompt[]
        for (const prompt of prompts) {
            const index = db.data.findIndex((p) => p.id === prompt.id)
            if (index !== -1) {
                db.data[index] = {
                    ...db.data[index],
                    ...prompt,
                    updateTime: Date.now(),
                }
                updatedPrompts.push(db.data[index])
            }
        }
        db.write()
        return updatedPrompts
    }
}
