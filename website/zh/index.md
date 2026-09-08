---
layout: home

hero:
  name: LanPM
  text: 飞秋般畅聊，项目经理般协作
  tagline: 分布式局域网 / VPN 协作桌面客户端 — 即时通讯与项目管理装进同一 Electron 壳，群组内 P2P 同步，不绑公有云。
  image:
    src: /logo.svg
    alt: LanPM
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/quick-start
    - theme: alt
      text: GitHub
      link: https://github.com/wangqiqi/lanpm

features:
  - icon: 💬
    title: 八大视图，一个壳
    details: 聊天、看板、任务树、甘特、日历、白板、文件、驾驶舱 — 不必在 IM 与项目管理工具之间来回切换。
  - icon: 🔗
    title: 群组内 P2P
    details: 局域网发现、传输加密、库文件可选用通行词加密。日常协作无需中心服务器。
  - icon: 🛡️
    title: 安全优先
    details: TCP 链路 AES-GCM、配对后 TOFU 公钥钉扎、本地 SQLite、LibreOffice 本地预览。
  - icon: 🧩
    title: 官方插件
    details: 会议、排程、敏捷、周报、备份、脑图、运维等 — 在不 fork 主应用的前提下扩展能力。
  - icon: 🌐
    title: 中 / 英双语
    details: 界面与文档双语，亮暗主题适配长时间局域网协作。
  - icon: 🖥️
    title: 跨平台桌面
    details: Windows、macOS、Linux（x64 / arm64）安装包。Electron + React + TypeScript，可本地验收。
---

## 产品预览

<div class="lanpm-screenshot-grid">

<figure>
  <img src="/assets/chat.png" alt="LanPM 聊天视图" />
  <figcaption><strong>聊天</strong> — 群聊 / 私聊、成员、代码高亮</figcaption>
</figure>

<figure>
  <img src="/assets/kanban.png" alt="看板" />
  <figcaption><strong>看板</strong> — 拖拽流转、标签、工期健康度</figcaption>
</figure>

<figure>
  <img src="/assets/gantt.png" alt="甘特图" />
  <figcaption><strong>甘特</strong> — 时间轴、依赖、多格式导出</figcaption>
</figure>

<figure>
  <img src="/assets/cockpit.png" alt="领导驾驶舱" />
  <figcaption><strong>驾驶舱</strong> — 跨群需关注与项目健康度</figcaption>
</figure>

</div>

## 为什么选 LanPM

| 常见痛点 | LanPM 的做法 |
|----------|----------------|
| 聊天工具做不了正经项目视图 | **八大视图** 同一桌面壳 |
| 项目管理强依赖云端账号 | **群组内 P2P**，局域网发现 |
| 敏感文件只能走 SaaS | **本地 SQLite**、传输加密、本地预览 |
| 飞秋好用但没有任务 | **保留 IM 体验** + 看板、日历、白板 |

[查看完整能力矩阵 →](/zh/guide/features) · [工程文档（GitHub）→](https://github.com/wangqiqi/lanpm/tree/master/docs)
