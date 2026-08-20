/** Framed file_chunk plaintext (SPIKE-3301 A). Not used on TCP wire JSON. */

export const FILE_CHUNK_FRAME_MAGIC = Buffer.from('LPM1')

const HEADER_LEN_BYTES = 4
const MAX_HEADER_BYTES = 16 * 1024
const MAX_CHUNK_BYTES = 512 * 1024

export type FileChunkFrameHeader = {
  fileId: string
  groupId: string
  offset: number
  totalBytes: number
  sha256: string
  done: boolean
}

export type FileChunkBinaryPayload = FileChunkFrameHeader & {
  chunk: Buffer
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isFileChunkBinaryPayload(value: unknown): value is FileChunkBinaryPayload {
  if (!isRecord(value)) return false
  if (typeof value.fileId !== 'string' || !value.fileId) return false
  if (typeof value.groupId !== 'string' || !value.groupId) return false
  if (typeof value.offset !== 'number' || !Number.isInteger(value.offset) || value.offset < 0) {
    return false
  }
  if (typeof value.totalBytes !== 'number' || !Number.isInteger(value.totalBytes) || value.totalBytes < 0) {
    return false
  }
  if (typeof value.sha256 !== 'string' || !value.sha256) return false
  if (typeof value.done !== 'boolean') return false
  return Buffer.isBuffer(value.chunk)
}

export function encodeFileChunkFrame(payload: FileChunkBinaryPayload): Buffer {
  const headerJson = JSON.stringify({
    fileId: payload.fileId,
    groupId: payload.groupId,
    offset: payload.offset,
    totalBytes: payload.totalBytes,
    sha256: payload.sha256,
    done: payload.done
  })
  const header = Buffer.from(headerJson, 'utf8')
  if (header.length > MAX_HEADER_BYTES) throw new Error('file chunk frame header too large')
  if (payload.chunk.length > MAX_CHUNK_BYTES) throw new Error('file chunk frame body too large')
  const len = Buffer.alloc(HEADER_LEN_BYTES)
  len.writeUInt32BE(header.length, 0)
  return Buffer.concat([FILE_CHUNK_FRAME_MAGIC, len, header, payload.chunk])
}

export function tryDecodeFileChunkFrame(plain: Buffer): FileChunkBinaryPayload | null {
  const min = FILE_CHUNK_FRAME_MAGIC.length + HEADER_LEN_BYTES
  if (plain.length < min) return null
  if (!plain.subarray(0, FILE_CHUNK_FRAME_MAGIC.length).equals(FILE_CHUNK_FRAME_MAGIC)) return null
  const headerLen = plain.readUInt32BE(FILE_CHUNK_FRAME_MAGIC.length)
  if (headerLen < 2 || headerLen > MAX_HEADER_BYTES) return null
  const headerStart = min
  const headerEnd = headerStart + headerLen
  if (plain.length < headerEnd) return null
  const chunk = plain.subarray(headerEnd)
  if (chunk.length > MAX_CHUNK_BYTES) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(plain.subarray(headerStart, headerEnd).toString('utf8'))
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null
  const payload = { ...parsed, chunk }
  if (!isFileChunkBinaryPayload(payload)) return null
  return payload
}
