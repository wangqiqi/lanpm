/**
 * Build / pack / E2E artifact paths (SSOT).
 * Override root: LANPM_ARTIFACT_DIR (relative to repo root or absolute).
 */
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Repo root (parent of scripts/). */
export function repoRoot(fromDir = __dirname) {
  return join(fromDir, '..')
}

export function artifactRoot(root = repoRoot()) {
  const env = process.env.LANPM_ARTIFACT_DIR?.trim()
  if (env) return resolve(root, env)
  return join(root, '.lanpm', 'artifact')
}

export function viteOutDir(root = repoRoot()) {
  return join(artifactRoot(root), 'out')
}

export function viteOutMain(root = repoRoot()) {
  return join(viteOutDir(root), 'main')
}

export function viteOutPreload(root = repoRoot()) {
  return join(viteOutDir(root), 'preload')
}

export function viteOutRenderer(root = repoRoot()) {
  return join(viteOutDir(root), 'renderer')
}

export function viteOutResources(root = repoRoot()) {
  return join(viteOutDir(root), 'resources')
}

export function builderDistDir(root = repoRoot()) {
  return join(artifactRoot(root), 'dist')
}

export function playwrightTestResultsDir(root = repoRoot()) {
  return join(artifactRoot(root), 'test-results')
}

/** package.json `main` entry (posix, relative to repo root). */
export const PACKAGE_MAIN_REL = '.lanpm/artifact/out/main/index.js'

export function packageMainAbs(root = repoRoot()) {
  return join(root, PACKAGE_MAIN_REL)
}
