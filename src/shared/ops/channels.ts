export const OPS_IPC = {
  sendSlash: 'ops:sendSlash',
  listMachines: 'ops:listMachines',
  listAudit: 'ops:listAudit',
  getGroupSettings: 'ops:getGroupSettings',
  updateGroupSettings: 'ops:updateGroupSettings',
  startGateway: 'ops:startGateway',
  stopGateway: 'ops:stopGateway',
  getGatewayStatus: 'ops:getGatewayStatus',
  updateGatewayConfig: 'ops:updateGatewayConfig',
  rotateGatewayToken: 'ops:rotateGatewayToken'
} as const
