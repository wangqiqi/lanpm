import { describe, expect, it } from 'vitest'
import { GroupInviteSessionHost } from '../../../src/main/network/real/groupInviteSession'
import {
  formatPairingCode,
  PAIRING_TTL_MS
} from '../../../src/shared/group/groupInvite'

const identity = {
  deviceId: 'dev_owner',
  userId: 'user_owner',
  displayName: 'Owner',
  listenPort: 43_124,
  getHost: () => '192.168.1.20'
}

describe('groupInviteSession', () => {
  it('starts invite with 6-digit code bound to groupId', () => {
    const host = new GroupInviteSessionHost(identity)
    const view = host.start('grp_invite', '邀请测试群', 'project')
    expect(view.code).toMatch(/^\d{6}$/)
    expect(view.codeDisplay).toBe(formatPairingCode(view.code))
    expect(view.groupId).toBe('grp_invite')
    expect(host.isActive('grp_invite')).toBe(true)
  })

  it('responds to matching lookup once then consumes invite', () => {
    const host = new GroupInviteSessionHost(identity)
    const view = host.start('grp_invite', '邀请测试群', 'project')
    const found = host.handleLookup({
      code: view.code,
      joinerDeviceId: 'dev_joiner',
      joinerDisplayName: 'Joiner'
    })
    expect(found).not.toBeNull()
    expect(found?.groupId).toBe('grp_invite')
    expect(found?.ownerUserId).toBe('user_owner')

    const again = host.handleLookup({
      code: view.code,
      joinerDeviceId: 'dev_joiner2',
      joinerDisplayName: 'Joiner 2'
    })
    expect(again).toBeNull()
  })

  it('expires invite after TTL', () => {
    const host = new GroupInviteSessionHost(identity)
    const view = host.start('grp_invite', '邀请测试群', 'project')
    const realNow = Date.now
    Date.now = () => realNow() + PAIRING_TTL_MS + 1
    try {
      expect(host.isActive('grp_invite')).toBe(false)
      expect(
        host.handleLookup({
          code: view.code,
          joinerDeviceId: 'dev_joiner',
          joinerDisplayName: 'Joiner'
        })
      ).toBeNull()
    } finally {
      Date.now = realNow
    }
  })
})
