export { closeDatabase, getDatabase, getDatabasePath, initDatabase } from './database.ts'
export { applyMigrations, MIGRATIONS } from './migrate.ts'
export type { MigrationStep } from './migrate.ts'
export { EXPECTED_TABLES, SCHEMA_VERSION } from './schema.ts'
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
