import type { MessageKey } from '@renderer/i18n/types'
import demoSchema from '../../../../../plugins/lanpm.formjs/demo-schema.json'

/** form-js demo schema（SSOT：`plugins/lanpm.formjs/demo-schema.json`） */
export const FORMJS_DEMO_SCHEMA = demoSchema

type SchemaComponent = {
  key: string
  labelKey?: string
  label?: string
  type: string
  validate?: { required?: boolean }
}

export type ResolvedFormJsSchema = {
  type: string
  components: Array<Omit<SchemaComponent, 'labelKey'> & { label: string }>
}

/** 将 `labelKey` 解析为 form-js 所需的 `label` 字段 */
export function resolveFormJsSchemaLabels(
  schema: typeof FORMJS_DEMO_SCHEMA,
  t: (key: MessageKey) => string
): ResolvedFormJsSchema {
  return {
    type: schema.type,
    components: schema.components.map((component) => {
      const c = component as SchemaComponent
      const label = c.labelKey ? t(c.labelKey as MessageKey) : (c.label ?? c.key)
      const { labelKey, ...rest } = c
      void labelKey
      return { ...rest, label }
    })
  }
}
