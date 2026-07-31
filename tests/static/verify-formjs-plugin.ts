/**
 * TASK-907 — form-js real library sprint guards.
 * Run: npm run verify:formjs-plugin
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { parsePluginManifest } from '../../src/shared/plugin/validateManifest.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  scripts?: Record<string, string>
}
assert.ok(!pkg.dependencies?.['@bpmn-io/form-js'], 'form-js must not be in core dependencies')
assert.ok(pkg.scripts?.['verify:formjs-plugin'], 'missing verify:formjs-plugin script')

const pluginPkgPath = join(root, 'plugins/lanpm.formjs/package.json')
assert.ok(existsSync(pluginPkgPath), 'missing plugins/lanpm.formjs/package.json')
const pluginPkg = JSON.parse(readFileSync(pluginPkgPath, 'utf8')) as {
  dependencies?: Record<string, string>
}
assert.ok(pluginPkg.dependencies?.['@bpmn-io/form-js'], 'plugin package.json must declare @bpmn-io/form-js')

assert.ok(existsSync(join(root, 'plugins/lanpm.formjs/demo-schema.json')))
assert.ok(existsSync(join(root, 'plugins/lanpm.formjs/README.md')))

const manifest = JSON.parse(
  readFileSync(join(root, 'plugins/lanpm.formjs/plugin.json'), 'utf8')
)
const parsed = parsePluginManifest(manifest)
assert.equal(parsed?.id, 'lanpm.formjs')
assert.equal(parsed?.version, '0.2.0')

const loader = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/formJsClientLoader.ts'),
  'utf8'
)
assert.match(loader, /@bpmn-io\/form-js/)
assert.match(loader, /new Function/)

const view = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/FormJsView.tsx'),
  'utf8'
)
assert.match(view, /loadFormJsClient/)
assert.match(view, /FormJsPoc/)
assert.match(view, /data-formjs-engine/)

const registry = readFileSync(join(root, 'src/renderer/src/plugin/registry.ts'), 'utf8')
assert.match(registry, /lanpm\.formjs.*FormJsView/)

const schema = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/formJsSchema.ts'),
  'utf8'
)
assert.match(schema, /demo-schema\.json/)
assert.match(schema, /resolveFormJsSchemaLabels/)

const origin = readFileSync(join(root, 'plugins/lanpm.formjs/ORIGIN.md'), 'utf8')
assert.match(origin, /demo-schema\.json/)

console.log('verify:formjs-plugin OK')
