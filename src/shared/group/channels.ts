export const GROUP_PUSH_CHANNEL = 'group:listChanged'
export const GROUP_JOIN_REQUEST_PUSH_CHANNEL = 'group:joinRequestsChanged'

export const GROUP_IPC = {
  list: 'group:list',
  listLastActivity: 'group:listLastActivity',
  create: 'group:create',
  get: 'group:get',
  join: 'group:join',
  listJoinRequests: 'group:listJoinRequests',
  approveJoinRequest: 'group:approveJoinRequest',
  rejectJoinRequest: 'group:rejectJoinRequest',
  startInvite: 'group:startInvite',
  cancelInvite: 'group:cancelInvite',
  joinWithInvite: 'group:joinWithInvite',
  enterAnonymous: 'group:enterAnonymous',
  leaveAnonymous: 'group:leaveAnonymous',
  dissolve: 'group:dissolve'
} as const
