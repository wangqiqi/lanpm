export type FileCategory = 'document' | 'image' | 'video' | 'code' | 'bookmark' | 'other'

export type FilePreviewStatus = 'none' | 'ready' | 'failed' | 'converting'

export type FileTransferStatus =
  | 'queued'
  | 'transferring'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface FileMeta {
  fileId: string
  groupId: string
  name: string
  ext: string
  category: FileCategory
  size: number
  mimeType?: string
  uploadedBy: string
  uploadedAt: string
  sha256: string
  storagePath: string
  previewStatus: FilePreviewStatus
  previewPath?: string
  isBookmark: boolean
  bookmarkUrl?: string
  bookmarkTitle?: string
  updatedAt: string
}

export interface FileTransferView {
  transferId: string
  fileId: string
  groupId: string
  direction: 'upload' | 'download'
  status: FileTransferStatus
  totalBytes: number
  transferredBytes: number
  fileName: string
  startedAt: string
  finishedAt?: string
  errorMessage?: string
}

export function inferCategory(ext: string, mime?: string): FileCategory {
  const e = ext.toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(e)) return 'image'
  if (['mp4', 'webm', 'mov', 'avi'].includes(e)) return 'video'
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c', 'h', 'cs', 'swift', 'kt', 'scala', 'vue', 'svelte', 'html', 'css', 'scss', 'less', 'md', 'txt', 'json', 'yaml', 'yml', 'xml', 'ini', 'conf', 'cfg', 'toml', 'env', 'sql', 'sh', 'bash', 'dockerfile', 'tf', 'hcl'].includes(e)) return 'code'
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods'].includes(e)) return 'document'
  if (mime?.startsWith('image/')) return 'image'
  if (mime?.startsWith('video/')) return 'video'
  return 'other'
}
