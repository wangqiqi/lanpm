/** form-js 风格 demo schema（SSOT；`plugins/lanpm.formjs` POC 与 `verify:plugin-loader` 共用） */
export const FORMJS_DEMO_SCHEMA = {
  type: 'default',
  components: [
    {
      key: 'summary',
      labelKey: 'plugin.formField.summary',
      type: 'textfield',
      validate: { required: true }
    },
    {
      key: 'notes',
      labelKey: 'plugin.formField.notes',
      type: 'textarea'
    },
    {
      key: 'accepted',
      labelKey: 'plugin.formField.accepted',
      type: 'checkbox'
    }
  ]
} as const
