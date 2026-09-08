#!/usr/bin/env node
/**
 * Copy repo assets into website/public for VitePress (cross-platform; no symlinks).
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'website/public')
const assetsSrc = join(root, 'assets')
const logoSrc = join(root, 'resources/logo.svg')
const assetsDest = join(publicDir, 'assets')
const logoDest = join(publicDir, 'logo.svg')

mkdirSync(publicDir, { recursive: true })

if (existsSync(assetsDest)) rmSync(assetsDest, { recursive: true, force: true })
cpSync(assetsSrc, assetsDest, { recursive: true })
cpSync(logoSrc, logoDest)

console.log('website/public prepared (assets + logo.svg)')
