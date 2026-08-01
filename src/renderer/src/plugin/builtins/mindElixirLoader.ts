/**
 * Optional mind-elixir — Vite alias (electron.vite.config) when plugin subpackage is installed.
 * Plain dynamic import so dev/build resolve plugins/lanpm.mindmap/node_modules/mind-elixir.
 */

export type MindElixirData = {
  nodeData: { id: string; topic: string; children?: MindElixirData['nodeData'][] }
  linkData?: Record<string, unknown>
}

export type MindElixirInstance = {
  init: (data?: MindElixirData) => void
  refresh: (data: MindElixirData) => void
  destroy?: () => void
}

export type MindElixirConstructor = new (options: {
  el: HTMLElement
  direction?: number
  draggable?: boolean
  contextMenu?: boolean
  toolBar?: boolean
  nodeMenu?: boolean
  keypress?: boolean
}) => MindElixirInstance

export type MindElixirModule = {
  default: MindElixirConstructor & {
    LEFT: number
    RIGHT: number
    SIDE: number
    new: (topic: string) => MindElixirData
  }
}

let cached: MindElixirModule | null | undefined
let cssLoaded = false

export async function loadMindElixirClient(): Promise<MindElixirModule | null> {
  if (cached !== undefined) return cached
  try {
    cached = (await import('mind-elixir')) as MindElixirModule
    return cached
  } catch (err) {
    console.warn('[lanpm] mind-elixir load failed', err)
    cached = null
    return null
  }
}

export async function loadMindElixirStyles(): Promise<void> {
  if (cssLoaded) return
  // mind-elixir 4.x 在 MindElixir.js 内已注入样式；此处仅保留占位供未来换肤
  cssLoaded = true
}
