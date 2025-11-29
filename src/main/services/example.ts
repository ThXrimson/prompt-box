import { join } from 'path'
import { getDataDir } from '../utils'
import { ExampleService } from './interfaces/example'
import { Example, NewExample, UpdateExample } from '@shared/models/example'
import { JSONFilePreset } from 'lowdb/node'
import { isNil } from 'lodash'

const DB_FILENAME = 'example.json'
const DB_PATH = join(getDataDir(), DB_FILENAME)

export default class ExampleLowdbService implements ExampleService {
    private db?: Awaited<ReturnType<typeof JSONFilePreset<{ examples: Example[] }>>>
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
    private async getDb(): Promise<
        Awaited<ReturnType<typeof JSONFilePreset<{ examples: Example[] }>>>
    > {
        if (isNil(this.db)) {
            this.db = await JSONFilePreset<{ examples: Example[] }>(DB_PATH, { examples: [] })
            await this.db.read()
        }
        return this.db
    }
    async getAll(): Promise<Example[]> {
        const db = await this.getDb()
        return db.data.examples
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
        db.write()
        return db.data.examples
    }
    async delete(ids: string[]): Promise<boolean> {
        const db = await this.getDb()
        db.data.examples = db.data.examples.filter((example) => !ids.includes(example.id))
        db.write()
        return true
    }
    async update(examples: UpdateExample[]): Promise<Example[]> {
        const db = await this.getDb()
        const updateExamples = [] as Example[]
        for (const example of examples) {
            const index = db.data.examples.findIndex((item) => item.id === example.id)
            if (index !== -1) {
                const updateExample = {
                    ...db.data.examples[index],
                    ...example,
                    updateTime: Date.now(),
                }
                updateExamples.push(updateExample)
                db.data.examples[index] = updateExample
            }
        }
        db.write()
        return db.data.examples
    }
}
