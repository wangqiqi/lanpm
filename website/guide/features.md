# Features

LanPM combines **FeiQ-speed chat** with **real project-management views**, all synced **peer-to-peer inside the group**.

## Communication

- Groups & DM, @mentions, code blocks
- `/task` and `#` references, message ↔ task linking
- Offline catch-up (chat, tasks, receipts, file library index)
- Discovery & VPN seeds
- Optional **meeting plugin**: Lite mesh vs Pro LiveKit

## Project management

- Kanban, task tree, Gantt, calendar
- FS / SS / FF / SF dependencies, tags, acceptance checklist
- Presence and schedule health
- Optional **schedule plugin** (`lanpm.schedule`): critical path, frozen baseline
- Optional **agile plugin** (`lanpm.agile`): story points, burndown, WIP hints, velocity chart

## Collaboration

- Excalidraw whiteboard + mind maps (Yjs CRDT over P2P)
- Group files, LibreOffice preview, resumable transfers

## Organization & UX

- Project / functional / anonymous groups
- Leadership cockpit
- Light / dark themes, **zh / en**
- Optional **weekly plugin** (`lanpm.weekly`): Markdown exports
- Optional **backup plugin** (`lanpm.backup`, free, on by default): encrypted `.lanpm-bundle`

## Security

| Layer | Detail |
|-------|--------|
| Transport | AES-GCM on TCP links |
| Identity | ECDH public key pinned to `deviceId` after pairing / first TOFU |
| Storage | Local-first SQLite, optional passphrase encryption at rest |
| Preview | LibreOffice on device — files stay on your LAN |

## Official plugins

See the [plugins README](https://github.com/wangqiqi/lanpm/tree/master/plugins) for layout and packaging.

## Full specifications

Product and engineering SSOT lives in the repo:

- [docs/00 — Index](https://github.com/wangqiqi/lanpm/blob/master/docs/00_文档导航.md)
- [PRD](https://github.com/wangqiqi/lanpm/blob/master/docs/01_产品需求文档.md)
- [ROADMAP](https://github.com/wangqiqi/lanpm/blob/master/docs/06_ROADMAP.md)
- [CHANGELOG](https://github.com/wangqiqi/lanpm/blob/master/CHANGELOG.md)
