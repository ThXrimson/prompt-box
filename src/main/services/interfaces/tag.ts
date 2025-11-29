import { NewTag, Tag, UpdateTag } from '@shared/models/tag'

export interface TagService {
    getAll(): Promise<Tag[]>
    create(tags: NewTag[]): Promise<Tag[]>
    delete(ids: string[]): Promise<boolean>
    update(tags: UpdateTag[]): Promise<Tag[]>
}
