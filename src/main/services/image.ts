import { JSONFilePreset } from 'lowdb/node'
import { ImageService } from './interfaces/image'
import { Image, NewImage, UpdateImage } from '@shared/models/image'
import { isNil } from 'lodash'
import { join } from 'path'
import { getDataDir } from '../utils'

const DB_FILENAME = 'image.json'
const DB_PATH = join(getDataDir(), DB_FILENAME)

export default class ImageLowdbService implements ImageService {
    private db?: Awaited<ReturnType<typeof JSONFilePreset<{ images: Image[] }>>>
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
    private async getDb(): Promise<
        Awaited<ReturnType<typeof JSONFilePreset<{ images: Image[] }>>>
    > {
        if (isNil(this.db)) {
            this.db = await JSONFilePreset<{ images: Image[] }>(DB_PATH, { images: [] })
            await this.db.read()
        }
        return this.db
    }
    async getAll(): Promise<Image[]> {
        const db = await this.getDb()
        return db.data.images
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
        db.data.images.push(...newImages)
        db.write()
        return newImages
    }
    async delete(ids: string[]): Promise<boolean> {
        const db = await this.getDb()
        db.data.images = db.data.images.filter((image) => !ids.includes(image.id))
        db.write()
        return true
    }
    async update(images: UpdateImage[]): Promise<Image[]> {
        const db = await this.getDb()
        const updatedImages = [] as Image[]
        for (const image of images) {
            const index = db.data.images.findIndex((i) => i.id === image.id)
            if (index !== -1) {
                db.data.images[index] = {
                    ...db.data.images[index],
                    ...image,
                    updateTime: Date.now(),
                }
                updatedImages.push(db.data.images[index])
            }
        }
        db.write()
        return updatedImages
    }
}
