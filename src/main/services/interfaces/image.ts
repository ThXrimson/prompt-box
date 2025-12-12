import { Image, NewImage, UpdateImage } from '@shared/models/image'

export interface ImageService {
    getAll(): Promise<Image[]>
    create(images: NewImage[]): Promise<Image[]>
    delete(ids: string[]): Promise<boolean>
    update(images: UpdateImage[]): Promise<Image[]>
}
