import { describe, expect, it } from 'vitest'
import { emptyMindmapDataJson } from '../../../src/shared/mindmap/types.ts'
import {
  applyMindmapEncodedUpdate,
  createEmptyMindmapDoc,
  encodeMindmapDocState,
  mindmapDocToDataJson,
  seedMindmapDocFromJson
} from '../../../src/shared/mindmap/mindmapCrdtModel.ts'

describe('mindmapCrdtModel', () => {
  it('round-trips a tree through Y.Doc', () => {
    const src = JSON.parse(emptyMindmapDataJson('Root')) as {
      nodeData: { id: string; topic: string; children: Array<{ id: string; topic: string }> }
    }
    src.nodeData.children = [{ id: 'n1', topic: 'Child' }]
    const json = JSON.stringify(src)
    const doc = createEmptyMindmapDoc()
    seedMindmapDocFromJson(doc, json)
    const out = JSON.parse(mindmapDocToDataJson(doc)) as typeof src
    expect(out.nodeData.topic).toBe('Root')
    expect(out.nodeData.children.map((c) => c.id)).toEqual(['n1'])
  })

  it('merges sibling nodes from two replicas', () => {
    const base = JSON.parse(emptyMindmapDataJson('Root')) as {
      nodeData: { children: Array<{ id: string; topic: string }> }
    }
    const left = structuredClone(base)
    left.nodeData.children = [{ id: 'L', topic: 'Left' }]
    const right = structuredClone(base)
    right.nodeData.children = [{ id: 'R', topic: 'Right' }]

    const a = createEmptyMindmapDoc()
    const b = createEmptyMindmapDoc()
    seedMindmapDocFromJson(a, JSON.stringify(left), 'seed')
    seedMindmapDocFromJson(b, JSON.stringify(right), 'seed')
    applyMindmapEncodedUpdate(a, encodeMindmapDocState(b), 'remote')
    const merged = JSON.parse(mindmapDocToDataJson(a)) as typeof base
    const ids = merged.nodeData.children.map((c) => c.id).sort()
    expect(ids).toEqual(['L', 'R'])
  })
})
