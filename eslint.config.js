import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'out',
      'dist',
      'node_modules',
      '.cursorGrowth',
      'coverage',
      '.lanpm/coverage',
      'tools/**/build',
      'website/.vitepress/cache/**'
    ]
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // 兼容形参刻意保留时用 `_` 前缀标记未用（如 resolveNavPreferencesForGroup 的 groupType，
      // 见 tests/static/verify-nav-preferences.ts）；默认 recommended 不忽略下划线参数
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
      ]
    }
  },
  {
    files: [
      '**/*Context.tsx',
      '**/ChatPluginMenusProvider.tsx',
      '**/messageContentDefer.tsx',
      '**/PluginSlot.tsx',
      '**/TaskSuggest.tsx',
      '**/SubtaskPreviewModal.tsx',
      '.cursor/templates/scaffold/**/*.tsx'
    ],
    rules: {
      'react-refresh/only-export-components': 'off'
    }
  },
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'electron.vite.config.ts'],
    languageOptions: {
      globals: globals.node
    }
  }
)
