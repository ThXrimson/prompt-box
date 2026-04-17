import { TagService } from './interfaces/tag'
import { Tag, NewTag, UpdateTag } from '@shared/models/tag'
import { BaseLowdbService } from './base-lowdb-service'
import { DB_FILENAMES } from '@shared/constants/app'

export default class TagLowdbService extends BaseLowdbService<Tag> implements TagService {
    private static instance?: TagLowdbService
    protected dbFilename = DB_FILENAMES.tag

    protected getDefaultData(): Tag[] {
        return []
    }

    private constructor() {
        super()
    }

    static getInstance(): TagLowdbService {
        if (!TagLowdbService.instance) {
            TagLowdbService.instance = new TagLowdbService()
        }
        return TagLowdbService.instance
    }

    async create(tags: NewTag[]): Promise<Tag[]> {
        const items = tags.map((tag) => ({
            text: tag.text ?? '',
        }))
        return this.createEntities(items)
    }

    async delete(ids: string[]): Promise<boolean> {
        return this.deleteEntities(ids)
    }

    async update(tags: UpdateTag[]): Promise<Tag[]> {
        return this.updateEntities(tags)
    }
}
