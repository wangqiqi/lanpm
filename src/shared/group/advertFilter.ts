/**
 * 发现目录「广告集合」过滤（纯函数，供 main 与单测共用）。
 *
 * PRD §11.4.2：连接码打通的是对端的 **发现目录**，即对端本机 `autoDiscover` 群。
 * 因此这里只有一条规则：**显式开启 autoDiscover 的群才会被广播**；
 * `demo-*` 演示群没有特殊待遇 —— 「关了 demo 还看到演示群」由
 * `ensureMockCatalog` → `purgeMockCatalog`（`LANPM_NO_DEMO=1`）负责清库，
 * 不要在这里再加特判（见 TASK-DUAL-A05 幽灵群组排查结论）。
 */
export interface AdvertFlagged {
  autoDiscover?: boolean
}

export function isGroupDiscoverable(group: AdvertFlagged): boolean {
  return group.autoDiscover === true
}

export function listAdvertisedGroups<T extends AdvertFlagged>(groups: readonly T[]): T[] {
  return groups.filter(isGroupDiscoverable)
}
