/** form-js 风格 demo schema（SSOT；`plugins/lanpm.formjs` POC 与 `verify:plugin-loader` 共用） */
export const FORMJS_DEMO_SCHEMA = {
  type: 'default',
  components: [
    {
      key: 'summary',
      label: '摘要',
      type: 'textfield',
      validate: { required: true }
    },
    {
      key: 'notes',
      label: '备注',
      type: 'textarea'
    },
    {
      key: 'accepted',
      label: '已确认',
      type: 'checkbox'
    }
  ]
} as const
