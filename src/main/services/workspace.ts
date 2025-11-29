import { join } from 'path'
import { getDataDir } from '../utils'
import { WorkspaceService } from './interfaces/workspace'
import { Workspace, NewWorkspace, UpdateWorkspace } from '@shared/models/workspace'
import { JSONFilePreset } from 'lowdb/node'
import { isNil } from 'lodash'

const DB_FILENAME = 'workspace.json'
const DB_PATH = join(getDataDir(), DB_FILENAME)

export default class WorkspaceLowdbService implements WorkspaceService {
    private db?: Awaited<ReturnType<typeof JSONFilePreset<{ workspaces: Workspace[] }>>>
    private static instance?: WorkspaceLowdbService
    private constructor() {
        //
    }
    static getInstance(): WorkspaceLowdbService {
        if (isNil(WorkspaceLowdbService.instance)) {
            WorkspaceLowdbService.instance = new WorkspaceLowdbService()
        }
        return WorkspaceLowdbService.instance
    }
    private async getDb(): Promise<
        Awaited<ReturnType<typeof JSONFilePreset<{ workspaces: Workspace[] }>>>
    > {
        if (isNil(this.db)) {
            this.db = await JSONFilePreset<{ workspaces: Workspace[] }>(DB_PATH, { workspaces: [] })
            await this.db.read()
        }
        return this.db
    }
    async getAll(): Promise<Workspace[]> {
        const db = await this.getDb()
        return db.data.workspaces
    }
    async create(workspaces: NewWorkspace[]): Promise<Workspace[]> {
        const db = await this.getDb()
        const newWorkspaces = [] as Workspace[]
        for (const workspace of workspaces) {
            const newWorkspace = {
                id: crypto.randomUUID(),
                name: workspace.name || '',
                positive: workspace.positive || [],
                negative: workspace.negative || [],
                tagIds: workspace.tagIds || [],
                createTime: Date.now(),
                updateTime: Date.now(),
            }
            newWorkspaces.push(newWorkspace)
        }
        db.write()
        return db.data.workspaces
    }
    async delete(ids: string[]): Promise<boolean> {
        const db = await this.getDb()
        db.data.workspaces = db.data.workspaces.filter((workspace) => !ids.includes(workspace.id))
        db.write()
        return true
    }
    async update(workspaces: UpdateWorkspace[]): Promise<Workspace[]> {
        const db = await this.getDb()
        const updatedWorkspaces = [] as Workspace[]
        for (const workspace of workspaces) {
            const index = db.data.workspaces.findIndex((w) => w.id === workspace.id)
            if (index !== -1) {
                const updatedWorkspace = {
                    ...db.data.workspaces[index],
                    ...workspace,
                    updateTime: Date.now(),
                }
                updatedWorkspaces.push(updatedWorkspace)
                db.data.workspaces[index] = updatedWorkspace
            }
        }
        db.write()
        return db.data.workspaces
    }
}
