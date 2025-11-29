import { Example, NewExample } from '@shared/models/example'
export interface ExampleService {
    getAll(): Promise<Example[]>
    create(examples: NewExample[]): Promise<Example[]>
    delete(ids: string[]): Promise<boolean>
    update(examples: UpdateExample[]): Promise<Example[]>
}
