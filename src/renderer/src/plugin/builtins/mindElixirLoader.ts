/** Dynamic loader — optional import('mind-elixir') at runtime; not bundled by Vite */

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
    const load = new Function("return import('mind-elixir')") as () => Promise<MindElixirModule>
    cached = await load()
    return cached
  } catch {
    cached = null
    return null
  }
}

export async function loadMindElixirStyles(): Promise<void> {
  if (cssLoaded) return
  try {
    const load = new Function(
      "return import('mind-elixir/dist/MindElixir.css')"
    ) as () => Promise<unknown>
    await load()
    cssLoaded = true
  } catch {
    const id = 'lanpm-mind-elixir-fallback-style'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent =
      '.map-container{min-height:320px;border:1px dashed var(--ant-color-border,#d9d9d9);border-radius:8px}'
    document.head.appendChild(style)
  }
}
