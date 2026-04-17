import { ImageService } from './interfaces/image'
import { Image, NewImage, UpdateImage } from '@shared/models/image'
import { BaseLowdbService } from './base-lowdb-service'
import { DB_FILENAMES } from '@shared/constants/app'

export default class ImageLowdbService extends BaseLowdbService<Image> implements ImageService {
    private static instance?: ImageLowdbService
    protected dbFilename = DB_FILENAMES.image

    protected getDefaultData(): Image[] {
        return []
    }

    private constructor() {
        super()
    }

    static getInstance(): ImageLowdbService {
        if (!ImageLowdbService.instance) {
            ImageLowdbService.instance = new ImageLowdbService()
        }
        return ImageLowdbService.instance
    }

    async create(images: NewImage[]): Promise<Image[]> {
        const items = images.map((image) => ({
            fileName: image.fileName,
        }))
        return this.createEntities(items)
    }

    async delete(ids: string[]): Promise<boolean> {
        return this.deleteEntities(ids)
    }

    async update(images: UpdateImage[]): Promise<Image[]> {
        return this.updateEntities(images)
    }
}
