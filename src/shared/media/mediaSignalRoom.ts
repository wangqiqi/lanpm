import {
  MEDIA_ROOM_MAX_PARTICIPANTS,
  type MediaRoomState,
  type MediaSignalPayload
} from './mediaSignal.ts'

type RoomMember = { displayName: string; joinedAt: string }

export class MediaSignalRoomRegistry {
  private readonly roomMembers = new Map<string, Map<string, RoomMember>>()
  private readonly signalInbox = new Map<string, MediaSignalPayload[]>()

  private inboxKey(groupId: string, userId: string): string {
    return `${groupId}:${userId}`
  }

  joinRoom(groupId: string, userId: string, displayName: string): void {
    let members = this.roomMembers.get(groupId)
    if (!members) {
      members = new Map()
      this.roomMembers.set(groupId, members)
    }
    if (!members.has(userId) && members.size >= MEDIA_ROOM_MAX_PARTICIPANTS) {
      throw new Error('media_room_full')
    }
    members.set(userId, { displayName, joinedAt: new Date().toISOString() })
  }

  leaveRoom(groupId: string, userId: string): void {
    this.roomMembers.get(groupId)?.delete(userId)
    if (this.roomMembers.get(groupId)?.size === 0) {
      this.roomMembers.delete(groupId)
    }
  }

  appendInbox(groupId: string, userId: string, payload: MediaSignalPayload): void {
    const key = this.inboxKey(groupId, userId)
    const list = this.signalInbox.get(key) ?? []
    list.push(payload)
    if (list.length > 200) {
      list.splice(0, list.length - 200)
    }
    this.signalInbox.set(key, list)
  }

  pollInbox(
    groupId: string,
    userId: string,
    since: string
  ): { messages: MediaSignalPayload[]; cursor: string } {
    const key = this.inboxKey(groupId, userId)
    const all = this.signalInbox.get(key) ?? []

    let messages: MediaSignalPayload[]
    if (!since) {
      messages = all.slice(-50)
    } else {
      const idx = all.findIndex((m) => m.signalId === since)
      messages = idx >= 0 ? all.slice(idx + 1) : all.filter((m) => m.at > since)
    }

    const cursor = messages.length > 0 ? messages[messages.length - 1]!.signalId : since
    return { messages, cursor }
  }

  getRoomState(groupId: string): MediaRoomState {
    const members = this.roomMembers.get(groupId)
    const participants = members
      ? Array.from(members.entries()).map(([userId, meta]) => ({
          userId,
          displayName: meta.displayName,
          joinedAt: meta.joinedAt
        }))
      : []

    return {
      groupId,
      phase: participants.length > 0 ? 'active' : 'idle',
      participants,
      maxParticipants: MEDIA_ROOM_MAX_PARTICIPANTS
    }
  }

  ingestRemoteSignal(
    localUserId: string,
    payload: MediaSignalPayload
  ): void {
    if (payload.fromUserId === localUserId) return
    if (payload.toUserId && payload.toUserId !== localUserId) return

    const groupId = payload.groupId
    this.appendInbox(groupId, localUserId, payload)

    if (payload.kind === 'join') {
      this.joinRoom(groupId, payload.fromUserId, payload.fromDisplayName)
    } else if (payload.kind === 'leave') {
      this.leaveRoom(groupId, payload.fromUserId)
    }
  }

  reset(): void {
    this.roomMembers.clear()
    this.signalInbox.clear()
  }
}
