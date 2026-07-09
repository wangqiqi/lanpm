/**
 * 集成/静态测试临时目录：落在仓库 `.lanpm/tmp/`（gitignore），避免堆满 /tmp。
 * 优先配合 try/finally + rmLanpmTemp；进程异常退出时可手动 `rm -rf .lanpm/tmp`。
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from './projectRoot.ts'

const TMP_ROOT = join(projectRoot, '.lanpm', 'tmp')

/** 创建唯一临时目录（前缀如 `lanpm-chat-`） */
export function mkLanpmTemp(prefix: string): string {
  mkdirSync(TMP_ROOT, { recursive: true })
  const safe = prefix.endsWith('-') ? prefix : `${prefix}-`
  return mkdtempSync(join(TMP_ROOT, safe))
}

export function rmLanpmTemp(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
}

/** 同步：跑完必删 */
export function withLanpmTemp(prefix: string, fn: (dir: string) => void): void {
  const dir = mkLanpmTemp(prefix)
  try {
    fn(dir)
  } finally {
    rmLanpmTemp(dir)
  }
}

/** Stub 总线目录（可复用；测前可清空） */
export function stubBusDir(): string {
  const dir = join(projectRoot, '.lanpm', 'stub-bus')
  mkdirSync(dir, { recursive: true })
  return dir
}
