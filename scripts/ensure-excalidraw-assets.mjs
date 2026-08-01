#!/usr/bin/env node
/** Copy @excalidraw/excalidraw prod assets for local font loading (CSP font-src 'self'). */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules/@excalidraw/excalidraw/dist/prod')
const dest = join(root, 'src/renderer/public/excalidraw')

if (!existsSync(src)) {
  console.warn('[lanpm] skip excalidraw assets — package not installed')
  process.exit(0)
}

if (existsSync(dest)) rmSync(dest, { recursive: true, force: true })
mkdirSync(dirname(dest), { recursive: true })
cpSync(src, dest, { recursive: true })
console.info('[lanpm] excalidraw assets → src/renderer/public/excalidraw')
