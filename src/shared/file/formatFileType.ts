import type { FileCategory, FileMeta } from './types'

const EXT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  doc: 'Word',
  docx: 'Word',
  xls: 'Excel',
  xlsx: 'Excel',
  ppt: 'PowerPoint',
  pptx: 'PowerPoint',
  odt: 'OpenDocument',
  ods: 'Spreadsheet',
  odp: 'Presentation',
  txt: 'Text',
  md: 'Markdown',
  markdown: 'Markdown',
  json: 'JSON',
  jsonc: 'JSON',
  json5: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  xml: 'XML',
  xsd: 'XML Schema',
  xsl: 'XSL',
  xslt: 'XSLT',
  ini: 'INI',
  conf: 'Config',
  cfg: 'Config',
  config: 'Config',
  cnf: 'Config',
  toml: 'TOML',
  properties: 'Properties',
  env: 'Environment',
  csv: 'CSV',
  tsv: 'TSV',
  log: 'Log',
  sql: 'SQL',
  sh: 'Shell',
  bash: 'Shell',
  zsh: 'Shell',
  fish: 'Shell',
  ps1: 'PowerShell',
  bat: 'Batch',
  cmd: 'Batch',
  js: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TSX',
  jsx: 'JSX',
  py: 'Python',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  h: 'Header',
  cs: 'C#',
  swift: 'Swift',
  kt: 'Kotlin',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  vue: 'Vue',
  svelte: 'Svelte',
  tf: 'Terraform',
  hcl: 'HCL',
  graphql: 'GraphQL',
  gql: 'GraphQL',
  lua: 'Lua',
  rb: 'Ruby',
  php: 'PHP',
  pl: 'Perl',
  png: 'PNG',
  jpg: 'JPEG',
  jpeg: 'JPEG',
  gif: 'GIF',
  webp: 'WebP',
  svg: 'SVG',
  mp4: 'MP4',
  webm: 'WebM',
  mov: 'MOV',
  avi: 'AVI',
  url: 'URL',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
  containerfile: 'Containerfile',
  gitignore: 'Git Ignore',
  dockerignore: 'Docker Ignore',
  editorconfig: 'EditorConfig'
}

const BASENAME_LABELS: Record<string, string> = {
  dockerfile: 'Dockerfile',
  containerfile: 'Containerfile',
  makefile: 'Makefile',
  gemfile: 'Gemfile',
  rakefile: 'Rakefile',
  procfile: 'Procfile',
  vagrantfile: 'Vagrantfile',
  brewfile: 'Brewfile',
  jenkinsfile: 'Jenkinsfile',
  '.env': '.env',
  '.gitignore': '.gitignore',
  '.dockerignore': '.dockerignore',
  '.editorconfig': '.editorconfig',
  '.npmrc': '.npmrc',
  '.yarnrc': '.yarnrc'
}

export function formatFileTypeLabel(
  file: Pick<FileMeta, 'name' | 'ext' | 'category' | 'isBookmark'>,
  categoryLabels: Record<FileCategory, string>
): string {
  if (file.isBookmark) return categoryLabels.bookmark

  const base = file.name.toLowerCase()
  if (BASENAME_LABELS[base]) return BASENAME_LABELS[base]
  if (base.startsWith('.env.')) return '.env'

  const ext = file.ext.toLowerCase()
  if (ext !== 'bin' && EXT_LABELS[ext]) return EXT_LABELS[ext]
  if (ext && ext !== 'bin') return ext.toUpperCase()

  return categoryLabels[file.category] ?? categoryLabels.other
}
