import type { Database } from 'better-sqlite3'
import type { LocalDevice } from '../types'

interface DeviceRow {
  device_id: string
  user_id: string
  device_name: string
  last_seen_at: string
}

function rowToDevice(row: DeviceRow): LocalDevice {
  return {
    deviceId: row.device_id,
    userId: row.user_id,
    deviceName: row.device_name,
    lastSeenAt: row.last_seen_at
  }
}

export function upsertDevice(db: Database, device: LocalDevice): void {
  db.prepare(
    `INSERT INTO devices (device_id, user_id, device_name, last_seen_at)
     VALUES (@deviceId, @userId, @deviceName, @lastSeenAt)
     ON CONFLICT(device_id) DO UPDATE SET
       user_id = excluded.user_id,
       device_name = excluded.device_name,
       last_seen_at = excluded.last_seen_at`
  ).run({
    deviceId: device.deviceId,
    userId: device.userId,
    deviceName: device.deviceName,
    lastSeenAt: device.lastSeenAt
  })
}

export function getDeviceById(db: Database, deviceId: string): LocalDevice | null {
  const row = db
    .prepare('SELECT * FROM devices WHERE device_id = ?')
    .get(deviceId) as DeviceRow | undefined
  return row ? rowToDevice(row) : null
}

export function getDevicesByUserId(db: Database, userId: string): LocalDevice[] {
  const rows = db
    .prepare('SELECT * FROM devices WHERE user_id = ? ORDER BY last_seen_at DESC')
    .all(userId) as DeviceRow[]
  return rows.map(rowToDevice)
}
