/** Dynamic loader — optional import('@bpmn-io/form-js') at runtime; not bundled by Vite */

export type FormJsFormInstance = {
  importSchema: (schema: unknown, data?: Record<string, unknown>) => Promise<void>
  on: (event: string, callback: (event: { data?: Record<string, unknown> }) => void) => void
  destroy: () => void
}

export type FormJsFormConstructor = new (options: { container: HTMLElement }) => FormJsFormInstance

export type FormJsClientModule = {
  Form: FormJsFormConstructor
}

let cached: FormJsClientModule | null | undefined
let cssLoaded = false

export async function loadFormJsClient(): Promise<FormJsClientModule | null> {
  if (cached !== undefined) return cached
  try {
    const load = new Function(
      "return import('@bpmn-io/form-js')"
    ) as () => Promise<FormJsClientModule>
    cached = await load()
    return cached
  } catch {
    cached = null
    return null
  }
}

export async function loadFormJsStyles(): Promise<void> {
  if (cssLoaded) return
  try {
    const load = new Function(
      "return import('@bpmn-io/form-js/dist/assets/form-js.css')"
    ) as () => Promise<unknown>
    await load()
    cssLoaded = true
  } catch {
    const id = 'lanpm-form-js-fallback-style'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent =
      '.fjs-container{font-family:inherit;font-size:14px}.fjs-form-field{margin-bottom:8px}'
    document.head.appendChild(style)
  }
}
