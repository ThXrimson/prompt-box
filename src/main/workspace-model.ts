import Database from 'better-sqlite3'
import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import log from 'electron-log/main'
import { EditorState, WorkspaceState } from './types'

let db: InstanceType<typeof Database> | null = null

const dbUninitializedError = new Error(
  'Database is not initialized. Please call initDB() before using the database.'
)

export function initDB(): void {
  const dbPath = join(app.getAppPath(), 'data', 'workspace.sqlite')
  mkdirSync(dirname(dbPath), { recursive: true })
  db = new Database(dbPath, {
    verbose: log.verbose,
  })

  db.pragma('foreign_keys = ON')

  const initSql = `
-- workspace_states 主表
CREATE TABLE IF NOT EXISTS workspace_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  tag_collections TEXT NOT NULL, -- json array
  create_time TEXT NOT NULL, -- iso 8601
  update_time TEXT NOT NULL -- iso 8601
);

-- editors 主表
CREATE TABLE IF NOT EXISTS editors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  positive INTEGER NOT NULL DEFAULT 0, -- positive = 1, negative = 0
  prompts TEXT NOT NULL, -- json array of prompt IDs
  FOREIGN KEY (workspace_id) REFERENCES workspace_states(id) ON DELETE CASCADE,
  CONSTRAINT unique_workspace_editor UNIQUE (workspace_id, positive)
);
`

  db.exec(initSql)
}
export function closeDB(): void {
  db?.close()
  db = null
  log.info('Database connection closed')
}

function checkDBInitialized<T>(db: T | null): db is T {
  if (db === null) {
    return false
  }
  return true
}

export function selectAllWorkspaceIDAndNames(): {
  id: number
  name: string
  createTime: string
  updateTime: string
}[] {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }

  const selectSql = `SELECT id, name, create_time AS createTime, update_time AS updateTime
FROM workspace_states;`
  const stmt = db.prepare(selectSql)
  const result = stmt.all() as {
    id: number
    name: string
    createTime: string
    updateTime: string
  }[]
  return result
}

export function selectWorkspaceByID(
  workspaceID: number
): WorkspaceState | null {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }

  const selectSql = `SELECT
id,
name,
tag_collections AS tagCollectionsJSON,
create_time AS createTime,
update_time AS updateTime
FROM workspace_states
WHERE id = ?;`
  const stmt = db.prepare(selectSql)

  try {
    const basicResult = stmt.get(workspaceID) as
      | (Omit<
          WorkspaceState,
          'positiveEditor' | 'negativeEditor' | 'tagCollections'
        > & { tagCollectionsJSON: string })
      | undefined
    if (basicResult === undefined) {
      throw new Error(`Workspace with ID ${workspaceID} not found`)
    }
    const positiveEditor = selectEditorByWorkspaceID(workspaceID, true)
    const negativeEditor = selectEditorByWorkspaceID(workspaceID, false)

    if (positiveEditor === null || negativeEditor === null) {
      throw new Error(`Editors for workspace ID ${workspaceID} not found`)
    }

    return {
      id: basicResult.id,
      name: basicResult.name,
      positiveEditor,
      negativeEditor,
      tagCollections: JSON.parse(basicResult.tagCollectionsJSON),
      createTime: basicResult.createTime,
      updateTime: basicResult.updateTime,
    }
  } catch (e) {
    log.error(`Select workspace by ID ${workspaceID} error: ${e}`)
    return null
  }
}

export function selectEditorByWorkspaceID(
  workspaceID: number,
  positive: boolean
): EditorState | null {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }

  const selectSql = `SELECT id, prompts AS promptsJSON FROM editors WHERE workspace_id = ? AND positive = ?;`
  const stmt = db.prepare(selectSql)
  try {
    const result = stmt.get(workspaceID, positive ? 1 : 0) as
      | (Omit<EditorState, 'prompts'> & {
          promptsJSON: string
        })
      | undefined
    if (result === undefined) {
      log.warn(
        `No editor found for workspace ID ${workspaceID}, positive: ${positive}`
      )
      return null
    }
    const prompts = JSON.parse(result.promptsJSON) as string[]
    return {
      id: result.id,
      prompts,
    }
  } catch (e) {
    log.error(
      `Select editor by workspace ID ${workspaceID}, positive: ${positive} error: ${e}`
    )
    return null
  }
}

export function addWorkspace(
  workspace: Omit<
    WorkspaceState,
    'id' | 'updateTime' | 'createTime' | 'positiveEditor' | 'negativeEditor'
  > & {
    positiveEditor: { prompts: string[] }
    negativeEditor: { prompts: string[] }
  }
): number | null {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }

  const insertSql = `INSERT INTO
workspace_states (
  name,
  tag_collections,
  create_time,
  update_time
) VALUES (?, ?, ?, ?);`
  const stmt = db.prepare(insertSql)
  const createTime = new Date().toISOString()

  let result: number | null = null

  try {
    db.transaction(() => {
      const dbResult = stmt.run(
        workspace.name,
        JSON.stringify(workspace.tagCollections),
        createTime,
        createTime
      )
      if (dbResult.changes === 0) {
        return
      }
      result = dbResult.lastInsertRowid as number

      const positiveEditorID = addEditor(
        dbResult.lastInsertRowid as number,
        workspace.positiveEditor,
        true
      )
      const negativeEditorID = addEditor(
        dbResult.lastInsertRowid as number,
        workspace.negativeEditor,
        false
      )
      if (positiveEditorID === null || negativeEditorID === null) {
        log.error(
          `Failed to add editors for workspace ${workspace.name}. Positive ID: ${positiveEditorID}, Negative ID: ${negativeEditorID}`
        )
        throw new Error(`Failed to add editors for workspace ${workspace.name}`)
      }
    })()
  } catch (e) {
    log.error(`Add workspace error: ${e}`)
    return null
  }

  return result
}

export function deleteWorkspace(workspaceID: number): boolean {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const deleteSql = `DELETE FROM workspace_states WHERE id = ?;`
  const stmt = db.prepare(deleteSql)
  try {
    const result = stmt.run(workspaceID)
    if (result.changes === 0) {
      log.warn(`No workspace found with ID ${workspaceID}`)
      return false
    }
    log.info(`Delete workspace ${workspaceID} success`)
    return true
  } catch (e) {
    log.error(`Delete workspace ${workspaceID} error: ${e}`)
    return false
  }
}

export function updateWorkspace(
  workspaceID: number,
  workspace: Partial<WorkspaceState>
): boolean {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }

  // Construct the SQL update statement dynamically based on provided fields
  const fieldsToUpdate: string[] = []
  const values: (string | number)[] = []

  if (workspace.name !== undefined) {
    fieldsToUpdate.push('name = ?')
    values.push(workspace.name)
  }
  if (workspace.tagCollections !== undefined) {
    fieldsToUpdate.push('tag_collections = ?')
    values.push(JSON.stringify(workspace.tagCollections))
  }

  if (
    fieldsToUpdate.length === 0 &&
    workspace.positiveEditor === undefined &&
    workspace.negativeEditor === undefined
  ) {
    log.warn(
      `No fields to update for workspace ${workspaceID}. Update operation skipped.`
    )
    return false
  }

  // Add update time to the fields to update
  const updateTime = new Date().toISOString()
  fieldsToUpdate.push('update_time = ?')
  values.push(updateTime)

  // Update the workspace_states table
  const updateSql = `UPDATE workspace_states SET ${fieldsToUpdate.join(
    ', '
  )} WHERE id = ?;`
  const stmt = db.prepare(updateSql)

  values.push(workspaceID)
  try {
    const result = stmt.run(...values)
    if (result.changes === 0) {
      log.warn(`No changes made to workspace ${workspaceID}`)
      return false
    }
    log.info(`Update workspace ${workspaceID} success`)
  } catch (e) {
    log.error(`Update workspace ${workspaceID} error: ${e}`)
    return false
  }

  const updateEditorSql = `UPDATE editors SET prompts = ? WHERE workspace_id = ? AND positive = ?;`
  const updateEditorStmt = db.prepare(updateEditorSql)

  // Update editors if provided
  if (workspace.positiveEditor !== undefined) {
    const positiveEditorID = workspace.positiveEditor.id
    try {
      const promptsJSON = JSON.stringify(workspace.positiveEditor.prompts)
      const result = updateEditorStmt.run(
        promptsJSON,
        workspaceID,
        1 // positive = 1
      )
      if (result.changes === 0) {
        log.warn(
          `No changes made to positive editor for workspace ${workspaceID}`
        )
        return false
      }
      log.info(
        `Update positive editor ${positiveEditorID} for workspace ${workspaceID} success`
      )
    } catch (e) {
      log.error(
        `Update positive editor for workspace ${workspaceID} error: ${e}`
      )
      return false
    }
  }

  if (workspace.negativeEditor !== undefined) {
    const negativeEditorID = workspace.negativeEditor.id
    try {
      const promptsJSON = JSON.stringify(workspace.negativeEditor.prompts)
      const result = updateEditorStmt.run(
        promptsJSON,
        workspaceID,
        0 // positive = 0
      )
      if (result.changes === 0) {
        log.warn(
          `No changes made to negative editor for workspace ${workspaceID}`
        )
        return false
      }
      log.info(
        `Update negative editor ${negativeEditorID} for workspace ${workspaceID} success`
      )
    } catch (e) {
      log.error(
        `Update negative editor for workspace ${workspaceID} error: ${e}`
      )
      return false
    }
  }
  return true
}

function addEditor(
  workspaceID: number,
  editor: { prompts: string[] },
  positive: boolean
): number | null {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }

  const insertSql = `INSERT INTO editors (workspace_id, positive, prompts) VALUES (?, ?, ?);`
  const stmt = db.prepare(insertSql)

  try {
    const result = stmt.run(
      workspaceID,
      positive ? 1 : 0,
      JSON.stringify(editor.prompts)
    )
    log.info(
      `Add editor to workspace ${workspaceID} success, editor ID: ${result.lastInsertRowid}`
    )
    return result.lastInsertRowid as number
  } catch (e) {
    log.error(`Add editor to workspace ${workspaceID} error: ${e}`)
    return null
  }
}
