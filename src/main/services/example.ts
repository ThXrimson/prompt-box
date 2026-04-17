import { ExampleService } from './interfaces/example'
import { Example, NewExample, UpdateExample } from '@shared/models/example'
import { BaseLowdbService } from './base-lowdb-service'
import { DB_FILENAMES } from '@shared/constants/app'

export default class ExampleLowdbService
    extends BaseLowdbService<Example>
    implements ExampleService
{
    private static instance?: ExampleLowdbService
    protected dbFilename = DB_FILENAMES.example

    protected getDefaultData(): Example[] {
        return []
    }

    private constructor() {
        super()
    }

    static getInstance(): ExampleLowdbService {
        if (!ExampleLowdbService.instance) {
            ExampleLowdbService.instance = new ExampleLowdbService()
        }
        return ExampleLowdbService.instance
    }

    async create(examples: NewExample[]): Promise<Example[]> {
        const items = examples.map((example) => ({
            positive: example.positive ?? '',
            negative: example.negative ?? '',
            extra: example.extra ?? '',
            imageIds: example.imageIds ?? [],
        }))
        return this.createEntities(items)
    }

    async delete(ids: string[]): Promise<boolean> {
        return this.deleteEntities(ids)
    }

    async update(examples: UpdateExample[]): Promise<Example[]> {
        return this.updateEntities(examples)
    }
}
