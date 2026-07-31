import {
  LANPM_OPEN_PROFILE_EVENT,
  type OpenProfileDetail
} from '@renderer/plugin/commandEffects'

/** 打开 Profile 模态并定位到指定 Tab（`plugins` · `meeting` · `nav` 等） */
export function openProfileTab(tab?: string): void {
  window.dispatchEvent(
    new CustomEvent<OpenProfileDetail>(LANPM_OPEN_PROFILE_EVENT, {
      detail: tab ? { tab } : {}
    })
  )
}
