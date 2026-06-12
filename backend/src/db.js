import Database from "better-sqlite3";
import { DB_PATH } from "./config.js";

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id            TEXT PRIMARY KEY,
    slug          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    niche         TEXT,
    brief         TEXT,
    session_id    TEXT,
    model         TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'interviewing',
    project_type  TEXT NOT NULL DEFAULT 'static',
    custom_palette TEXT,
    stack         TEXT,
    logo_path     TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
`);

// Idempotent migration: add v2 columns to pre-existing v1 tables.
const existingCols = new Set(db.prepare(`PRAGMA table_info(projects)`).all().map((c) => c.name));
for (const [col, ddl] of [
  ["project_type", "ALTER TABLE projects ADD COLUMN project_type TEXT NOT NULL DEFAULT 'static'"],
  ["custom_palette", "ALTER TABLE projects ADD COLUMN custom_palette TEXT"],
  ["stack", "ALTER TABLE projects ADD COLUMN stack TEXT"],
  ["logo_path", "ALTER TABLE projects ADD COLUMN logo_path TEXT"],
]) {
  if (!existingCols.has(col)) db.exec(ddl);
}

const statements = {
  insert: db.prepare(`
    INSERT INTO projects (id, slug, name, niche, brief, session_id, model, status, project_type, custom_palette, stack, logo_path, created_at, updated_at)
    VALUES (@id, @slug, @name, @niche, @brief, @session_id, @model, @status, @project_type, @custom_palette, @stack, @logo_path, @created_at, @updated_at)
  `),
  getById: db.prepare(`SELECT * FROM projects WHERE id = ?`),
  getBySlug: db.prepare(`SELECT * FROM projects WHERE slug = ?`),
  list: db.prepare(`SELECT * FROM projects ORDER BY updated_at DESC`),
  delete: db.prepare(`DELETE FROM projects WHERE id = ?`),
  update: db.prepare(`
    UPDATE projects
    SET name = @name, niche = @niche, brief = @brief, session_id = @session_id,
        model = @model, status = @status, project_type = @project_type,
        custom_palette = @custom_palette, stack = @stack, logo_path = @logo_path,
        updated_at = @updated_at
    WHERE id = @id
  `),
};

/** @param {object} project */
export function insertProject(project) {
  statements.insert.run(project);
  return project;
}

/** @param {string} id */
export function getProject(id) {
  return statements.getById.get(id) ?? null;
}

/** @param {string} slug */
export function getProjectBySlug(slug) {
  return statements.getBySlug.get(slug) ?? null;
}

export function listProjects() {
  return statements.list.all();
}

/** @param {object} project */
export function updateProject(project) {
  statements.update.run(project);
  return project;
}

/** @param {string} id @returns {boolean} whether a row was removed */
export function deleteProject(id) {
  return statements.delete.run(id).changes > 0;
}

export default db;
