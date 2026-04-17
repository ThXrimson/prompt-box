import { JSONFilePreset } from 'lowdb/node'
import { isNil } from 'lodash'
import fs from 'fs/promises'
import path from 'path'
import { getDataDir } from '../utils'

export interface BaseEntity {
    id: string
    createTime: number
    updateTime: number
}

export abstract class BaseLowdbService<T extends BaseEntity> {
    protected db?: Awaited<ReturnType<typeof JSONFilePreset<T[]>>>
    protected abstract dbFilename: string
    protected abstract getDefaultData(): T[]

    protected async getDb(): Promise<Awaited<ReturnType<typeof JSONFilePreset<T[]>>>> {
        if (isNil(this.db)) {
            const dbPath = path.join(getDataDir(), this.dbFilename)
            await fs.mkdir(path.dirname(dbPath), { recursive: true })
            this.db = await JSONFilePreset<T[]>(dbPath, this.getDefaultData())
            await this.db.read()
        }
        return this.db
    }

    async getAll(): Promise<T[]> {
        const db = await this.getDb()
        return db.data
    }

    protected async createEntities(
        items: Omit<T, 'id' | 'createTime' | 'updateTime'>[]
    ): Promise<T[]> {
        const db = await this.getDb()
        const newItems: T[] = []
        const now = Date.now()

        for (const item of items) {
            const newItem = {
                ...item,
                id: crypto.randomUUID(),
                createTime: now,
                updateTime: now,
            } as T
            newItems.push(newItem)
        }

        db.data.push(...newItems)
        await db.write()
        return newItems
    }

    protected async deleteEntities(ids: string[]): Promise<boolean> {
        const db = await this.getDb()
        db.data = db.data.filter((item) => !ids.includes(item.id))
        await db.write()
        return true
    }

    protected async updateEntities(updates: Partial<T> & { id: string }[]): Promise<T[]> {
        const db = await this.getDb()
        const updatedItems: T[] = []
        const now = Date.now()

        for (const update of updates) {
            const index = db.data.findIndex((item) => item.id === update.id)
            if (index !== -1) {
                db.data[index] = {
                    ...db.data[index],
                    ...update,
                    updateTime: now,
                }
                updatedItems.push(db.data[index])
            }
        }

        await db.write()
        return updatedItems
    }
}
