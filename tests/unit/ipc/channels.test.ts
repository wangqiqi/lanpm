import { describe, expect, it } from 'vitest'
import { BADGE_IPC } from '@shared/badge/types'
import { CHAT_IPC, CHAT_PUSH_CHANNEL } from '@shared/chat/channels'
import { COCKPIT_IPC } from '@shared/cockpit/channels'
import { AI_IPC } from '@shared/ai/channels'
import { DATA_IPC } from '@shared/data/channels'
import { DISCOVER_IPC, PAIRING_IPC } from '@shared/discover/channels'
import {
  FILE_CHUNK_SIZE,
  FILE_IPC,
  FILE_MAX_CONCURRENT,
  FILE_TRANSFER_PUSH_CHANNEL
} from '@shared/file/channels'
import { GROUP_IPC, GROUP_PUSH_CHANNEL } from '@shared/group/channels'
import { NETWORK_IPC } from '@shared/network/status'
import { SEARCH_IPC } from '@shared/search/channels'
import { TASK_AWARENESS_PUSH_CHANNEL, TASK_IPC, TASK_PUSH_CHANNEL } from '@shared/task/channels'

/** IPC 通道名为跨进程契约，变更会破坏主进程/渲染进程握手 */
describe('IPC channel contracts', () => {
  it('data storage channels', () => {
    expect(DATA_IPC.getStorageSettings).toBe('data:getStorageSettings')
    expect(DATA_IPC.setLocalRetentionDays).toBe('data:setLocalRetentionDays')
    expect(DATA_IPC.exportGroupBundle).toBe('data:exportGroupBundle')
    expect(DATA_IPC.importGroupBundle).toBe('data:importGroupBundle')
  })

  it('chat push and invoke channels', () => {
    expect(CHAT_PUSH_CHANNEL).toBe('chat:message')
    expect(CHAT_IPC.sendText).toBe('chat:sendText')
    expect(CHAT_IPC.markRead).toBe('chat:markRead')
  })

  it('file transfer limits and channels', () => {
    expect(FILE_TRANSFER_PUSH_CHANNEL).toBe('file:transfersChanged')
    expect(FILE_CHUNK_SIZE).toBe(256 * 1024)
    expect(FILE_MAX_CONCURRENT).toBe(3)
    expect(FILE_IPC.pullRemote).toBe('file:pullRemote')
  })

  it('task lifecycle channels', () => {
    expect(TASK_PUSH_CHANNEL).toBe('task:changed')
    expect(TASK_AWARENESS_PUSH_CHANNEL).toBe('task:awareness')
    expect(TASK_IPC.deleteTask).toBe('task:deleteTask')
    expect(TASK_IPC.upsertDependency).toBe('task:upsertDependency')
    expect(TASK_IPC.setAwareness).toBe('task:setAwareness')
    expect(TASK_IPC.listAwareness).toBe('task:listAwareness')
    expect(TASK_IPC.listChecklist).toBe('task:listChecklist')
    expect(TASK_IPC.upsertChecklistItem).toBe('task:upsertChecklistItem')
    expect(TASK_IPC.toggleChecklistItem).toBe('task:toggleChecklistItem')
    expect(TASK_IPC.removeChecklistItem).toBe('task:removeChecklistItem')
    expect(TASK_IPC.createSubtaskFromChecklistItem).toBe(
      'task:createSubtaskFromChecklistItem'
    )
  })

  it('group, network, search, discover, badge, cockpit', () => {
    expect(GROUP_PUSH_CHANNEL).toBe('group:listChanged')
    expect(GROUP_IPC.list).toBe('group:list')
    expect(NETWORK_IPC.connectManualPeer).toBe('network:connectManualPeer')
    expect(SEARCH_IPC.query).toBe('search:query')
    expect(DISCOVER_IPC.snapshot).toBe('discover:snapshot')
    expect(PAIRING_IPC.start).toBe('pairing:start')
    expect(PAIRING_IPC.join).toBe('pairing:join')
    expect(BADGE_IPC.getGroupTabBadges).toBe('badge:getGroupTabBadges')
    expect(COCKPIT_IPC.getDashboard).toBe('cockpit:getDashboard')
    expect(AI_IPC.streamChat).toBe('ai:streamChat')
  })
})
