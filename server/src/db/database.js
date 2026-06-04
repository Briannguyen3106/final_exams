import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');
const dbPath = path.join(dataDir, 'exam-schedule.sqlite');

let db;

export function getDb() {
  if (!db) {
    fs.mkdirSync(dataDir, { recursive: true });
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDatabase() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS schedule_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      worksheet_name TEXT NOT NULL,
      header_row_index INTEGER NOT NULL,
      column_mapping_json TEXT NOT NULL,
      session_mapping_json TEXT NOT NULL,
      row_count INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS schedule_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      upload_id INTEGER NOT NULL,
      source_row_number INTEGER NOT NULL,
      school_faculty TEXT,
      class_code TEXT,
      course_code TEXT,
      course_name TEXT,
      notes TEXT,
      course_group TEXT,
      exam_period TEXT,
      week TEXT,
      day_of_week TEXT,
      exam_date_raw TEXT,
      exam_session TEXT,
      student_count TEXT,
      exam_room TEXT,
      exam_room_code TEXT,
      exam_time TEXT,
      exam_datetime TEXT,
      parse_warnings_json TEXT NOT NULL DEFAULT '[]',
      raw_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (upload_id) REFERENCES schedule_uploads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS selected_exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_row_id INTEGER NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (schedule_row_id) REFERENCES schedule_rows(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_schedule_rows_lookup
      ON schedule_rows(course_code, course_name);
    CREATE INDEX IF NOT EXISTS idx_schedule_rows_datetime
      ON schedule_rows(exam_datetime);
  `);
}
