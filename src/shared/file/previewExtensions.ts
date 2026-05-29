/** 内联文本预览（UTF-8 `<pre>`）；配置文件、脚本、日志等 */
export const TEXT_PREVIEW_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'jsonc',
  'json5',
  'yaml',
  'yml',
  'xml',
  'xsd',
  'xsl',
  'xslt',
  'ini',
  'conf',
  'cfg',
  'config',
  'cnf',
  'toml',
  'properties',
  'env',
  'csv',
  'tsv',
  'log',
  'sh',
  'bash',
  'zsh',
  'fish',
  'ps1',
  'bat',
  'cmd',
  'sql',
  'graphql',
  'gql',
  'lua',
  'rb',
  'php',
  'pl',
  'pm',
  'tf',
  'hcl',
  'reg',
  'inf',
  'htaccess',
  'gitignore',
  'dockerignore',
  'editorconfig',
  'npmrc',
  'yarnrc',
  'prettierrc',
  'eslintrc',
  'babelrc',
  'dockerfile',
  'makefile',
  'containerfile'
])

/** 无扩展名或 ext=bin 时按文件名识别为文本 */
const TEXT_PREVIEW_BASENAMES = new Set([
  'dockerfile',
  'containerfile',
  'makefile',
  'gemfile',
  'rakefile',
  'procfile',
  'vagrantfile',
  'brewfile',
  'jenkinsfile'
])

const TEXT_PREVIEW_DOTFILES = new Set([
  '.env',
  '.env.example',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.test',
  '.gitignore',
  '.dockerignore',
  '.editorconfig',
  '.npmrc',
  '.yarnrc',
  '.prettierrc',
  '.eslintrc',
  '.babelrc',
  '.htaccess'
])

export const IMAGE_INLINE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg'
])

export const VIDEO_INLINE_EXTENSIONS = new Set(['mp4', 'webm'])

export const PDF_INLINE_EXTENSION = 'pdf'

export const TEXT_PREVIEW_MAX_BYTES = 512 * 1024

export function isTextPreviewFile(name: string, ext: string): boolean {
  const e = ext.toLowerCase()
  if (TEXT_PREVIEW_EXTENSIONS.has(e)) return true

  const lower = name.toLowerCase()
  if (TEXT_PREVIEW_BASENAMES.has(lower)) return true
  if (TEXT_PREVIEW_DOTFILES.has(lower)) return true
  if (lower.startsWith('.env.')) return true

  return false
}

export function supportsInlinePreview(meta: { name: string; ext: string }): boolean {
  const e = meta.ext.toLowerCase()
  if (IMAGE_INLINE_EXTENSIONS.has(e)) return true
  if (VIDEO_INLINE_EXTENSIONS.has(e)) return true
  if (e === PDF_INLINE_EXTENSION) return true
  return isTextPreviewFile(meta.name, meta.ext)
}

/** 可直接标记 preview ready（无需 LibreOffice 转换） */
export function isDirectPreviewReady(meta: { name: string; ext: string }): boolean {
  return supportsInlinePreview(meta)
}
