import type { GroupMemberView } from './members.ts'

export function isMachineMember(member: Pick<GroupMemberView, 'deviceKind'>): boolean {
  return member.deviceKind === 'machine'
}
