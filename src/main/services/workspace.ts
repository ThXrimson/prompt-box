import { join } from 'path'
import { getDataDir } from '../utils'
import { WorkspaceService } from './interfaces/workspace'
import { Workspace, NewWorkspace, UpdateWorkspace } from '@shared/models/workspace'
import { JSONFilePreset } from 'lowdb/node'
import { isNil } from 'lodash'
import fs from 'fs/promises'
import path from 'path'

const DB_FILENAME = 'workspace.json'
const DB_PATH = join(getDataDir(), DB_FILENAME)

export default class WorkspaceLowdbService implements WorkspaceService {
    private db?: Awaited<ReturnType<typeof JSONFilePreset<Workspace[]>>>
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
    private async getDb(): Promise<Awaited<ReturnType<typeof JSONFilePreset<Workspace[]>>>> {
        if (isNil(this.db)) {
            await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
            this.db = await JSONFilePreset<Workspace[]>(DB_PATH, [])
            await this.db.read()
        }
        return this.db
    }
    async getAll(): Promise<Workspace[]> {
        const db = await this.getDb()
        return db.data
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
        db.data.push(...newWorkspaces)
        db.write()
        return newWorkspaces
    }
    async delete(ids: string[]): Promise<boolean> {
        const db = await this.getDb()
        db.data = db.data.filter((workspace) => !ids.includes(workspace.id))
        db.write()
        return true
    }
    async update(workspaces: UpdateWorkspace[]): Promise<Workspace[]> {
        const db = await this.getDb()
        const updatedWorkspaces = [] as Workspace[]
        for (const workspace of workspaces) {
            const index = db.data.findIndex((w) => w.id === workspace.id)
            if (index !== -1) {
                const updatedWorkspace = {
                    ...db.data[index],
                    ...workspace,
                    updateTime: Date.now(),
                }
                updatedWorkspaces.push(updatedWorkspace)
                db.data[index] = updatedWorkspace
            }
        }
        db.write()
        return updatedWorkspaces
    }
}
