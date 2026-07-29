#!/usr/bin/env node
/**
 * Regenerate raster icons from resources/icon.svg (pure Node — no ImageMagick).
 * Usage: node scripts/build-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import toIco from 'to-ico'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const res = join(root, 'resources')
const publicDir = join(root, 'src/renderer/public')

const ICO_SIZES = [256, 128, 64, 48, 32, 16]

function renderPng(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size }
  })
  return resvg.render().asPng()
}

const svgPath = join(res, 'icon.svg')
const svg = readFileSync(svgPath, 'utf8')

const png1024 = renderPng(svg, 1024)
writeFileSync(join(res, 'icon.png'), png1024)

const icoBuffers = ICO_SIZES.map((size) => renderPng(svg, size))
const ico = await toIco(icoBuffers)
writeFileSync(join(res, 'icon.ico'), ico)

mkdirSync(publicDir, { recursive: true })
copyFileSync(svgPath, join(publicDir, 'favicon.svg'))
writeFileSync(join(publicDir, 'favicon.png'), renderPng(svg, 32))

console.log('Icons written: resources/icon.png, resources/icon.ico, src/renderer/public/favicon.*')
