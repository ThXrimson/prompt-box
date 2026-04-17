import { PromptService } from './interfaces/prompt'
import { NewPrompt, Prompt, PromptKind, UpdatePrompt } from '@shared/models/prompt'
import { BaseLowdbService } from './base-lowdb-service'

export default class PromptLowdbService extends BaseLowdbService<Prompt> implements PromptService {
    private static instance?: PromptLowdbService
    protected dbFilename = 'prompt.json'

    protected getDefaultData(): Prompt[] {
        return []
    }

    private constructor() {
        super()
    }

    static getInstance(): PromptLowdbService {
        if (!PromptLowdbService.instance) {
            PromptLowdbService.instance = new PromptLowdbService()
        }
        return PromptLowdbService.instance
    }

    async create(prompts: NewPrompt[]): Promise<Prompt[]> {
        const items = prompts.map((prompt) => ({
            text: prompt.text,
            translation: prompt.translation ?? '',
            description: prompt.description ?? '',
            source: prompt.source ?? '',
            kind: prompt.kind ?? PromptKind.Normal,
            relatedTexts: prompt.relatedTexts ?? [],
            tagIds: prompt.tagIds ?? [],
            exampleIds: prompt.exampleIds ?? [],
            rate: prompt.rate ?? 0,
        }))
        return this.createEntities(items)
    }

    async delete(ids: string[]): Promise<boolean> {
        return this.deleteEntities(ids)
    }

    async update(prompts: UpdatePrompt[]): Promise<Prompt[]> {
        return this.updateEntities(prompts)
    }
}
