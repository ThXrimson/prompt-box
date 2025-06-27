import Database from 'better-sqlite3'
import { app } from 'electron'
import { dirname, join } from 'node:path'
import { OptionalField, Prompt, PromptExample } from './types'
import log from 'electron-log/main'
import { mkdirSync } from 'node:fs'

let db: InstanceType<typeof Database> | null = null

const dbUninitializedError = new Error(
  'Database is not initialized. Please call initDB() before using the database.'
)

export function initDB(): void {
  const dbPath = join(app.getAppPath(), 'data', 'prompt.sqlite')
  mkdirSync(dirname(dbPath), { recursive: true })
  db = new Database(dbPath, {
    verbose: log.verbose,
  })
  db.pragma('foreign_keys = ON')

  const initSql = `
-- prompts 主表
CREATE TABLE IF NOT EXISTS prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  translation TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  insert_time INTEGER NOT NULL
);
-- tags 表
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag TEXT UNIQUE NOT NULL
);
-- prompt_tags 多对多关联表
CREATE TABLE IF NOT EXISTS prompt_tags (
  prompt_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (prompt_id, tag_id),
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
-- examples 表
CREATE TABLE IF NOT EXISTS examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
);
-- images 表
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  example_id INTEGER NOT NULL,
  image TEXT NOT NULL,
  FOREIGN KEY (example_id) REFERENCES examples(id) ON DELETE CASCADE,
  CONSTRAINT unique_exapmle_id_image UNIQUE (example_id, image)
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

export function selectAllPrompts(): Prompt[] {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const selectAllPromptsSql = `SELECT
prompts.id AS id,
prompts.text AS text,
prompts.translation AS translation,
prompts.description AS description,
prompts.insert_time AS insertTime,
tags.tag AS tag
FROM prompts
LEFT JOIN prompt_tags ON prompts.id = prompt_tags.prompt_id
LEFT JOIN tags ON tags.id = prompt_tags.tag_id;`

  const selectExamplesSql = `SELECT
examples.id AS id,
examples.text AS text
FROM examples
WHERE examples.prompt_id = ?;`

  const selectImagesSql = `SELECT
images.image AS image
FROM images
WHERE images.example_id = ?;`

  try {
    const allItems = db.prepare(selectAllPromptsSql).all() as (Omit<
      Prompt,
      'examples' | 'tags'
    > & { tag: string | null })[]
    const selectExamplesStmt = db.prepare(selectExamplesSql)
    const selectImageStmt = db.prepare(selectImagesSql)

    // Collect all examples for each prompt
    const allExamples: Record<number, PromptExample[]> = {}
    for (const itemID of new Set(allItems.map((item) => item.id))) {
      if (allExamples[itemID] === undefined) {
        allExamples[itemID] = []
      }
      const examples = selectExamplesStmt.all(itemID) as {
        id: number
        text: string
      }[]
      for (const example of examples) {
        const images = selectImageStmt.all(example.id) as { image: string }[]
        allExamples[itemID].push({
          id: example.id,
          text: example.text,
          images: images.map((img) => img.image),
        })
      }
    }

    const promptItems: Record<number, Prompt> = {}

    for (const item of allItems) {
      if (promptItems[item.id] === undefined) {
        promptItems[item.id] = {
          id: item.id,
          text: item.text,
          translation: item.translation,
          description: item.description,
          insertTime: item.insertTime,
          tags: item.tag === null ? [] : [item.tag],
          examples: allExamples[item.id] || [],
        }
      } else {
        if (item.tag !== null) {
          promptItems[item.id].tags.push(item.tag)
        }
      }
    }

    log.info('Select all prompts success')

    return Object.values(promptItems)
  } catch (e) {
    log.error(`Select all prompts error: ${e}`)
    return []
  }
}

export function selectAllTags(): string[] {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const sql = `SELECT tag FROM tags;`
  return db.prepare(sql).all() as string[]
}

export function addPrompt(prompt: Omit<Prompt, 'id'>): number | null {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const insertPromptsStmt = (() => {
    const fields: string[] = []
    const placeholders: string[] = []
    const params: Partial<Prompt> = {}

    fields.push('text')
    placeholders.push('@text')
    params.text = prompt.text

    fields.push('insert_time')
    placeholders.push('@insertTime')
    params.insertTime = prompt.insertTime

    if (prompt.translation !== undefined) {
      fields.push('translation')
      placeholders.push('@translation')
      params.translation = prompt.translation
    }

    if (prompt.description !== undefined) {
      fields.push('description')
      placeholders.push('@description')
      params.description = prompt.description
    }

    const insertPromptsSql = `INSERT INTO prompts (${fields.join(',')}) VALUES (${placeholders.join(',')});`
    return db.prepare(insertPromptsSql)
  })()

  const insertTagsStmt = (() => {
    const sql = `INSERT OR IGNORE INTO tags (tag) VALUES (?);`
    return db.prepare(sql)
  })()

  const insertPromptTagStmt = (() => {
    const sql = `INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?);`
    return db.prepare(sql)
  })()

  let result: number | null = null
  try {
    db.transaction(() => {
      const { lastInsertRowid: promptID } = insertPromptsStmt.run(prompt)
      for (const tag of prompt.tags ?? []) {
        const { lastInsertRowid: tagID } = insertTagsStmt.run(tag)
        insertPromptTagStmt.run(promptID, tagID)
      }
      result = promptID as number
    })()
    log.info(`Add prompt ${prompt.text} success`)
  } catch (e) {
    log.error(`Add prompt ${prompt.text} error: ${e}`)
    return null
  }

  return result
}

export function addTags(tags: string[]): number[] {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const sql = `INSERT OR IGNORE INTO tags (tag) VALUES (?);`
  const insertTagsStmt = db.prepare(sql)
  const result: number[] = []
  try {
    db.transaction(() => {
      for (const tag of tags) {
        result.push(insertTagsStmt.run(tag).lastInsertRowid as number)
      }
    })
    log.info(`Add tags ${tags.join(', ')} success`)
  } catch (e) {
    log.error(`Add tags ${tags.join(', ')} error: ${e}`)
    return []
  }
  return result
}

export function deleteTags(tags: string[]): number {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const sql = `DELETE FROM tags WHERE tag IN (${tags.map(() => '?').join(',')});`
  const deleteTagsStmt = db.prepare(sql)
  let changes = 0
  try {
    changes = deleteTagsStmt.run(...tags).changes
    log.info(`Delete tags ${tags.join(', ')} success`)
  } catch (e) {
    log.error(`Delete tags ${tags.join(', ')} error: ${e}`)
    return changes
  }
  return changes
}

export function updatePrompt(
  prompt: OptionalField<
    Omit<Prompt, 'examples' | 'insertTime'>,
    'text' | 'translation' | 'description' | 'tags'
  >
): boolean {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const updatePromptsStmt = (() => {
    const fields: string[] = []
    const placeholders: string[] = []
    const params: Partial<Prompt> = { id: prompt.id }
    if (prompt.text !== undefined) {
      fields.push('text = @text')
      placeholders.push('@text')
      params.text = prompt.text
    }
    if (prompt.translation !== undefined) {
      fields.push('translation = @translation')
      placeholders.push('@translation')
      params.translation = prompt.translation
    }
    if (prompt.description !== undefined) {
      fields.push('description = @description')
      placeholders.push('@description')
      params.description = prompt.description
    }
    if (fields.length === 0) {
      log.warn('No fields to update in prompt')
      return null
    }
    const updatePromptsSql = `UPDATE prompts SET ${fields.join(', ')} WHERE id = @id;`
    return db.prepare(updatePromptsSql).bind(params)
  })()
  if (updatePromptsStmt === null) {
    return false
  }
  const updatePromptTagsStmt = (() => {
    const sql = `DELETE FROM prompt_tags WHERE prompt_id = ?
;`
    return db.prepare(sql)
  })()
  const insertPromptTagStmt = (() => {
    const sql = `INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?);`
    return db.prepare(sql)
  })()
  try {
    db.transaction(() => {
      updatePromptsStmt.run()
      if (prompt.tags !== undefined) {
        updatePromptTagsStmt.run(prompt.id)
        for (const tag of prompt.tags) {
          const { lastInsertRowid: tagID } = db!
            .prepare('INSERT OR IGNORE INTO tags (tag) VALUES (?)')
            .run(tag)
          insertPromptTagStmt.run(prompt.id, tagID)
        }
      }
    })()
    log.info(`Update prompt ${prompt.id} success`)
  } catch (e) {
    log.error(`Update prompt ${prompt.id} error: ${e}`)
    return false
  }
  return true
}

export function updateTranslation(
  promptID: number,
  translation: string
): boolean {
  return updatePrompt({ id: promptID, translation })
}

export function updateDescription(
  promptID: number,
  description: string
): boolean {
  return updatePrompt({ id: promptID, description })
}

export function addPromptTags(promptID: number, tags: string[]): number {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const selectTagsStmt = (() => {
    const sql = `SELECT id FROM tags WHERE tag = ?;`
    return db.prepare(sql)
  })()
  const insertTagsStmt = (() => {
    const sql = `INSERT INTO tags (tag) VALUES (?);`
    return db.prepare(sql)
  })()
  const insertPromptTagStmt = (() => {
    const sql = `INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?);`
    return db.prepare(sql)
  })()
  let changes = 0
  try {
    db.transaction(() => {
      for (const tag of tags) {
        const tagRow = selectTagsStmt.get(tag) as { id: number } | undefined
        let tagID: number
        if (tagRow) {
          tagID = tagRow.id
        } else {
          const { lastInsertRowid } = insertTagsStmt.run(tag)
          tagID = lastInsertRowid as number
        }
        changes += insertPromptTagStmt.run(promptID, tagID).changes
      }
    })()
    log.info(`Add tags ${tags.join(', ')} to prompt ${promptID} success`)
  } catch (e) {
    log.error(`Add tags ${tags.join(', ')} to prompt ${promptID} error: ${e}`)
    return changes
  }
  return changes
}

export function deletePromptTags(promptID: number, tags: string[]): number {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const deletePromptTagsStmt = (() => {
    const sql = `DELETE FROM prompt_tags WHERE prompt_id = ? AND tag_id IN (
SELECT id FROM tags WHERE tag IN (${tags.map(() => '?').join(',')})
);`
    return db.prepare(sql)
  })()
  let changes = 0
  try {
    changes = deletePromptTagsStmt.run([promptID, ...tags]).changes
    log.info(`Delete tags ${tags.join(', ')} from prompt ${promptID} success`)
  } catch (e) {
    log.error(
      `Delete tags ${tags.join(', ')} from prompt ${promptID} error: ${e}`
    )
    return changes
  }
  return changes
}

export function addExamples(
  promptID: number,
  examples: Omit<PromptExample, 'id'>[]
): number[] {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const insertExamplesStmt = (() => {
    const sql = `INSERT INTO examples (prompt_id, text) VALUES (?, ?);`
    return db.prepare(sql)
  })()
  const insertImagesStmt = (() => {
    const sql = `INSERT INTO images (example_id, image) VALUES (?, ?);`
    return db.prepare(sql)
  })()

  const result: number[] = []
  try {
    db.transaction(() => {
      for (const example of examples) {
        const { lastInsertRowid: exampleID } = insertExamplesStmt.run(
          promptID,
          example.text
        )
        result.push(exampleID as number)
        if (example.images.length !== 0) {
          for (const image of example.images) {
            insertImagesStmt.run(exampleID, image)
          }
        }
      }
    })()
    log.info(`Add examples to prompt ${promptID} success`)
  } catch (e) {
    log.error(`Add examples to prompt ${promptID} error: ${e}`)
    return []
  }
  return result
}

export function deleteExamples(exampleIDs: number[]): number {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const deleteExamplesStmt = (() => {
    const sql = `DELETE FROM examples WHERE id IN (${exampleIDs
      .map(() => '?')
      .join(',')});`
    return db.prepare(sql)
  })()
  let changes = 0
  try {
    changes = deleteExamplesStmt.run(...exampleIDs).changes
    log.info(`Delete examples ${exampleIDs.join(', ')} success`)
  } catch (e) {
    log.error(`Delete examples ${exampleIDs.join(', ')} error: ${e}`)
    return changes
  }
  return changes
}

export function updateExamplePrompt(
  exampleID: number,
  promptText: string
): boolean {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const updateExampleStmt = (() => {
    const sql = `UPDATE examples SET text = ? WHERE id = ?;`
    return db.prepare(sql)
  })()
  try {
    updateExampleStmt.run(promptText, exampleID)
    log.info(`Update example ${exampleID} prompt text to ${promptText} success`)
  } catch (e) {
    log.error(
      `Update example ${exampleID} prompt text to ${promptText} error: ${e}`
    )
    return false
  }
  return true
}

export function addExampleImage(exampleID: number, imageUrl: string): boolean {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const insertImagesStmt = (() => {
    const sql = `INSERT INTO images (example_id, image) VALUES (?, ?);`
    return db.prepare(sql)
  })()
  try {
    insertImagesStmt.run(exampleID, imageUrl)
    log.info(`Add image ${imageUrl} to example ${exampleID} success`)
  } catch (e) {
    log.error(`Add image ${imageUrl} to example ${exampleID} error: ${e}`)
    return false
  }
  return true
}

export function deleteExampleImages(
  exampleID: number,
  imageUrls: string[]
): number {
  if (!checkDBInitialized(db)) {
    throw dbUninitializedError
  }
  const deleteImagesStmt = (() => {
    const sql = `DELETE FROM images WHERE example_id = ? AND image IN (${imageUrls
      .map(() => '?')
      .join(',')});`
    return db.prepare(sql)
  })()
  let changes = 0
  try {
    changes = deleteImagesStmt.run([exampleID, ...imageUrls]).changes
    log.info(
      `Delete images ${imageUrls.join(', ')} from example ${exampleID} success`
    )
  } catch (e) {
    log.error(
      `Delete images ${imageUrls.join(', ')} from example ${exampleID} error: ${e}`
    )
    return changes
  }
  return changes
}
