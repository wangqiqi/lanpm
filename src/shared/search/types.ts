export type GlobalSearchHit =
  | {
      kind: 'task'
      groupId: string
      taskId: string
      title: string
      groupName: string
    }
  | {
      kind: 'message'
      groupId: string
      msgId: string
      snippet: string
      groupName: string
    }

export interface GlobalSearchResult {
  query: string
  hits: GlobalSearchHit[]
}
