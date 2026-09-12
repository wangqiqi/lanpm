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
  lang: 'zh-CN',
  description: '飞秋般畅聊，项目经理般协作，数据留在你的局域网。',
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
      label: '简体中文',
      lang: 'zh-CN',
      title: 'LanPM',
      description: '飞秋般畅聊，项目经理般协作，数据留在你的局域网。',
      themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '快速开始', link: '/guide/quick-start' },
          { text: '核心能力', link: '/guide/features' },
          { text: '参与贡献', link: '/guide/contributing' },
          { text: 'v' + version, link: `${repo}/blob/${branch}/CHANGELOG.md` }
        ],
        sidebar: {
          '/guide/': [
            {
              text: '指南',
              items: [
                { text: '快速开始', link: '/guide/quick-start' },
                { text: '核心能力', link: '/guide/features' },
                { text: '参与贡献', link: '/guide/contributing' }
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
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'LanPM',
      description: 'Chat like FeiQ. Plan like a PM. Keep everything on your LAN.',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Quick Start', link: '/en/guide/quick-start' },
          { text: 'Features', link: '/en/guide/features' },
          { text: 'Contributing', link: '/en/guide/contributing' },
          { text: 'v' + version, link: `${repo}/blob/${branch}/CHANGELOG.md` }
        ],
        sidebar: {
          '/en/guide/': [
            {
              text: 'Guide',
              items: [
                { text: 'Quick Start', link: '/en/guide/quick-start' },
                { text: 'Features', link: '/en/guide/features' },
                { text: 'Contributing', link: '/en/guide/contributing' }
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
    }
  }
})
