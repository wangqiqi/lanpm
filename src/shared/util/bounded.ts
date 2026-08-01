/** 有界 Set：插入超限时按 FIFO 驱逐最旧项 */
export class BoundedSet<T> {
  private readonly set = new Set<T>()
  private readonly queue: T[] = []

  constructor(private readonly max: number) {}

  add(item: T): void {
    if (this.set.has(item)) return
    this.queue.push(item)
    this.set.add(item)
    while (this.queue.length > this.max) {
      const old = this.queue.shift()
      if (old !== undefined) this.set.delete(old)
    }
  }

  has(item: T): boolean {
    return this.set.has(item)
  }
}

/** LRU Map：get/set 时将键移到最近使用端；超限时驱逐最久未用项 */
export class LruMap<K, V> {
  private readonly map = new Map<K, V>()

  constructor(private readonly max: number) {}

  get(key: K): V | undefined {
    const value = this.map.get(key)
    if (value === undefined) return undefined
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key)
    this.map.set(key, value)
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value
      if (oldest !== undefined) this.map.delete(oldest)
    }
  }
}
