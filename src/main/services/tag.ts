import { join } from 'path'
import { getDataDir } from '../utils'
import { TagService } from './interfaces/tag'
import { Tag, NewTag, UpdateTag } from '@shared/models/tag'
import { JSONFilePreset } from 'lowdb/node'
import { isNil } from 'lodash'

const DB_FILENAME = 'tag.json'
const DB_PATH = join(getDataDir(), DB_FILENAME)

export default class TagLowdbService implements TagService {
    private db?: Awaited<ReturnType<typeof JSONFilePreset<{ tags: Tag[] }>>>
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
    private async getDb(): Promise<Awaited<ReturnType<typeof JSONFilePreset<{ tags: Tag[] }>>>> {
        if (isNil(this.db)) {
            this.db = await JSONFilePreset<{ tags: Tag[] }>(DB_PATH, { tags: [] })
            await this.db.read()
        }
        return this.db
    }
    async getAll(): Promise<Tag[]> {
        const db = await this.getDb()
        return db.data.tags
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
        db.write()
        return db.data.tags
    }
    async delete(ids: string[]): Promise<boolean> {
        const db = await this.getDb()
        db.data.tags = db.data.tags.filter((tag) => !ids.includes(tag.id))
        db.write()
        return true
    }
    async update(tags: UpdateTag[]): Promise<Tag[]> {
        const db = await this.getDb()
        const updatedTags = [] as Tag[]
        for (const tag of tags) {
            const index = db.data.tags.findIndex((t) => t.id === tag.id)
            if (index !== -1) {
                const updatedTag = {
                    ...db.data.tags[index],
                    text: tag.text || '',
                    updateTime: Date.now(),
                }
                updatedTags.push(updatedTag)
                db.data.tags[index] = updatedTag
            }
        }
        db.write()
        return db.data.tags
    }
}
