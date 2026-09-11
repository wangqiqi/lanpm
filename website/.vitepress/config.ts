import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const repo = 'https://github.com/wangqiqi/lanpm'
const branch = 'master'
const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf8')
) as { version: string }
const version = pkg.version

export default defineConfig({
  title: 'LanPM',
  description:
    'Decentralized LAN/VPN collaboration desktop app — FeiQ-speed chat and real PM tooling without shipping IP to the cloud.',
  base: '/lanpm/',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['README.md'],
  head: [
    ['link', { rel: 'icon', href: '/lanpm/logo.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#1677ff' }]
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'LanPM',
      description:
        'Chat like FeiQ. Plan like a PM. Keep everything on your LAN.',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Quick Start', link: '/guide/quick-start' },
          { text: 'Features', link: '/guide/features' },
          {
            text: 'Docs',
            link: `${repo}/tree/${branch}/docs/00_文档导航.md`
          },
          { text: 'v' + version, link: `${repo}/blob/${branch}/CHANGELOG.md` }
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Guide',
              items: [
                { text: 'Quick Start', link: '/guide/quick-start' },
                { text: 'Features', link: '/guide/features' },
                { text: 'Contributing', link: '/guide/contributing' }
              ]
            }
          ]
        },
        socialLinks: [{ icon: 'github', link: repo }],
        footer: {
          message: 'Released under AGPL-3.0-or-later',
          copyright: 'Copyright © LanPM contributors'
        },
        editLink: {
          pattern: `${repo}/edit/${branch}/website/:path`
        }
      }
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'LanPM',
      description: '飞秋般畅聊，项目经理般协作，数据留在你的局域网。',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh/' },
          { text: '快速开始', link: '/zh/guide/quick-start' },
          { text: '核心能力', link: '/zh/guide/features' },
          {
            text: '文档',
            link: `${repo}/tree/${branch}/docs/00_文档导航.md`
          },
          { text: 'v' + version, link: `${repo}/blob/${branch}/CHANGELOG.md` }
        ],
        sidebar: {
          '/zh/guide/': [
            {
              text: '指南',
              items: [
                { text: '快速开始', link: '/zh/guide/quick-start' },
                { text: '核心能力', link: '/zh/guide/features' },
                { text: '参与贡献', link: '/zh/guide/contributing' }
              ]
            }
          ]
        },
        socialLinks: [{ icon: 'github', link: repo }],
        footer: {
          message: '基于 AGPL-3.0-or-later 发布',
          copyright: 'Copyright © LanPM contributors'
        },
        editLink: {
          pattern: `${repo}/edit/${branch}/website/:path`,
          text: '在 GitHub 上编辑此页'
        }
      }
    }
  }
})
