import { NewWorkspace, UpdateWorkspace, Workspace } from '@shared/models/workspace'

export interface WorkspaceService {
    getAll(): Promise<Workspace[]>
    create(workspaces: NewWorkspace[]): Promise<Workspace[]>
    delete(ids: string[]): Promise<boolean>
    update(workspaces: UpdateWorkspace[]): Promise<Workspace[]>
}
