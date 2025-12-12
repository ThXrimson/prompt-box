import { JSONFilePreset } from 'lowdb/node'
import { ImageService } from './interfaces/image'
import { Image, NewImage, UpdateImage } from '@shared/models/image'
import { isNil } from 'lodash'
import { join } from 'path'
import { getDataDir } from '../utils'
import fs from 'fs/promises'
import path from 'path'

const DB_FILENAME = 'image.json'
const DB_PATH = join(getDataDir(), DB_FILENAME)

export default class ImageLowdbService implements ImageService {
    private db?: Awaited<ReturnType<typeof JSONFilePreset<Image[]>>>
    private static instance?: ImageLowdbService
    private constructor() {
        //
    }
    static getInstance(): ImageLowdbService {
        if (isNil(ImageLowdbService.instance)) {
            ImageLowdbService.instance = new ImageLowdbService()
        }
        return ImageLowdbService.instance
    }
    private async getDb(): Promise<Awaited<ReturnType<typeof JSONFilePreset<Image[]>>>> {
        if (isNil(this.db)) {
            await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
            this.db = await JSONFilePreset<Image[]>(DB_PATH, [])
            await this.db.read()
        }
        return this.db
    }
    async getAll(): Promise<Image[]> {
        const db = await this.getDb()
        return db.data
    }
    async create(images: NewImage[]): Promise<Image[]> {
        const db = await this.getDb()
        const newImages = [] as Image[]
        for (const image of images) {
            const newImage = {
                id: crypto.randomUUID(),
                fileName: image.fileName,
                createTime: Date.now(),
                updateTime: Date.now(),
            }
            newImages.push(newImage)
        }
        db.data.push(...newImages)
        db.write()
        return newImages
    }
    async delete(ids: string[]): Promise<boolean> {
        const db = await this.getDb()
        db.data = db.data.filter((image) => !ids.includes(image.id))
        db.write()
        return true
    }
    async update(images: UpdateImage[]): Promise<Image[]> {
        const db = await this.getDb()
        const updatedImages = [] as Image[]
        for (const image of images) {
            const index = db.data.findIndex((i) => i.id === image.id)
            if (index !== -1) {
                db.data[index] = {
                    ...db.data[index],
                    ...image,
                    updateTime: Date.now(),
                }
                updatedImages.push(db.data[index])
            }
        }
        db.write()
        return updatedImages
    }
}
