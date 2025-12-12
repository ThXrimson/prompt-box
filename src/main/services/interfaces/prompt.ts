import { NewPrompt, Prompt, UpdatePrompt } from '@shared/models/prompt'

export interface PromptService {
    getAll(): Promise<Prompt[]>
    create(prompts: NewPrompt[]): Promise<Prompt[]>
    delete(ids: string[]): Promise<boolean>
    update(prompts: UpdatePrompt[]): Promise<Prompt[]>
}
