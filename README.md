<p align="center">
  <img src="resources/logo.svg" alt="LanPM" width="96" height="96" />
</p>

<h1 align="center">LanPM</h1>

<p align="center">
  <strong>Chat like FeiQ. Plan like a PM. Keep everything on your LAN.</strong>
</p>

<p align="center">
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="#-screenshots">Screenshots</a> ·
  <a href="#-why-lanpm">Why LanPM</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-documentation">Docs</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.12.0-blue" alt="version" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="platform" />
  <img src="https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20TypeScript-61dafb" alt="stack" />
  <img src="https://img.shields.io/badge/sync-P2P%20%7C%20no%20central%20server-success" alt="sync" />
</p>

---

## ✨ One line

**LanPM** is a **decentralized LAN/VPN collaboration desktop app** — instant messaging, project management (Kanban / task tree / Gantt), and file sharing in **one window**, with **no central server** and **data that stays on your network**.

---

## 📸 Screenshots

<p align="center">
  <img src="assets/chat.png" alt="LanPM chat — member list, messages, and bottom navigation" width="920" />
</p>
<p align="center"><sub><b>Chat</b> — group &amp; DM, members, code highlights, five-tab shell</sub></p>

<table>
  <tr>
    <td width="50%"><img src="assets/kanban.png" alt="KanPM Kanban board with columns and task cards" width="100%" /></td>
    <td width="50%"><img src="assets/gantt.png" alt="LanPM Gantt chart timeline" width="100%" /></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Board</b> — drag columns, family colors, schedule health</sub></td>
    <td align="center"><sub><b>Gantt</b> — timeline, dependencies, milestones</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/task-tree.png" alt="LanPM hierarchical task tree" width="100%" /></td>
    <td width="50%"><img src="assets/file.png" alt="LanPM group file library" width="100%" /></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Task tree</b> — hierarchy, progress, cross-view locate</sub></td>
    <td align="center"><sub><b>Files</b> — uploads, bookmarks, local preview</sub></td>
  </tr>
</table>

<p align="center">
  <img src="assets/export-gantt.png" alt="LanPM Gantt export to PNG or PDF" width="720" />
</p>
<p align="center"><sub><b>Gantt export</b> — PNG / PDF from the chart view</sub></p>

---

## 🎯 Why LanPM

| Pain today | LanPM answer |
|------------|----------------|
| IM tools don’t do real project views | **5 views in one shell**: Chat · Board · Tree · Gantt · Files |
| Project tools need cloud & accounts | **Peer-to-peer in the group** — discover nodes on the LAN, sync in-group |
| Sensitive files forced through SaaS | **Local-first SQLite**, encrypted transport, **LibreOffice preview on device** |
| “FeiQ / Feige” feel but no tasks | **Familiar IM UX** plus boards, dependencies, cockpit for leads |

```
   ┌──────────────────────────────────────────────────────────────┐
   │  IM (FeiQ-style)  +  PM (Board / Tree / Gantt)  +  Files   │
   │              +  Leadership cockpit  +  AI assist (opt-in)   │
   │                                                              │
   │     Core business data syncs inside the LAN — not to cloud   │
   └──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Features

### 💬 Communication that teams actually use

- Group & DM, **@mentions**, read receipts, desktop notifications  
- **Syntax-highlighted code** blocks, attachments, **`/task`** to create work from chat, **`#`** to reference tasks  
- **7-day offline catch-up** for chat messages (paginated batches), **tasks/dependencies**, and **read receipts**  
- Chat history **load-more** beyond the initial 200 messages  
- Failed sends mark **`failed`**, auto-retry with backoff, and a bubble **Retry** action  
- Task/file sync publish failures log in main and show a light toast (offline early-return stays quiet)  
- Task/dependency LWW ties break on `senderDeviceId` (schema v3 `last_writer_device_id`)  
- `/task` from chat rolls back the local task if the chat publish fails  
- LAN **Discover** panel: join groups, ping online members, start DMs  
- TopBar **group switcher**: search by name/pinyin, local pins, sort by recent message activity; chat page no longer duplicates the group title  
- Owner **dissolve** publishes `member_event` so peers clear the group locally and see a toast  
- **Avatars** render in TopBar, chat bubbles, and member lists (with color fallbacks)  

### 📋 Project management — three lenses, one truth

- **Kanban**: drag columns, family colors, FS/SS/FF/SF dependency rules when moving cards  
- **Task tree**: parent/child hierarchy, progress roll-up, cross-view “locate in board/Gantt”  
- **Gantt**: timeline, milestones, dependency lines, cross-view highlight & scroll-to-task  
- **Schedule health** (on track / behind / overdue) consistent across board, tree, Gantt, and cockpit  

### 📁 Files without leaving the building

- Upload/download over the group network, **resumable transfers** & queue (RC)  
- **LibreOffice local preview** for Office docs — preview stays on your machine  
- Bookmarks & in-app WebView for team URLs  

### 🏢 Built for real org shapes

- **Project**, **functional**, and **anonymous** group types — tabs adapt to what each group allows  
- **Leadership cockpit**: portfolio view, reports, API keys for optional AI workflows  
- **Multi-device identity**: one person, many machines; online if any device is up; optional **suffix** for duplicate display names  
- **Light / dark** theme and **zh / en** UI  

### 🔒 Security & sovereignty (RC)

- **AES-GCM** on the wire with ECDH key agreement (see [technical notes](./docs/02_技术实现建议.md))  
- No mandatory cloud; optional AI can use **redacted** outbound calls  
- Automated **verify:m7** regression suite for release confidence  

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 20+ (22 LTS recommended)  
- **npm** 10+  
- **Git**  

### Run in 30 seconds (Linux / macOS / Git Bash)

```bash
git clone <your-repo-url> lanpm && cd lanpm
chmod +x onekey_run.sh    # first time only
./onekey_run.sh start     # dev in background → .lanpm/dev.log
```

Or classic:

```bash
npm install    # postinstall aligns better-sqlite3 to Electron ABI
npm run dev    # Electron dev shell
```

### Windows

| Terminal | Command |
|----------|---------|
| CMD | `onekey_run.bat start` |
| PowerShell | `.\onekey_run.ps1 start` |
| Git Bash / WSL | `./onekey_run.sh start` |

First launch runs a short **setup wizard** (display name, device name, optional department & avatar). Then you land in the main shell — default demo route `#/g/demo-project/chat`.

---

## 🛠️ For contributors

```bash
npm run lint && npm run typecheck
npm run test              # Vitest unit tests
npm run verify:p0         # IPC / i18n / docs guards
npm run verify:m7         # full RC regression (recommended before release)
npm run build             # production Electron build
```

| Topic | Command / note |
|-------|----------------|
| Browser UI stub only | `npm run dev:web` — **Electron is the source of truth** for IPC & SQLite |
| Visual consistency gate | `npm run verify:visual` (see [docs/06](./docs/06_验收与里程碑计划.md) §2.6) |
| One-key menu | `./onekey_run.sh` → start / stop / status / build / check … |

### Browser stub vs Electron

| Scenario | Electron (`npm run dev`) | Browser Vite (`:5173`) |
|----------|----------------------------|-------------------------|
| IPC / SQLite | Main-process API (real or stub) | In-memory `browserLanpmStub` |
| File upload / preview | System dialog + local paths | Limited or mocked |
| Acceptance | ✅ **Source of truth** | UI preview only |

Stub error strings go through i18n (`verify:i18n-en` guard).

---

## 🧱 Tech stack

| Layer | Choice |
|-------|--------|
| Desktop | **Electron** |
| UI | **React 18** + **TypeScript** + **Ant Design 5** |
| State | **Zustand** · styling **CSS Modules** |
| Gantt | **gantt-task-react** |
| Persistence (RC) | **SQLite** (single source of truth) |
| Network (RC) | UDP discovery + TCP/P2P paths; transport encryption |
| Roadmap | Yjs `task_crdt`（**v1.1.0**）· P2P file pull resume（**v1.2.0**）· board tags（**v1.3.0**）· task Awareness Presence（**v1.4.0**）· tag filter/palette（**v1.5.0**）· group tag dict sync（**v1.6.0**）· description text caret（**v1.7.0**）· nav badges mine-open（**v1.8.0**）· weak-hint + force-dict tags（**v1.9.0**）· task calendar（**v1.10.0**）· whiteboard + message↔task（**v1.12.0**）· acceptance checklist（**Unreleased → 1.13.0**）· WebRTC · IndexedDB hot cache (post-RC) |

---

## 📚 Documentation

| Doc | Contents |
|-----|----------|
| [docs/00 — Index](./docs/00_文档导航.md) | Navigation, traceability, decisions |
| [docs/01 — PRD](./docs/01_产品需求文档.md) | Product requirements |
| [docs/02 — Architecture](./docs/02_技术实现建议.md) | System design, networking |
| [docs/04 — UI](./docs/04_交互与UI约定.md) | Layout, themes, components |
| [docs/05 — Testing](./docs/05_测试与联调发布.md) | Vitest, verify:*, release QA |
| [docs/06 — Milestones](./docs/06_验收与里程碑计划.md) | P0 acceptance & RC release gate |

---

## 🗺️ Status & roadmap

| Milestone | Scope |
|-----------|--------|
| **M0–M1** | Scaffold, first-run setup, 5-view shell |
| **M2–M5** | Chat, tasks, files, groups, cockpit |
| **M6–M7** | Real network paths, perf & release gates |

**Current:** `1.12.0` — collaboration whiteboard (7th BottomNav tab, Excalidraw), message↔task A2 loop (one-click create, discuss `task_ref`, linked files), plus prior calendar / tags / Presence. **Unreleased:** task acceptance checklist (P1-3, schema v9). M0–M7 closed in automation; true-device hand tests still deferred (see [acceptance plan](./docs/06_验收与里程碑计划.md) §2.6). Licensed under [AGPL-3.0-or-later](./LICENSE).

**Coming (P1+):** screen share, voice, mind maps, plugin system, mobile PWA — [full list](./docs/06_验收与里程碑计划.md).

---

## 🌐 Languages

- **English** — this file  
- **简体中文** — [README.zh-CN.md](./README.zh-CN.md)

---

<p align="center">
  <sub>Built for teams who want FeiQ-speed chat and real PM tooling — without shipping their IP to someone else's cloud.</sub>
</p>
