/**
 * 群邀请码：服务接线 + UDP 报文类型。
 * Run: npm run verify:group-invite
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const inviteSrc = readFileSync(join(root, 'src/main/group/groupInviteService.ts'), 'utf8')
const groupIpc = readFileSync(join(root, 'src/main/ipc/group.ts'), 'utf8')
const transportSrc = readFileSync(join(root, 'src/main/network/real/RealNetworkTransport.ts'), 'utf8')
const inviteTypes = readFileSync(join(root, 'src/shared/group/groupInvite.ts'), 'utf8')

assert.match(inviteSrc, /startGroupInvite/)
assert.match(inviteSrc, /joinWithGroupInviteCode/)
assert.match(inviteSrc, /applyApprovedDiscoverableJoin/)
assert.match(groupIpc, /GROUP_IPC\.startInvite/)
assert.match(groupIpc, /GROUP_IPC\.joinWithInvite/)
assert.match(transportSrc, /startGroupInviteSession/)
assert.match(transportSrc, /joinWithGroupInviteCode/)
assert.match(inviteTypes, /group_invite_offer/)
assert.match(inviteTypes, /group_invite_lookup/)
assert.match(inviteTypes, /group_invite_found/)

console.log('verify:group-invite OK')
