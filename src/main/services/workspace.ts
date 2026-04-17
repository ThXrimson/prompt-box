import { WorkspaceService } from './interfaces/workspace'
import { Workspace, NewWorkspace, UpdateWorkspace } from '@shared/models/workspace'
import { BaseLowdbService } from './base-lowdb-service'

export default class WorkspaceLowdbService extends BaseLowdbService<Workspace> implements WorkspaceService {
    private static instance?: WorkspaceLowdbService
    protected dbFilename = 'workspace.json'

    protected getDefaultData(): Workspace[] {
        return []
    }

    private constructor() {
        super()
    }

    static getInstance(): WorkspaceLowdbService {
        if (!WorkspaceLowdbService.instance) {
            WorkspaceLowdbService.instance = new WorkspaceLowdbService()
        }
        return WorkspaceLowdbService.instance
    }

    async create(workspaces: NewWorkspace[]): Promise<Workspace[]> {
        const items = workspaces.map((workspace) => ({
            name: workspace.name,
            positive: workspace.positive ?? [],
            negative: workspace.negative ?? [],
            tagIds: workspace.tagIds ?? [],
        }))
        return this.createEntities(items)
    }

    async delete(ids: string[]): Promise<boolean> {
        return this.deleteEntities(ids)
    }

    async update(workspaces: UpdateWorkspace[]): Promise<Workspace[]> {
        return this.updateEntities(workspaces)
    }
}
