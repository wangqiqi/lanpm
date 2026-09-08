---
layout: home

hero:
  name: LanPM
  text: Chat like FeiQ. Plan like a PM.
  tagline: Decentralized LAN/VPN collaboration — instant messaging and project management in one Electron shell, with peer-to-peer sync and no mandatory cloud.
  image:
    src: /logo.svg
    alt: LanPM
  actions:
    - theme: brand
      text: Quick Start
      link: /guide/quick-start
    - theme: alt
      text: GitHub
      link: https://github.com/wangqiqi/lanpm

features:
  - icon: 💬
    title: Eight views, one shell
    details: Chat, Board, Tree, Gantt, Calendar, Whiteboard, Files, and Leadership Cockpit — without switching between IM and PM tools.
  - icon: 🔗
    title: P2P inside the group
    details: LAN discovery, encrypted transport, optional passphrase at rest. No central server required for day-to-day collaboration.
  - icon: 🛡️
    title: Security by design
    details: AES-GCM on TCP links, TOFU key pinning after pairing, local SQLite with optional encryption, LibreOffice preview on device.
  - icon: 🧩
    title: Official plugins
    details: Meeting, schedule, agile, weekly reports, backup, mind map, and ops — extend the core without forking the app.
  - icon: 🌐
    title: zh / en
    details: Bilingual UI and docs. Light and dark themes for long sessions on the LAN.
  - icon: 🖥️
    title: Cross-platform desktop
    details: Windows, macOS, and Linux packages (x64 / arm64). Electron + React + TypeScript stack you can verify locally.
---

## Product preview

<div class="lanpm-screenshot-grid">

<figure>
  <img src="/assets/chat.png" alt="LanPM chat view" />
  <figcaption><strong>Chat</strong> — groups, DMs, members, code highlights</figcaption>
</figure>

<figure>
  <img src="/assets/kanban.png" alt="Kanban board" />
  <figcaption><strong>Board</strong> — drag columns, tags, schedule health</figcaption>
</figure>

<figure>
  <img src="/assets/gantt.png" alt="Gantt chart" />
  <figcaption><strong>Gantt</strong> — timeline, dependencies, exports</figcaption>
</figure>

<figure>
  <img src="/assets/cockpit.png" alt="Leadership cockpit" />
  <figcaption><strong>Cockpit</strong> — cross-group attention and health</figcaption>
</figure>

</div>

## Why teams pick LanPM

| Pain today | LanPM answer |
|------------|--------------|
| IM tools don’t do real project views | **8 views** in one desktop shell |
| Project tools need cloud accounts | **P2P in the group** — LAN discovery |
| Sensitive files forced through SaaS | **Local SQLite**, encrypted transport, on-device preview |
| FeiQ / Feige feel but no tasks | **Familiar IM UX** + boards, calendar, whiteboard |

[See full feature matrix →](/guide/features) · [Engineering docs on GitHub →](https://github.com/wangqiqi/lanpm/tree/master/docs)
