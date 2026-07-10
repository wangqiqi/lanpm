import { match as matchPinyin } from 'pinyin-pro'

/**
 * 群名搜索：汉字子串（大小写不敏感）或拼音全拼/首字母（pinyin-pro match）。
 * 空查询视为全部命中。
 */
export function matchesGroupSearch(displayName: string, query: string): boolean {
  const q = query.trim()
  if (!q) return true
  const hay = displayName.trim()
  if (!hay) return false
  if (hay.toLowerCase().includes(q.toLowerCase())) return true
  const hit = matchPinyin(hay, q)
  return Array.isArray(hit) && hit.length > 0
}
