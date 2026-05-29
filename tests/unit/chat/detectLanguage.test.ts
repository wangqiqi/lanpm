import { describe, expect, it } from 'vitest'
import { detectLanguage, normalizeLanguage, toHighlightLanguage } from '@shared/chat/detectLanguage'

describe('normalizeLanguage', () => {
  it('maps common aliases', () => {
    expect(normalizeLanguage('ts')).toBe('typescript')
    expect(normalizeLanguage('py')).toBe('python')
    expect(normalizeLanguage('sh')).toBe('bash')
  })
})

describe('detectLanguage', () => {
  it('respects explicit hint', () => {
    expect(detectLanguage('any code', 'python')).toBe('python')
    expect(detectLanguage('any code', 'auto')).toBe('plaintext')
  })

  it('returns plaintext for empty code', () => {
    expect(detectLanguage('   ')).toBe('plaintext')
  })

  it('detects json', () => {
    expect(detectLanguage('{"a": 1}')).toBe('json')
  })

  it('detects python heuristics', () => {
    expect(detectLanguage('def hello():\n  pass')).toBe('python')
    expect(detectLanguage('#!/usr/bin/env python3\nprint(1)')).toBe('python')
  })

  it('detects html, java, go, rust, bash, sql, cpp, css, typescript, javascript', () => {
    expect(detectLanguage('<!DOCTYPE html><html></html>')).toBe('html')
    expect(detectLanguage('package com.example;\nimport java.util.List;')).toBe('java')
    expect(detectLanguage('func main() {\n  fmt.Println("hi")\n}')).toBe('go')
    expect(detectLanguage('fn main() {\n  println!("hi");\n}')).toBe('rust')
    expect(detectLanguage('#!/bin/bash\necho hi')).toBe('bash')
    expect(detectLanguage('SELECT id FROM users')).toBe('sql')
    expect(detectLanguage('#include <stdio.h>')).toBe('cpp')
    expect(detectLanguage('.box { color: red; }')).toBe('css')
    expect(detectLanguage('interface User { id: string }')).toBe('typescript')
    expect(detectLanguage('const x = 1;\nexport default x;')).toBe('javascript')
  })

  it('falls back to plaintext when json-like but invalid', () => {
    expect(detectLanguage('{ not valid json: true }')).toBe('plaintext')
  })

  it('falls back to plaintext', () => {
    expect(detectLanguage('plain notes')).toBe('plaintext')
  })
})

describe('toHighlightLanguage', () => {
  it('maps html to xml for highlight.js', () => {
    expect(toHighlightLanguage('html')).toBe('xml')
  })
})
