import MiniSearch from 'minisearch'

export type TaskSearchDoc = {
  id: string
  kind: 'task'
  groupId: string
  title: string
  body: string
}

export type MessageSearchDoc = {
  id: string
  kind: 'message'
  groupId: string
  body: string
}

export type SearchDoc = TaskSearchDoc | MessageSearchDoc

export type TaskSearchHit = {
  taskId: string
  groupId: string
  title: string
}

export type MessageSearchHit = {
  msgId: string
  groupId: string
  snippet: string
}

/** Latin words + CJK unigrams. Not a 3rd/ tokenizer fork. */
export function tokenizeSearchText(text: string): string[] {
  const lower = text.toLowerCase()
  const tokens: string[] = []
  const latin = lower.match(/[a-z0-9]+/g)
  if (latin) tokens.push(...latin)
  const cjk = lower.match(/[\u3400-\u9fff]/g)
  if (cjk) tokens.push(...cjk)
  return tokens.length > 0 ? tokens : []
}

export function snippetAroundQuery(text: string, query: string, maxLen = 80): string {
  const lower = text.toLowerCase()
  const q = query.trim().toLowerCase()
  const idx = q ? lower.indexOf(q) : -1
  if (idx < 0) return text.slice(0, maxLen)
  const start = Math.max(0, idx - 20)
  const end = Math.min(text.length, idx + q.length + 40)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return `${prefix}${text.slice(start, end)}${suffix}`
}

function createIndex(): MiniSearch<SearchDoc> {
  return new MiniSearch<SearchDoc>({
    fields: ['title', 'body'],
    storeFields: ['kind', 'groupId', 'title', 'body'],
    idField: 'id',
    tokenize: (text) => tokenizeSearchText(String(text)),
    searchOptions: {
      prefix: true,
      combineWith: 'AND'
    }
  })
}

function searchDocs(docs: SearchDoc[], query: string, limit: number): SearchDoc[] {
  const q = query.trim()
  if (!q || limit <= 0 || docs.length === 0) return []
  const index = createIndex()
  index.addAll(docs)
  const raw = index.search(q)
  const byId = new Map(docs.map((d) => [d.id, d]))
  const hits: SearchDoc[] = []
  for (const row of raw) {
    const doc = byId.get(String(row.id))
    if (!doc) continue
    hits.push(doc)
    if (hits.length >= limit) break
  }
  return hits
}

export function searchTasksInDocs(
  docs: readonly TaskSearchDoc[],
  query: string,
  limit: number
): TaskSearchHit[] {
  return searchDocs([...docs], query, limit).map((doc) => ({
    taskId: doc.id,
    groupId: doc.groupId,
    title: doc.kind === 'task' ? doc.title : ''
  }))
}

export function searchMessagesInDocs(
  docs: readonly MessageSearchDoc[],
  query: string,
  limit: number
): MessageSearchHit[] {
  const q = query.trim()
  return searchDocs([...docs], query, limit).map((doc) => ({
    msgId: doc.id,
    groupId: doc.groupId,
    snippet: snippetAroundQuery(doc.body, q)
  }))
}
