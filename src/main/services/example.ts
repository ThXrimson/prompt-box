import path, { join } from 'path'
import { getDataDir } from '../utils'
import { ExampleService } from './interfaces/example'
import { Example, NewExample, UpdateExample } from '@shared/models/example'
import { JSONFilePreset } from 'lowdb/node'
import { isNil } from 'lodash'
import fs from 'fs/promises'

const DB_FILENAME = 'example.json'
const DB_PATH = join(getDataDir(), DB_FILENAME)

export default class ExampleLowdbService implements ExampleService {
    private db?: Awaited<ReturnType<typeof JSONFilePreset<Example[]>>>
    private static instance?: ExampleLowdbService
    private constructor() {
        //
    }
    static getInstance(): ExampleLowdbService {
        if (isNil(ExampleLowdbService.instance)) {
            ExampleLowdbService.instance = new ExampleLowdbService()
        }
        return ExampleLowdbService.instance
    }
    private async getDb(): Promise<Awaited<ReturnType<typeof JSONFilePreset<Example[]>>>> {
        if (isNil(this.db)) {
            await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
            this.db = await JSONFilePreset<Example[]>(DB_PATH, [])
            await this.db.read()
        }
        return this.db
    }
    async getAll(): Promise<Example[]> {
        const db = await this.getDb()
        return db.data
    }
    async create(examples: NewExample[]): Promise<Example[]> {
        const db = await this.getDb()
        const newExamples = [] as Example[]
        for (const example of examples) {
            const newExample = {
                id: crypto.randomUUID(),
                positive: example.positive || '',
                negative: example.negative || '',
                extra: example.extra || '',
                imageIds: example.imageIds || [],
                createTime: Date.now(),
                updateTime: Date.now(),
            }
            newExamples.push(newExample)
        }
        db.data.push(...newExamples)
        db.write()
        return newExamples
    }
    async delete(ids: string[]): Promise<boolean> {
        const db = await this.getDb()
        db.data = db.data.filter((example) => !ids.includes(example.id))
        db.write()
        return true
    }
    async update(examples: UpdateExample[]): Promise<Example[]> {
        const db = await this.getDb()
        const updateExamples = [] as Example[]
        for (const example of examples) {
            const index = db.data.findIndex((item) => item.id === example.id)
            if (index !== -1) {
                const updateExample = {
                    ...db.data[index],
                    ...example,
                    updateTime: Date.now(),
                }
                updateExamples.push(updateExample)
                db.data[index] = updateExample
            }
        }
        db.write()
        return updateExamples
    }
}
