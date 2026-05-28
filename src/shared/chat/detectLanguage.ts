/** Supported code languages — docs/01 §6.4 */
export const CODE_LANGUAGE_OPTIONS = [
  'auto',
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'rust',
  'html',
  'css',
  'json',
  'bash',
  'sql',
  'cpp',
  'plaintext'
] as const

export type CodeLanguageOption = (typeof CODE_LANGUAGE_OPTIONS)[number]

const HLJS_ALIASES: Record<string, string> = {
  html: 'xml',
  ts: 'typescript',
  js: 'javascript',
  py: 'python',
  sh: 'bash',
  shell: 'bash'
}

export function normalizeLanguage(lang: string): string {
  const key = lang.trim().toLowerCase()
  return HLJS_ALIASES[key] ?? key
}

/** Heuristic language detection when hint is `auto` or omitted */
export function detectLanguage(code: string, hint?: string): string {
  if (hint && hint !== 'auto') {
    return normalizeLanguage(hint)
  }

  const trimmed = code.trim()
  if (!trimmed) return 'plaintext'

  if (
    (trimmed.startsWith('{') || trimmed.startsWith('[')) &&
    /["']\w+["']\s*:/.test(trimmed)
  ) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      /* not json */
    }
  }

  if (/<!DOCTYPE html|<html[\s>]/i.test(trimmed) || /<\/\w+>/.test(trimmed)) return 'html'
  if (/^\s*#!\/usr\/bin\/env python|^\s*def \w+\(|^\s*from \w+ import/.test(trimmed)) {
    return 'python'
  }
  if (/^\s*(package |import java\.)/.test(trimmed)) return 'java'
  if (/^\s*(func \w+|package main)/.test(trimmed)) return 'go'
  if (/^\s*(fn \w+|use std::)/.test(trimmed)) return 'rust'
  if (/^\s*#!\/bin\/(ba)?sh/.test(trimmed)) return 'bash'
  if (/^\s*(SELECT|INSERT INTO|CREATE TABLE)/i.test(trimmed)) return 'sql'
  if (/^\s*#include\s*[<"]/.test(trimmed)) return 'cpp'
  if (/^\s*[\w.#-]+\s*\{/.test(trimmed) && trimmed.includes(':')) return 'css'
  if (/:\s*(string|number|boolean|void)\b|interface \w+/.test(trimmed)) return 'typescript'
  if (/^\s*(const|let|var|function|import|export|console\.)/.test(trimmed)) {
    return 'javascript'
  }

  return 'plaintext'
}

/** Map stored language to highlight.js registered name */
export function toHighlightLanguage(language: string): string {
  const normalized = normalizeLanguage(language)
  if (normalized === 'html') return 'xml'
  return normalized
}
