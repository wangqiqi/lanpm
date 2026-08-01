const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|ico)$/i

/** 聊天附件文件名是否为常见图片扩展名 */
export function isImageFileName(fileName: string): boolean {
  return IMAGE_EXT.test(fileName.trim())
}
