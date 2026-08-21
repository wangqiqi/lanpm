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

CREATE TABLE group_join_requests (
  request_id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  applicant_user_id TEXT NOT NULL,
  applicant_display_name TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  decided_at TEXT,
  decided_by TEXT
);

CREATE INDEX idx_group_join_requests_owner ON group_join_requests(owner_user_id, status);
CREATE INDEX idx_group_join_requests_applicant ON group_join_requests(applicant_user_id, group_id, status);

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
  tags_json TEXT NOT NULL DEFAULT '[]',
  source_msg_id TEXT,
  linked_file_ids_json TEXT NOT NULL DEFAULT '[]',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  story_points INTEGER,
  start_date TEXT,
  end_date TEXT,
  milestone INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  last_writer_device_id TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_tasks_group_parent ON tasks(group_id, parent_task_id);
CREATE INDEX idx_tasks_group_status ON tasks(group_id, status) WHERE deleted_at IS NULL;

CREATE TABLE task_dependencies (
  from_task_id TEXT NOT NULL,
  to_task_id TEXT NOT NULL,
  dep_type TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  last_writer_device_id TEXT NOT NULL DEFAULT '',
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
  user_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  api_key_enc TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  data_policy TEXT NOT NULL DEFAULT 'desensitized-only',
  patrol_enabled INTEGER NOT NULL DEFAULT 1,
  patrol_interval_hours INTEGER NOT NULL DEFAULT 24
);

-- 同步时钟 / 去重
CREATE TABLE sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 弱网 publish 失败持久队列（B4 / TASK-300）
CREATE TABLE sync_outbox (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  group_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  envelope_json TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (channel, dedupe_key)
);
CREATE INDEX idx_sync_outbox_due ON sync_outbox(next_attempt_at);

-- 群级 Yjs 文档快照（task:{groupId}）
CREATE TABLE task_crdt_docs (
  group_id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL,
  update_blob BLOB NOT NULL,
  updated_at TEXT NOT NULL
);

-- 群标签字典（色板同步，TASK-190）
CREATE TABLE group_tag_meta (
  group_id TEXT NOT NULL,
  tag_key TEXT NOT NULL,
  label TEXT,
  color TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by_user_id TEXT,
  PRIMARY KEY (group_id, tag_key)
);

-- 群协作白板场景（一群一板，TASK-226）
CREATE TABLE whiteboard_scenes (
  group_id TEXT PRIMARY KEY,
  scene_json TEXT NOT NULL,
  linked_task_id TEXT,
  updated_at TEXT NOT NULL
);

-- 群级白板 Yjs 文档快照（whiteboard:{groupId}，TASK-259）
CREATE TABLE whiteboard_crdt_docs (
  group_id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL,
  update_blob BLOB NOT NULL,
  updated_at TEXT NOT NULL
);

-- 任务验收清单（P1-3 / TASK-235）：一任务一份清单
CREATE TABLE task_checklists (
  checklist_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  group_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE task_checklist_items (
  item_id TEXT PRIMARY KEY,
  checklist_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  linked_subtask_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_checklist_items_task ON task_checklist_items(task_id);
CREATE INDEX idx_checklist_items_checklist ON task_checklist_items(checklist_id);

-- 群思维导图文档索引（SPRINT-23 · TASK-2301）
CREATE TABLE mindmap_documents (
  doc_id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  title TEXT NOT NULL,
  file_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);
CREATE INDEX idx_mindmap_documents_group ON mindmap_documents(group_id, updated_at);

-- 脑图文档 Yjs 快照（mindmap:{docId}，SPRINT-26）
CREATE TABLE mindmap_crdt_docs (
  doc_id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  wired_doc_id TEXT NOT NULL,
  update_blob BLOB NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_mindmap_crdt_docs_group ON mindmap_crdt_docs(group_id);

-- AI 助手会话（本机个人 · 不同步 P2P）
CREATE TABLE ai_threads (
  thread_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  group_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  context_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_ai_threads_user ON ai_threads(user_id, updated_at DESC);
CREATE INDEX idx_ai_threads_user_group ON ai_threads(user_id, group_id);

CREATE TABLE ai_messages (
  message_id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES ai_threads(thread_id)
);
CREATE INDEX idx_ai_messages_thread ON ai_messages(thread_id, created_at);

-- AI 定时巡检记录（本机 · 不同步 P2P）
CREATE TABLE ai_patrol_runs (
  run_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  finding_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL,
  used_external_ai INTEGER NOT NULL DEFAULT 0,
  findings_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX idx_ai_patrol_runs_started ON ai_patrol_runs(started_at DESC);

-- AI 流水线运行记录（本机 · 不同步 P2P）
CREATE TABLE ai_pipeline_runs (
  run_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  preset_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  steps_json TEXT NOT NULL DEFAULT '[]',
  final_markdown TEXT,
  used_external_ai INTEGER NOT NULL DEFAULT 0,
  degraded INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_ai_pipeline_runs_user_started ON ai_pipeline_runs(user_id, started_at DESC);

-- 付费排程：每群一版甘特基线（再冻覆盖）
CREATE TABLE schedule_baselines (
  group_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  frozen_at TEXT NOT NULL,
  PRIMARY KEY (group_id, task_id)
);
CREATE INDEX idx_schedule_baselines_group ON schedule_baselines(group_id);
