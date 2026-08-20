/**
 * SPRINT-SEC — AI Key packaged guard + webview http(s) hardening present in source.
 * Run: node --experimental-strip-types tests/static/verify-sec-hardening.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const ai = readFileSync(join(root, 'src/main/ai/aiConfigService.ts'), 'utf8')
const guard = readFileSync(join(root, 'src/main/webviewGuard.ts'), 'utf8')
const index = readFileSync(join(root, 'src/main/index.ts'), 'utf8')
const bookmark = readFileSync(
  join(root, 'src/renderer/src/features/files/BookmarkWebView.tsx'),
  'utf8'
)
const httpUrl = readFileSync(join(root, 'src/shared/security/httpUrl.ts'), 'utf8')

assert.match(ai, /app\.isPackaged/, 'aiConfigService must gate on app.isPackaged')
assert.match(ai, /getLocalUserId/, 'aiConfigService must scope config per local user')
assert.match(ai, /WHERE user_id = @userId/, 'ai_config queries must filter by user_id')
assert.match(ai, /err\.apiKeySafeStorageRequired/, 'must throw when safeStorage unavailable in packaged')
assert.match(ai, /err\.apiKeyDevFallbackForbidden/, 'must forbid decrypting dev: keys when packaged')
assert.match(httpUrl, /isAllowedHttpUrl/, 'shared httpUrl helper required')
assert.match(guard, /will-attach-webview/, 'webviewGuard must harden attach')
assert.match(guard, /will-navigate/, 'webviewGuard must block bad navigations')
assert.match(index, /attachWebviewGuards/, 'main window must attach webview guards')
assert.match(bookmark, /isAllowedHttpUrl/, 'BookmarkWebView must validate URL')
const fileIpc = readFileSync(join(root, 'src/main/ipc/file.ts'), 'utf8')
assert.match(fileIpc, /rejectRendererUploadPath/, 'file:upload must reject renderer paths')
const envelope = readFileSync(join(root, 'src/main/crypto/envelopeCrypto.ts'), 'utf8')
assert.match(envelope, /envelope not sealed/, 'openEnvelope must fail-closed')

console.log('verify:sec-hardening OK')
