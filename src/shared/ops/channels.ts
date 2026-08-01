export const OPS_IPC = {
  sendSlash: 'ops:sendSlash',
  listMachines: 'ops:listMachines',
  listAudit: 'ops:listAudit',
  startGateway: 'ops:startGateway',
  stopGateway: 'ops:stopGateway',
  getGatewayStatus: 'ops:getGatewayStatus',
  updateGatewayConfig: 'ops:updateGatewayConfig',
  rotateGatewayToken: 'ops:rotateGatewayToken'
} as const
