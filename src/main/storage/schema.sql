-- SQLite DDL — aligned with docs/04 §11

-- 用户与设备
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  base_name TEXT NOT NULL,
  suffix TEXT,
  department TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE devices (
  device_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  device_name TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

-- 群组
CREATE TABLE groups (
  group_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  auto_discover INTEGER NOT NULL DEFAULT 1,
  project_meta_json TEXT
);

CREATE TABLE group_members (
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  display_alias TEXT,
  PRIMARY KEY (group_id, user_id)
);

-- 聊天
CREATE TABLE messages (
  msg_id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL,
  sender_device_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content_json TEXT NOT NULL,
  lamport_ts INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  delivery_status TEXT NOT NULL
);
CREATE INDEX idx_messages_group_lamport ON messages(group_id, lamport_ts);

CREATE TABLE read_receipts (
  msg_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  reader_user_id TEXT NOT NULL,
  reader_device_id TEXT NOT NULL,
  read_at TEXT NOT NULL,
  PRIMARY KEY (msg_id, reader_user_id)
);

-- 任务
CREATE TABLE tasks (
  task_id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  parent_task_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  other_reason TEXT,
  priority TEXT NOT NULL,
  assignee_user_id TEXT,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  milestone INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_tasks_group_parent ON tasks(group_id, parent_task_id);
CREATE INDEX idx_tasks_group_status ON tasks(group_id, status) WHERE deleted_at IS NULL;

CREATE TABLE task_dependencies (
  from_task_id TEXT NOT NULL,
  to_task_id TEXT NOT NULL,
  dep_type TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY (from_task_id, to_task_id)
);

-- 文件
CREATE TABLE files (
  file_id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  ext TEXT NOT NULL,
  category TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime_type TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  preview_status TEXT NOT NULL,
  preview_path TEXT,
  is_bookmark INTEGER NOT NULL DEFAULT 0,
  bookmark_url TEXT,
  bookmark_title TEXT,
  folder_id TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE file_transfers (
  transfer_id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  from_device_id TEXT NOT NULL,
  to_device_id TEXT NOT NULL,
  status TEXT NOT NULL,
  total_bytes INTEGER NOT NULL,
  transferred_bytes INTEGER NOT NULL,
  chunk_size INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  error_message TEXT
);

-- AI 配置（本地加密字段由应用层处理）
CREATE INDEX idx_file_transfers_group ON file_transfers(group_id, status);

CREATE TABLE ai_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  provider TEXT NOT NULL,
  api_key_enc TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  data_policy TEXT NOT NULL DEFAULT 'desensitized-only'
);

-- 同步时钟 / 去重
CREATE TABLE sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
