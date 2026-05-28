export { closeDatabase, getDatabase, getDatabasePath, initDatabase } from './database'
export { EXPECTED_TABLES, SCHEMA_VERSION } from './schema'
export type { LocalDevice, UserProfile } from './types'
export {
  getDeviceById,
  getDevicesByUserId,
  upsertDevice
} from './repositories/deviceRepository'
export {
  baseNameExists,
  getFirstUser,
  getUserById,
  upsertUser,
  userIdExists
} from './repositories/userRepository'
export { deleteMeta, getMeta, setMeta } from './repositories/syncMetaRepository'
