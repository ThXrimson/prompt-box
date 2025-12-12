import { join } from 'path'
import { getDataDir } from '../utils'
import { TagService } from './interfaces/tag'
import { Tag, NewTag, UpdateTag } from '@shared/models/tag'
import { JSONFilePreset } from 'lowdb/node'
import { isNil } from 'lodash'
import fs from 'fs/promises'
import path from 'path'

const DB_FILENAME = 'tag.json'
const DB_PATH = join(getDataDir(), DB_FILENAME)

export default class TagLowdbService implements TagService {
    private db?: Awaited<ReturnType<typeof JSONFilePreset<Tag[]>>>
    private static instance?: TagLowdbService
    private constructor() {
        //
    }
    static getInstance(): TagLowdbService {
        if (isNil(TagLowdbService.instance)) {
            TagLowdbService.instance = new TagLowdbService()
        }
        return TagLowdbService.instance
    }
    private async getDb(): Promise<Awaited<ReturnType<typeof JSONFilePreset<Tag[]>>>> {
        if (isNil(this.db)) {
            await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
            this.db = await JSONFilePreset<Tag[]>(DB_PATH, [])
            await this.db.read()
        }
        return this.db
    }
    async getAll(): Promise<Tag[]> {
        const db = await this.getDb()
        return db.data
    }
    async create(tags: NewTag[]): Promise<Tag[]> {
        const db = await this.getDb()
        const newTags = [] as Tag[]
        for (const tag of tags) {
            const newTag = {
                id: crypto.randomUUID(),
                text: tag.text || '',
                createTime: Date.now(),
                updateTime: Date.now(),
            }
            newTags.push(newTag)
        }
        db.data.push(...newTags)
        db.write()
        return newTags
    }
    async delete(ids: string[]): Promise<boolean> {
        const db = await this.getDb()
        db.data = db.data.filter((tag) => !ids.includes(tag.id))
        db.write()
        return true
    }
    async update(tags: UpdateTag[]): Promise<Tag[]> {
        const db = await this.getDb()
        const updatedTags = [] as Tag[]
        for (const tag of tags) {
            const index = db.data.findIndex((t) => t.id === tag.id)
            if (index !== -1) {
                const updatedTag = {
                    ...db.data[index],
                    text: tag.text || '',
                    updateTime: Date.now(),
                }
                updatedTags.push(updatedTag)
                db.data[index] = updatedTag
            }
        }
        db.write()
        return updatedTags
    }
}
