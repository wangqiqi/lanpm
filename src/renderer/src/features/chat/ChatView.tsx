import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMessage } from '@shared/chat/types'
import type { GroupMemberView } from '@shared/chat/members'
import { Button, Dropdown, Input, Modal, Segmented, Select, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import {
  ApartmentOutlined,
  AudioOutlined,
  CameraOutlined,
  CodeOutlined,
  EditOutlined,
  FolderOpenOutlined,
  LayoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  PaperClipOutlined,
  PlusSquareOutlined,
  SendOutlined
} from '@ant-design/icons'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { isDmGroupId } from '@shared/chat/dmSession'
import { groupAllowsDirectMessage } from '@shared/group/guards'
import { groupViewPath } from '@renderer/routes/paths'
import { isViewAllowedForGroup } from '@shared/navigation/tabRules'
import { useDmStore } from '@renderer/stores/dmStore'
import { parseTaskCommand } from '@shared/chat/taskCommand'
import { parseOpsCommand } from '@shared/chat/opsCommand'
import type { Task } from '@shared/task/types'
import { linkedFileIdsFromMessage, titleFromChatMessage } from '@shared/task/fromMessage'
import { useChatStore } from '@renderer/stores/chatStore'
import { useTaskStore } from '@renderer/stores/taskStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useChatMembersStore } from '@renderer/stores/chatMembersStore'
import { deliveryStatusMeta, groupMessagesByDay } from '@renderer/features/chat/chatDateGroups'
import { useMentionSuggest } from '@renderer/features/chat/mentionKeyboard'
import { activeComposerSuggest, resolveComposerTaskLink, resolveStandaloneTaskRefForSend } from '@shared/chat/taskRefs'
import { useTaskSuggest } from '@renderer/features/chat/taskKeyboard'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import CodeSendModal from '@renderer/features/chat/CodeSendModal'
import DmSessionBar from '@renderer/features/chat/DmSessionBar'
import MemberList from '@renderer/features/chat/MemberList'
import MentionSuggest from '@renderer/features/chat/MentionSuggest'
import TaskSuggest, { taskStatusMessageKey } from '@renderer/features/chat/TaskSuggest'
import MessageBubble from '@renderer/features/chat/MessageBubble'
import ChatVirtualMessageList from '@renderer/features/chat/ChatVirtualMessageList'
import { ChatPluginMenusProvider } from '@renderer/features/chat/ChatPluginMenusProvider'
import { ChatMessageActionsProvider } from '@renderer/features/chat/ChatMessageActionsContext'
import { useLocateTask } from '@renderer/features/task/useLocateTask'
import MemberProfileModal from '@renderer/features/chat/MemberProfileModal'
import EmojiPicker from '@renderer/features/chat/EmojiPicker'
import TaskCreateModal from '@renderer/features/chat/TaskCreateModal'
import { chatStoreActions } from '@renderer/features/chat/chatStoreActions'
import { useMarkRead } from '@renderer/features/chat/useMarkRead'
import { useNewMessageScroll } from '@renderer/features/chat/useNewMessageScroll'
import { useSearchHighlight } from '@renderer/hooks/useSearchHighlight'
import { ViewErrorCenter, ViewLoadingCenter } from '@renderer/ui/ViewState'
import IslandPanel from '@renderer/ui/IslandPanel'
import ComposerIconButton from '@renderer/ui/ComposerIconButton'
import { useI18n } from '@renderer/i18n/useI18n'
import { PluginZoneHost } from '@renderer/plugin/PluginSlot'
import ChatVoiceMediaPanel from '@renderer/features/chat/ChatVoiceMediaPanel'
import { useChatCollaborationStore } from '@renderer/stores/chatCollaborationStore'
import type { ChatCollaborationPanel } from '@renderer/stores/chatCollaborationStore'
import '@renderer/features/chat/openCollaborationPanel'
import { useContributedViews } from '@renderer/plugin/useContributedViews'
import { usePluginView } from '@renderer/plugin/usePluginView'
import { isPluginLicenseActive } from '@renderer/plugin/pluginLicense'
import { resolveReplyQuote } from '@shared/chat/replyQuote'
import type { ResolvedReplyQuote } from '@shared/chat/replyQuote'
import { buildQuoteKindLabels } from '@renderer/features/chat/quoteKindLabels'
import {
  filterVisibleMessages,
  listHiddenMessageIds
} from '@shared/chat/hiddenMessages'
import { extractMessageText } from '@shared/search/extractMessageText'
import { resolveMemberDisplayName } from '@renderer/i18n/memberDisplay'
import ReplyQuoteBar from '@renderer/features/chat/ReplyQuoteBar'
import ForwardMessageModal from '@renderer/features/chat/ForwardMessageModal'
import EditMessageModal from '@renderer/features/chat/EditMessageModal'
import ChatBatchBar from '@renderer/features/chat/ChatBatchBar'
import PinnedMessagesBar from '@renderer/features/chat/PinnedMessagesBar'
import { useChatPinStore } from '@renderer/stores/chatPinStore'
import { useMessageJumpHighlight } from '@renderer/hooks/useMessageJumpHighlight'
import { copyTextToClipboard } from '@renderer/features/chat/messageContextActions'
import styles from './chat.module.css'

function ChatWorkspaceFrame({
  island,
  ariaLabel,
  children
}: {
  island: boolean
  ariaLabel: string
  children: React.ReactNode
}): React.ReactElement {
  if (island) {
    return (
      <IslandPanel
        hideHeader
        aria-label={ariaLabel}
        className={styles.chatIsland}
        bodyClassName={styles.chatWorkspace}
        data-testid="chat-island-surface"
      >
        {children}
      </IslandPanel>
    )
  }
  return <div className={styles.chatWorkspace}>{children}</div>
}

const { Text } = Typography
const { TextArea } = Input

const COMPOSER_MIN = 96
const COMPOSER_MAX = 360
const COMPOSER_DEFAULT = 176
const MESSAGES_MIN = 96

const SIDEBAR_MIN = 160
const SIDEBAR_MAX = 400
const SIDEBAR_DEFAULT = 240
const SIDEBAR_WIDTH_KEY = 'lanpm-chat-sidebar-width'
const MAX_MULTI_SELECT = 50
const EMPTY_MEMBERS: GroupMemberView[] = []
const EMPTY_TASKS: Task[] = []

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

export default function ChatView(): React.ReactElement {
  const { t, locale, formatError } = useI18n()
  const { message } = useLanpmApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { groupId } = useParams<{ groupId: string }>()
  const gid = groupId ?? ''
  const locateTask = useLocateTask(gid)
  const messageActionsValue = useMemo(
    () => ({ groupId: gid, navigate, locateTask }),
    [gid, navigate, locateTask]
  )
  const inDm = isDmGroupId(gid)
  const lastOriginGroupId = useDmStore((s) => s.lastOriginGroupId)
  const dmSession = useDmStore((s) => (inDm ? s.getSession(gid) : undefined))
  const projectGroupId = inDm ? (dmSession?.originGroupId ?? lastOriginGroupId) : gid
  const [dmPickerOpen, setDmPickerOpen] = useState(false)

  useEffect(() => {
    setDmPickerOpen(false)
  }, [gid])

  const prevGidRef = useRef(gid)
  useEffect(() => {
    const prev = prevGidRef.current
    if (prev && prev !== gid) {
      chatStoreActions.downgradeInactiveGroups(gid)
    }
    prevGidRef.current = gid
  }, [gid])

  const messages = useChatStore((s) => s.messagesByGroup[gid] ?? [])
  const hasMore = useChatStore((s) => s.hasMoreByGroup[gid] ?? false)
  const loading = useChatStore((s) => s.loading[gid])
  const loadingOlder = useChatStore((s) => s.loadingOlder[gid])
  const loadError = useChatStore((s) => s.loadError[gid])
  const tasks = useTaskStore((s) => s.tasksByGroup[projectGroupId] ?? [])
  const currentUserId = useIdentityStore((s) => s.user?.userId)
  const navGroups = useNavigationStore((s) => s.groups)
  const listRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const draftInputRef = useRef<HTMLTextAreaElement>(null)
  const pickedTaskRefIdRef = useRef<string | null>(null)
  const [draft, setDraft] = useState('')
  const members = useChatMembersStore((s) => s.membersByGroup[gid] ?? [])
  const memberById = useMemo(
    () => new Map(members.map((m) => [m.userId, m] as const)),
    [members]
  )
  const refreshMembers = useCallback(() => {
    void chatStoreActions.loadMembers(gid)
  }, [gid])
  const [codeModalOpen, setCodeModalOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [linkToTaskModal, setLinkToTaskModal] = useState<{
    msgId: string
    preview: string
  } | null>(null)
  const [linkTaskId, setLinkTaskId] = useState<string | undefined>()
  const [linkSaving, setLinkSaving] = useState(false)
  const [replyToMsgId, setReplyToMsgId] = useState<string | null>(null)
  const [forwardModal, setForwardModal] = useState<
    { sourceMsgId: string } | { batchMsgIds: string[] } | null
  >(null)
  const [editModal, setEditModal] = useState<{ msgId: string; text: string } | null>(null)
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(() => new Set())
  const [bubbleMenuState, setBubbleMenuState] = useState<{
    msgId: string
    menu: MenuProps
    x: number
    y: number
  } | null>(null)
  const hiddenIds = useMemo(() => listHiddenMessageIds(gid), [gid])
  const pinnedIds = useChatPinStore((s) => s.pinnedByGroup[gid] ?? [])
  const [composerHeight, setComposerHeight] = useState(COMPOSER_DEFAULT)
  const [maxComposerHeight, setMaxComposerHeight] = useState(COMPOSER_MAX)
  const [resizing, setResizing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isNarrow, setIsNarrow] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY))
    if (Number.isFinite(saved) && saved >= SIDEBAR_MIN && saved <= SIDEBAR_MAX) return saved
    return SIDEBAR_DEFAULT
  })
  const [sidebarResizing, setSidebarResizing] = useState(false)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  const [profileMember, setProfileMember] = useState<GroupMemberView | null>(null)
  const chatChannel: 'group' | 'dm' = dmPickerOpen || inDm ? 'dm' : 'group'
  const showDmPicker = dmPickerOpen

  const onChatChannelChange = (value: string | number): void => {
    if (value === 'group') {
      setDmPickerOpen(false)
      if (inDm && projectGroupId) {
        navigate(groupViewPath(projectGroupId, 'chat'))
      }
      return
    }
    setDmPickerOpen(true)
  }
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)
  const sidebarDragRef = useRef<{ startX: number; startW: number } | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const sync = (): void => {
      setIsNarrow(mq.matches)
      setSidebarOpen(!mq.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const messagesReady = !loading || messages.length > 0
  const { isHighlighted: isMsgHighlighted } = useSearchHighlight('msg', messagesReady)
  const { jumpToMessage, isJumpHighlighted } = useMessageJumpHighlight()

  const visibleMessages = useMemo(
    () => filterVisibleMessages(gid, messages, hiddenIds),
    [gid, messages, hiddenIds]
  )

  const messageById = useMemo(
    () => new Map(messages.map((m) => [m.msgId, m])),
    [messages]
  )

  const resolveSenderName = useCallback(
    (userId: string) => {
      const member = members.find((m) => m.userId === userId)
      return resolveMemberDisplayName(member?.displayName ?? userId, t)
    },
    [members, t]
  )

  const quoteKindLabels = useMemo(() => buildQuoteKindLabels(t), [t])

  const replyQuotesByMsgId = useMemo(() => {
    const map = new Map<string, ResolvedReplyQuote>()
    for (const msg of visibleMessages) {
      if (!msg.replyToMsgId) continue
      const quote = resolveReplyQuote(
        msg.replyToMsgId,
        (id) => messageById.get(id),
        resolveSenderName,
        quoteKindLabels
      )
      if (quote) map.set(msg.msgId, quote)
    }
    return map
  }, [visibleMessages, messageById, resolveSenderName, quoteKindLabels])

  const pendingReplyQuote = useMemo(() => {
    if (!replyToMsgId) return null
    return resolveReplyQuote(
      replyToMsgId,
      (id) => messageById.get(id),
      resolveSenderName,
      quoteKindLabels
    )
  }, [replyToMsgId, messageById, resolveSenderName, quoteKindLabels])

  const dayGroups = useMemo(
    () => groupMessagesByDay(visibleMessages, locale),
    [visibleMessages, locale]
  )

  const handleBubbleContextMenu = useCallback(
    (msgId: string, menu: MenuProps, event: React.MouseEvent) => {
      setBubbleMenuState({ msgId, menu, x: event.clientX, y: event.clientY })
    },
    []
  )

  useEffect(() => {
    if (!bubbleMenuState) return
    const close = (): void => setBubbleMenuState(null)
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [bubbleMenuState])

  const groupType = useMemo(() => {
    if (!gid) return 'project' as const
    if (isDmGroupId(gid)) return 'anonymous' as const
    return navGroups.find((x) => x.groupId === gid)?.type ?? 'project'
  }, [gid, navGroups])
  const originGroupId = inDm ? (dmSession?.originGroupId ?? lastOriginGroupId) : gid
  const originGroupType = useMemo(() => {
    if (!originGroupId || isDmGroupId(originGroupId)) return 'anonymous' as const
    return navGroups.find((x) => x.groupId === originGroupId)?.type ?? 'project'
  }, [originGroupId, navGroups])
  const dmAllowed = groupAllowsDirectMessage(originGroupType)
  const isMemoryOnlyAnonymous = Boolean(gid && !inDm && groupType === 'anonymous')
  const taskAllowed = Boolean(gid && !inDm && groupType === 'project')
  const codeAllowed = Boolean(gid && !isMemoryOnlyAnonymous)
  const fileAllowed = codeAllowed
  const filesLibraryAllowed =
    Boolean(gid && !inDm) && isViewAllowedForGroup(groupType, 'files', gid)
  const whiteboardAllowed =
    Boolean(gid && !inDm) && isViewAllowedForGroup(groupType, 'whiteboard', gid)
  const contributedViews = useContributedViews()
  const mindmapPlugin = usePluginView('lanpm.mindmap')
  const mindmapAllowed =
    Boolean(gid && !inDm) &&
    contributedViews.some((v) => v.route === 'mindmap' && v.groupTypes.includes(groupType))
  const collaborationAllowed = filesLibraryAllowed || whiteboardAllowed || mindmapAllowed

  const openCollaborationPanel = useCallback(
    (panel: ChatCollaborationPanel) => {
      if (panel === 'mindmap' && mindmapPlugin && !isPluginLicenseActive(mindmapPlugin)) {
        message.warning(t('plugin.licenseMissing'))
        return
      }
      useChatCollaborationStore.getState().open(panel)
    },
    [mindmapPlugin, message, t]
  )

  const insertMention = useCallback((displayName: string) => {
    setDraft((prev) => {
      const replaced = prev.replace(/(?:^|\s)@([^\s@]*)$/, ` @${displayName} `)
      if (replaced !== prev) return replaced.trimStart()
      const sep = prev.length > 0 && !prev.endsWith(' ') ? ' ' : ''
      return `${prev}${sep}@${displayName} `
    })
  }, [])

  const startDmWithMember = useCallback(
    (member: GroupMemberView) => {
      if (!currentUserId || member.userId === currentUserId || !dmAllowed || inDm) return
      const dmGroupId = chatStoreActions.openDmSession(
        member.userId,
        member.displayName,
        currentUserId,
        originGroupId,
        chatStoreActions.getGroupType(originGroupId)
      )
      if (!dmGroupId) return
      navigate(groupViewPath(dmGroupId, 'chat'))
    },
    [currentUserId, dmAllowed, inDm, originGroupId, navigate]
  )

  const viewSenderProfile = useCallback((member: GroupMemberView) => {
    setProfileMember(member)
  }, [])

  const insertEmoji = useCallback((emoji: string) => {
    setDraft((prev) => `${prev}${emoji}`)
  }, [])

  const appendComposerTrigger = useCallback((trigger: '@' | '#') => {
    setDraft((prev) => {
      const sep = prev.length > 0 && !prev.endsWith(' ') ? ' ' : ''
      return `${prev}${sep}${trigger}`
    })
    requestAnimationFrame(() => {
      const el = draftInputRef.current
      if (!el) return
      el.focus()
      const len = el.value.length
      el.setSelectionRange(len, len)
    })
  }, [])

  const dismissMention = useCallback(() => {
    setDraft((prev) => prev.replace(/(?:^|\s)@([^\s@]*)$/, '').trimEnd())
  }, [])

  const insertTaskRef = useCallback((task: Task) => {
    pickedTaskRefIdRef.current = task.taskId
    setDraft((prev) => {
      const replaced = prev.replace(/(?:^|\s)#([^#\n]*)$/, ` #${task.title} `)
      if (replaced !== prev) return replaced.trimStart()
      const sep = prev.length > 0 && !prev.endsWith(' ') ? ' ' : ''
      return `${prev}${sep}#${task.title} `
    })
  }, [])

  const dismissTaskRef = useCallback(() => {
    setDraft((prev) => prev.replace(/(?:^|\s)#([^#\n]*)$/, '').trimEnd())
  }, [])

  const resolveFileLinkTaskId = useCallback((): string | undefined => {
    if (!taskAllowed) return undefined
    return resolveComposerTaskLink(draft, tasks, pickedTaskRefIdRef.current)
  }, [draft, tasks, taskAllowed])

  const suggestMode = useMemo(
    () => activeComposerSuggest(draft, taskAllowed),
    [draft, taskAllowed]
  )

  const assigneePinIds = useMemo(() => {
    const ids: string[] = []
    const seen = new Set<string>()
    for (const task of tasks) {
      if (task.deletedAt || task.status === 'done') continue
      const id = task.assigneeUserId
      if (!id || seen.has(id)) continue
      seen.add(id)
      ids.push(id)
    }
    return ids
  }, [tasks])

  const { candidates, activeIndex, handleKeyDown: handleMentionKeyDown } = useMentionSuggest(
    draft,
    members,
    insertMention,
    dismissMention,
    { pinUserIds: assigneePinIds }
  )

  const {
    candidates: taskCandidates,
    activeIndex: taskActiveIndex,
    handleKeyDown: handleTaskKeyDown
  } = useTaskSuggest(draft, tasks, taskAllowed, insertTaskRef, dismissTaskRef)

  useEffect(() => {
    if (!projectGroupId || !taskAllowed) return
    void chatStoreActions.loadTasks(projectGroupId)
    const unsub = getLanpmApi().task.onTasksChanged((changedGroupId) => {
      if (changedGroupId === projectGroupId) void chatStoreActions.loadTasks(projectGroupId)
    })
    return unsub
  }, [projectGroupId, taskAllowed])

  useMarkRead(gid, visibleMessages, currentUserId)

  useEffect(() => {
    if (!gid) return
    void chatStoreActions.loadPins(gid)
  }, [gid])

  useEffect(() => {
    setReplyToMsgId(null)
    setMultiSelectMode(false)
    setSelectedMsgIds(new Set())
    setForwardModal(null)
    setEditModal(null)
  }, [gid])

  const lastMessage = visibleMessages.length > 0 ? visibleMessages[visibleMessages.length - 1] : undefined
  const { pendingNewCount, onMessagesScroll, jumpToLatest } = useNewMessageScroll({
    listRef,
    messageCount: visibleMessages.length,
    lastSenderUserId: lastMessage?.senderUserId,
    currentUserId,
    groupKey: gid
  })

  const handleMessagesScroll = useCallback(() => {
    onMessagesScroll()
    const el = listRef.current
    if (!el || !gid || !hasMore || loadingOlder) return
    if (el.scrollTop > 48) return
    const prevHeight = el.scrollHeight
    const prevTop = el.scrollTop
    void chatStoreActions.loadOlderMessages(gid).then(() => {
      requestAnimationFrame(() => {
        const node = listRef.current
        if (!node) return
        node.scrollTop = node.scrollHeight - prevHeight + prevTop
      })
    })
  }, [onMessagesScroll, gid, hasMore, loadingOlder])

  const onlineCount = useMemo(
    () => members.filter((m) => m.presence === 'online').length,
    [members]
  )
  const showChatContextBar = !showDmPicker && !inDm && members.length > 0

  const [fileDragOver, setFileDragOver] = useState(false)

  useEffect(() => {
    if (!gid) return
    void chatStoreActions.loadMessages(gid)
    void chatStoreActions.loadMembers(gid)
    const unsub = getLanpmApi().chat.onMessage((msg) => {
      if (msg.groupId === gid) chatStoreActions.upsertMessage(msg)
    })
    return unsub
  }, [gid])

  useEffect(() => {
    const state = location.state as { composeDraft?: string } | null
    if (!state?.composeDraft) return
    setDraft(state.composeDraft)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const available = entry.contentRect.height - MESSAGES_MIN
      setMaxComposerHeight(Math.min(COMPOSER_MAX, Math.max(COMPOSER_MIN, available)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setComposerHeight((h) => Math.min(h, maxComposerHeight))
  }, [maxComposerHeight])

  useEffect(() => {
    if (!resizing) {
      document.body.classList.remove('lanpm-composer-resize')
      return
    }
    document.body.classList.add('lanpm-composer-resize')
    const onMove = (e: MouseEvent): void => {
      if (!dragRef.current) return
      const delta = dragRef.current.startY - e.clientY
      const next = Math.min(
        maxComposerHeight,
        Math.max(COMPOSER_MIN, dragRef.current.startH + delta)
      )
      setComposerHeight(next)
    }

    const onUp = (): void => {
      dragRef.current = null
      setResizing(false)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.classList.remove('lanpm-composer-resize')
    }
  }, [resizing, maxComposerHeight])

  const onResizeStart = (e: React.MouseEvent): void => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startH: composerHeight }
    setResizing(true)
  }

  useEffect(() => {
    if (!sidebarResizing) {
      document.body.classList.remove('lanpm-sidebar-resize')
      return
    }
    document.body.classList.add('lanpm-sidebar-resize')
    const onMove = (e: MouseEvent): void => {
      if (!sidebarDragRef.current) return
      const delta = e.clientX - sidebarDragRef.current.startX
      const next = Math.min(
        SIDEBAR_MAX,
        Math.max(SIDEBAR_MIN, sidebarDragRef.current.startW + delta)
      )
      setSidebarWidth(next)
    }

    const onUp = (): void => {
      sidebarDragRef.current = null
      setSidebarResizing(false)
      setSidebarWidth((w) => {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w))
        return w
      })
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.classList.remove('lanpm-sidebar-resize')
    }
  }, [sidebarResizing])

  const onSidebarResizeStart = (e: React.MouseEvent): void => {
    e.preventDefault()
    sidebarDragRef.current = { startX: e.clientX, startW: sidebarWidth }
    setSidebarResizing(true)
  }

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || !gid) return

    const opsCmd = parseOpsCommand(text)
    if (opsCmd) {
      setDraft('')
      const linkTaskId = taskAllowed
        ? resolveComposerTaskLink(text, tasks, pickedTaskRefIdRef.current)
        : undefined
      try {
        await getLanpmApi().ops.sendSlash(gid, text, linkTaskId ? { linkTaskId } : undefined)
        message.success(t('chat.opsCommandSent'))
      } catch (err) {
        message.error(formatError(err, 'chat.opsCommandFailed'))
      }
      pickedTaskRefIdRef.current = null
      return
    }

    const taskCmd = parseTaskCommand(text)
    if (taskCmd) {
      if (!taskAllowed) {
        message.warning(t('chat.taskNotAllowed'))
        setDraft('')
        return
      }
      if (!taskCmd.title) {
        setTaskModalOpen(true)
        setDraft('')
        return
      }
      setDraft('')
      try {
        const { message: chatMsg } = await chatStoreActions.createFromChat(gid, taskCmd.title)
        chatStoreActions.upsertMessage(chatMsg)
        message.success(t('chat.taskCreated'))
      } catch (err) {
        message.error(formatError(err, 'chat.taskCreateFailed'))
      }
      return
    }

    const taskRef = taskAllowed
      ? resolveStandaloneTaskRefForSend(text, tasks, pickedTaskRefIdRef.current)
      : null
    if (taskRef) {
      setDraft('')
      pickedTaskRefIdRef.current = null
      try {
        await chatStoreActions.sendTaskRef(gid, taskRef.taskId)
      } catch (err) {
        message.error(formatError(err, 'chat.taskRefFailed'))
        setDraft(text)
      }
      return
    }

    pickedTaskRefIdRef.current = null
    const savedDraft = draft
    const replyId = replyToMsgId ?? undefined
    try {
      await chatStoreActions.sendText(gid, text, replyId ? { replyToMsgId: replyId } : undefined)
      setDraft('')
      setReplyToMsgId(null)
    } catch (err) {
      message.error(formatError(err, 'chat.sendFailed'))
      setDraft(savedDraft)
    }
  }, [draft, gid, taskAllowed, tasks, t, message, formatError, replyToMsgId])

  const handleCreateTask = useCallback(
    async (title: string) => {
      if (!gid || !taskAllowed) return
      const { message: chatMsg } = await chatStoreActions.createFromChat(gid, title)
      chatStoreActions.upsertMessage(chatMsg)
      message.success(t('chat.taskCreated'))
    },
    [gid, taskAllowed, t]
  )

  const handleCreateTaskFromMessage = useCallback(
    async (msg: ChatMessage) => {
      if (!gid || !taskAllowed) return
      const title = titleFromChatMessage(msg)
      if (!title) {
        message.warning(t('chat.createTaskFromMessageEmpty'))
        return
      }
      try {
        const { message: chatMsg } = await chatStoreActions.createFromChat(gid, title, {
          sourceMsgId: msg.msgId,
          linkedFileIds: linkedFileIdsFromMessage(msg)
        })
        chatStoreActions.upsertMessage(chatMsg)
        message.success(t('chat.taskCreated'))
      } catch (err) {
        message.error(formatError(err, 'chat.taskCreateFailed'))
      }
    },
    [gid, taskAllowed, t, message, formatError]
  )

  const handleConfirmLinkToTask = useCallback(async () => {
    if (!gid || !linkToTaskModal || !linkTaskId) return
    const task = tasks.find((x) => x.taskId === linkTaskId)
    if (!task) return
    setLinkSaving(true)
    try {
      await chatStoreActions.updateTask({
        taskId: linkTaskId,
        sourceMsgId: linkToTaskModal.msgId
      })
      message.success(t('chat.linkMessageToTaskDone'))
      setLinkToTaskModal(null)
      setLinkTaskId(undefined)
    } catch (err) {
      message.error(formatError(err, 'tree.updateFailed'))
    } finally {
      setLinkSaving(false)
    }
  }, [gid, linkToTaskModal, linkTaskId, tasks, message, t, formatError])

  const handleSendCode = useCallback(
    async (code: string, languageHint: string) => {
      if (!gid) return
      await chatStoreActions.sendCode(gid, code, languageHint)
    },
    [gid]
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Escape' && replyToMsgId) {
      e.preventDefault()
      setReplyToMsgId(null)
      return
    }
    if (suggestMode === 'task' && handleTaskKeyDown(e)) return
    if (suggestMode === 'mention' && handleMentionKeyDown(e)) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleRecall = useCallback(
    async (msgId: string) => {
      if (!gid) return
      try {
        await chatStoreActions.recallMessage(gid, msgId)
      } catch (err) {
        message.error(formatError(err, 'chat.recallFailed'))
      }
    },
    [gid, message, t]
  )

  const handleRetrySend = useCallback(
    async (msgId: string) => {
      try {
        const result = await chatStoreActions.retryMessage(msgId)
        if (result.deliveryStatus === 'failed') {
          message.error(t('chat.retrySendFailed'))
        }
      } catch (err) {
        message.error(formatError(err, 'chat.retrySendFailed'))
      }
    },
    [message, t]
  )

  const handleReply = useCallback((msg: ChatMessage) => {
    setReplyToMsgId(msg.msgId)
    requestAnimationFrame(() => draftInputRef.current?.focus())
  }, [])

  const handleForwardOne = useCallback((msg: ChatMessage) => {
    setForwardModal({ sourceMsgId: msg.msgId })
  }, [])

  const handlePinToggle = useCallback(
    async (msgId: string) => {
      if (!gid) return
      try {
        await chatStoreActions.togglePin(gid, msgId)
      } catch (err) {
        message.error(formatError(err, 'chat.pinFailed'))
      }
    },
    [gid, message, formatError]
  )

  const handleEditMessage = useCallback((msg: ChatMessage) => {
    if (msg.content.kind !== 'text') return
    setEditModal({ msgId: msg.msgId, text: msg.content.text })
  }, [])

  const handleConfirmEdit = useCallback(
    async (text: string) => {
      if (!gid || !editModal) return
      try {
        await chatStoreActions.editMessage(gid, editModal.msgId, text)
        setEditModal(null)
        message.success(t('chat.editMessageDone'))
      } catch (err) {
        message.error(formatError(err, 'chat.editMessageFailed'))
      }
    },
    [gid, editModal, message, t, formatError]
  )

  const handleConfirmForward = useCallback(
    async (targetGroupId: string) => {
      if (!forwardModal) return
      const senderName = useIdentityStore.getState().user?.displayName
      try {
        if ('batchMsgIds' in forwardModal) {
          for (const msgId of forwardModal.batchMsgIds) {
            await chatStoreActions.forwardMessage(msgId, targetGroupId, senderName)
          }
          message.success(t('chat.batchForwardDone'))
          setMultiSelectMode(false)
          setSelectedMsgIds(new Set())
        } else {
          await chatStoreActions.forwardMessage(forwardModal.sourceMsgId, targetGroupId, senderName)
          message.success(t('chat.forwardMessageDone'))
        }
        setForwardModal(null)
      } catch (err) {
        message.error(formatError(err, 'chat.forwardMessageFailed'))
      }
    },
    [forwardModal, message, t, formatError]
  )

  const toggleSelectMessage = useCallback((msgId: string) => {
    setSelectedMsgIds((prev) => {
      const next = new Set(prev)
      if (next.has(msgId)) {
        next.delete(msgId)
        return next
      }
      if (next.size >= MAX_MULTI_SELECT) {
        message.warning(t('chat.batchSelectLimit', { max: MAX_MULTI_SELECT }))
        return prev
      }
      next.add(msgId)
      return next
    })
  }, [message, t])

  const handleEnterMultiSelect = useCallback((msgId: string) => {
    setMultiSelectMode(true)
    setSelectedMsgIds(new Set([msgId]))
  }, [])

  const handleBatchCopy = useCallback(() => {
    const texts = Array.from(selectedMsgIds)
      .map((id) => messageById.get(id))
      .filter((m): m is ChatMessage => Boolean(m))
      .map((m) => extractMessageText(m.content))
      .filter(Boolean)
    if (texts.length === 0) return
    void copyTextToClipboard(texts.join('\n\n')).then((ok) => {
      if (ok) message.success(t('chat.copyMessageDone'))
      else message.error(t('chat.copyMessageFailed'))
    })
  }, [selectedMsgIds, messageById, message, t])

  const handleBatchForward = useCallback(() => {
    if (selectedMsgIds.size === 0) return
    setForwardModal({ batchMsgIds: Array.from(selectedMsgIds) })
  }, [selectedMsgIds])

  const renderMessage = useCallback(
    (msg: ChatMessage, showSender: boolean) => {
      const delivery = deliveryStatusMeta(msg.deliveryStatus, t)
      const textForRefs = extractMessageText(msg.content)
      const mentionMembers = textForRefs.includes('@') ? members : EMPTY_MEMBERS
      const bubbleTasks =
        taskAllowed && textForRefs.includes('#') ? tasks : EMPTY_TASKS
      return (
        <MessageBubble
          key={msg.msgId}
          message={msg}
          own={msg.senderUserId === currentUserId}
          memberById={memberById}
          mentionMembers={mentionMembers}
          tasks={bubbleTasks}
          deliveryLabel={delivery.text}
          deliveryAriaLabel={delivery.ariaLabel}
          deliveryFailed={delivery.failed}
          formatTime={formatTime}
          highlighted={isMsgHighlighted(msg.msgId)}
          jumpHighlighted={isJumpHighlighted(msg.msgId)}
          showSender={showSender}
          dmAllowed={dmAllowed && !inDm}
          replyQuote={replyQuotesByMsgId.get(msg.msgId) ?? null}
          onJumpToReply={jumpToMessage}
          multiSelectMode={multiSelectMode}
          selected={selectedMsgIds.has(msg.msgId)}
          onToggleSelect={toggleSelectMessage}
          onReply={handleReply}
          onForward={handleForwardOne}
          onEdit={handleEditMessage}
          onEnterMultiSelect={handleEnterMultiSelect}
          onMentionSender={insertMention}
          onViewSender={viewSenderProfile}
          onDmSender={startDmWithMember}
          onRecall={(msgId) => void handleRecall(msgId)}
          onRetrySend={(msgId) => void handleRetrySend(msgId)}
          taskCreateAllowed={taskAllowed}
          onCreateTaskFromMessage={(m) => void handleCreateTaskFromMessage(m)}
          onLinkMessageToTask={(m) => {
            const preview = titleFromChatMessage(m) ?? m.msgId
            setLinkToTaskModal({ msgId: m.msgId, preview })
            setLinkTaskId(undefined)
          }}
          onBubbleContextMenu={handleBubbleContextMenu}
        />
      )
    },
    [
      t,
      memberById,
      members,
      replyQuotesByMsgId,
      currentUserId,
      taskAllowed,
      tasks,
      isMsgHighlighted,
      isJumpHighlighted,
      dmAllowed,
      inDm,
      jumpToMessage,
      multiSelectMode,
      selectedMsgIds,
      toggleSelectMessage,
      handleReply,
      handleForwardOne,
      handleEditMessage,
      handleEnterMultiSelect,
      insertMention,
      viewSenderProfile,
      startDmWithMember,
      handleRecall,
      handleRetrySend,
      handleCreateTaskFromMessage,
      handleBubbleContextMenu
    ]
  )

  return (
    <ChatPluginMenusProvider>
    <ChatMessageActionsProvider value={messageActionsValue}>
    <div className={styles.chatLayout}>
      {sidebarOpen && (
        <button
          type="button"
          className={styles.sidebarBackdrop}
          aria-label={t('chat.closeSidebar')}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <button
        type="button"
        className={styles.sidebarToggle}
        aria-label={sidebarOpen ? t('chat.closeSidebar') : t('chat.openSidebar')}
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((v) => !v)}
      >
        <MenuOutlined />
      </button>
      <ChatWorkspaceFrame island={!isNarrow} ariaLabel={t('nav.chat')}>
      <div
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''} ${!isNarrow && !sidebarOpen ? styles.sidebarCollapsed : ''}`}
        style={!isNarrow && sidebarOpen ? { width: sidebarWidth } : undefined}
      >
        {!isNarrow && sidebarOpen && (
          <div className={styles.sidebarHeader}>
            <button
              type="button"
              className={styles.sidebarCollapseBtn}
              aria-label={t('chat.closeSidebar')}
              onClick={() => setSidebarOpen(false)}
            >
              <MenuFoldOutlined />
            </button>
          </div>
        )}
        <MemberList
          groupId={gid}
          members={members}
          presencePolling={sidebarOpen}
          onRefresh={refreshMembers}
          onInsertMention={(name) => {
            insertMention(name)
            if (isNarrow) setSidebarOpen(false)
          }}
        />
        {!isNarrow && sidebarOpen && (
          <div
            className={`${styles.sidebarResizeHandle} ${sidebarResizing ? styles.sidebarResizeHandleActive : ''}`}
            onMouseDown={onSidebarResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label={t('chat.resizeSidebar')}
          />
        )}
      </div>

      <div
        className={styles.root}
        ref={rootRef}
        onDragOver={(e) => {
          if (!fileAllowed) return
          e.preventDefault()
          setFileDragOver(true)
        }}
        onDragLeave={() => setFileDragOver(false)}
        onDrop={(e) => {
          if (!fileAllowed || !gid) return
          e.preventDefault()
          setFileDragOver(false)
          const file = e.dataTransfer?.files?.[0]
          if (!file) return
          const path = (file as File & { path?: string }).path
          if (!path) {
            message.warning(t('chat.fileNoPath'))
            return
          }
          void chatStoreActions
            .sendFile(gid, path, { linkTaskId: resolveFileLinkTaskId() })
            .catch((err: unknown) => message.error(formatError(err, 'chat.fileSendFailed')))
        }}
      >
        {fileDragOver && fileAllowed && (
          <div className={styles.fileDropOverlay}>{t('chat.fileDropHint')}</div>
        )}
        <div className={styles.chatModeBar}>
          {!isNarrow && !sidebarOpen && (
            <button
              type="button"
              className={styles.chatModeBarExpandBtn}
              aria-label={t('chat.openSidebar')}
              onClick={() => setSidebarOpen(true)}
            >
              <MenuUnfoldOutlined />
            </button>
          )}
          <Segmented
            className={styles.chatChannelToggle}
            size="small"
            value={chatChannel}
            onChange={onChatChannelChange}
            options={[
              { label: t('chat.groupChat'), value: 'group' },
              { label: t('chat.dmTab'), value: 'dm' }
            ]}
          />
        </div>
        {showDmPicker ? (
          <DmSessionBar activeGroupId={gid} layout="main" />
        ) : (
          <>
        {showChatContextBar && (
          <div className={styles.chatContextBar}>
            <Text className={styles.chatContextMeta}>
              {t('chat.onlineStats', { online: onlineCount, total: members.length })}
            </Text>
            {!multiSelectMode ? (
              <Button size="small" type="text" onClick={() => setMultiSelectMode(true)}>
                {t('chat.enterMultiSelect')}
              </Button>
            ) : null}
          </div>
        )}
        <PinnedMessagesBar
          pinnedIds={pinnedIds}
          messageById={messageById}
          members={members}
          onJump={jumpToMessage}
          onUnpin={(msgId) => void handlePinToggle(msgId)}
        />
        <div className={styles.chatStreamColumn}>
        <div className={styles.messagesWrap}>
        <div className={styles.messages} ref={listRef} onScroll={handleMessagesScroll}>
          {loading && messages.length === 0 ? (
            <ViewLoadingCenter />
          ) : loadError && messages.length === 0 ? (
            <ViewErrorCenter
              message={t('chat.loadFailed')}
              onRetry={() => void chatStoreActions.loadMessages(gid)}
            />
          ) : visibleMessages.length === 0 ? (
            <Text className={styles.empty} type="secondary">
              {t('chat.noMessages')}
            </Text>
          ) : (
            <ChatVirtualMessageList
              listRef={listRef}
              dayGroups={dayGroups}
              showLoadOlder={hasMore || loadingOlder}
              loadingOlder={loadingOlder}
              renderMessage={renderMessage}
            />
          )}
        </div>
        {bubbleMenuState ? (
          <>
            <Dropdown
              menu={bubbleMenuState.menu}
              open
              trigger={[]}
              onOpenChange={(open) => {
                if (!open) setBubbleMenuState(null)
              }}
            >
              <span
                style={{
                  position: 'fixed',
                  left: bubbleMenuState.x,
                  top: bubbleMenuState.y,
                  width: 0,
                  height: 0
                }}
              />
            </Dropdown>
            <div style={{ display: 'none' }} aria-hidden>
              <PluginZoneHost
                zone="context"
                context={{
                  groupId: gid,
                  view: 'chat',
                  selection: { messageId: bubbleMenuState.msgId }
                }}
              />
            </div>
          </>
        ) : null}
        {pendingNewCount > 0 && (
          <button
            type="button"
            className={styles.newMessagesJump}
            onClick={jumpToLatest}
          >
            {t('chat.newMessagesJump', { count: pendingNewCount })}
          </button>
        )}
        </div>
        </div>

        {multiSelectMode ? (
          <ChatBatchBar
            selectedCount={selectedMsgIds.size}
            maxCount={MAX_MULTI_SELECT}
            onCopy={handleBatchCopy}
            onForward={handleBatchForward}
            onCancel={() => {
              setMultiSelectMode(false)
              setSelectedMsgIds(new Set())
            }}
          />
        ) : (
        <div className={styles.composer} style={{ height: composerHeight }}>
          <div
            className={`${styles.resizeHandle} ${resizing ? styles.resizeHandleActive : ''}`}
            onMouseDown={onResizeStart}
            role="separator"
            aria-orientation="horizontal"
            aria-label={t('chat.resizeComposer')}
          />
          <div className={styles.inputRow}>
            <div className={styles.composerIsland}>
            <PluginZoneHost zone="composer" context={{ groupId: gid, view: 'chat' }} />
            <div className={styles.toolbar}>
              <div className={styles.toolbarActions}>
                <EmojiPicker onPick={insertEmoji} />
                <div className={styles.toolbarGroupDivider} aria-hidden />
                <div className={styles.toolbarRefGroup}>
                  <ComposerIconButton
                    icon={<span aria-hidden>@</span>}
                    label={t('chat.mentionBtn')}
                    className={`${styles.toolbarGlyphBtn} ${styles.toolbarGlyphMention}`}
                    onClick={() => appendComposerTrigger('@')}
                  />
                  {taskAllowed && (
                    <>
                      <ComposerIconButton
                        icon={<span aria-hidden>#</span>}
                        label={t('chat.taskRefBtn')}
                        className={`${styles.toolbarGlyphBtn} ${styles.toolbarGlyphTask}`}
                        onClick={() => appendComposerTrigger('#')}
                      />
                      <ComposerIconButton
                        icon={<PlusSquareOutlined />}
                        label={t('chat.taskBtn')}
                        onClick={() => setTaskModalOpen(true)}
                      />
                    </>
                  )}
                </div>
                {(codeAllowed || fileAllowed) && (
                  <>
                    <div className={styles.toolbarGroupDivider} aria-hidden />
                    <div className={styles.toolbarAttachGroup}>
                      {codeAllowed && (
                        <ComposerIconButton
                          icon={<CodeOutlined />}
                          label={t('chat.codeBtn')}
                          onClick={() => setCodeModalOpen(true)}
                        />
                      )}
                      {fileAllowed && (
                        <ComposerIconButton
                          icon={<PaperClipOutlined />}
                          label={t('chat.fileBtn')}
                          onClick={() =>
                            void chatStoreActions
                              .pickAndSendFile(gid, { linkTaskId: resolveFileLinkTaskId() })
                              .catch((err: unknown) =>
                                message.error(formatError(err, 'chat.fileSendFailed'))
                              )
                          }
                        />
                      )}
                      {fileAllowed && (
                        <ComposerIconButton
                          icon={<CameraOutlined />}
                          label={t('chat.screenshotBtn')}
                          onClick={() =>
                            void chatStoreActions.captureAndSendScreenshot(gid).catch((err: unknown) =>
                              message.error(formatError(err, 'chat.screenshotFailed'))
                            )
                          }
                        />
                      )}
                    </div>
                  </>
                )}
                {collaborationAllowed && (
                  <>
                    <div className={styles.toolbarGroupDivider} aria-hidden />
                    <div className={styles.toolbarCollaborationGroup}>
                      {filesLibraryAllowed && (
                        <ComposerIconButton
                          data-visual-collab="files"
                          icon={<FolderOpenOutlined />}
                          label={t('nav.files')}
                          onClick={() => openCollaborationPanel('files')}
                        />
                      )}
                      {whiteboardAllowed && (
                        <ComposerIconButton
                          data-visual-collab="whiteboard"
                          icon={<LayoutOutlined />}
                          label={t('nav.whiteboard')}
                          onClick={() => openCollaborationPanel('whiteboard')}
                        />
                      )}
                      {mindmapAllowed && (
                        <ComposerIconButton
                          data-visual-collab="mindmap"
                          icon={<ApartmentOutlined />}
                          label={t('nav.mindmap')}
                          onClick={() => openCollaborationPanel('mindmap')}
                        />
                      )}
                    </div>
                  </>
                )}
                <div className={styles.toolbarGroupDivider} aria-hidden />
                <div className={styles.toolbarMeetingGroup} data-visual-meeting="toolbar">
                  <PluginZoneHost zone="toolbar" context={{ groupId: gid, view: 'chat' }} />
                </div>
              </div>
              <Segmented
                className={styles.inputModeToggle}
                size="small"
                value={inputMode}
                onChange={(v) => setInputMode(v as 'text' | 'voice')}
                options={[
                  {
                    value: 'text',
                    icon: <EditOutlined />,
                    label: t('chat.inputModeText')
                  },
                  {
                    value: 'voice',
                    icon: <AudioOutlined />,
                    label: t('chat.inputModeVoice')
                  }
                ]}
              />
            </div>
            {pendingReplyQuote ? (
              <ReplyQuoteBar quote={pendingReplyQuote} onDismiss={() => setReplyToMsgId(null)} />
            ) : null}
            <div className={styles.composerBody}>
              <div className={styles.inputMain}>
                {inputMode === 'text' ? (
                  <div className={styles.inputWrap}>
                    {suggestMode === 'mention' && (
                      <MentionSuggest
                        candidates={candidates}
                        activeIndex={activeIndex}
                        onPick={insertMention}
                      />
                    )}
                    {suggestMode === 'task' && (
                      <TaskSuggest
                        candidates={taskCandidates}
                        activeIndex={taskActiveIndex}
                        onPick={insertTaskRef}
                        statusLabel={(status) => t(taskStatusMessageKey(status))}
                      />
                    )}
                    <div className={styles.inputComposeRow}>
                      <TextArea
                        ref={draftInputRef}
                        className={styles.inputTextarea}
                        placeholder={
                          taskAllowed ? t('chat.placeholderTask') : t('chat.placeholder')
                        }
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={onKeyDown}
                      />
                      <Button
                        type="primary"
                        shape="circle"
                        icon={<SendOutlined />}
                        className={styles.sendIconBtn}
                        disabled={!draft.trim()}
                        onClick={() => void handleSend()}
                      />
                    </div>
                  </div>
                ) : (
                  <ChatVoiceMediaPanel groupId={gid} />
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
        )}
          </>
        )}

        <ForwardMessageModal
          open={forwardModal != null}
          sourceGroupId={gid}
          onCancel={() => setForwardModal(null)}
          onConfirm={handleConfirmForward}
        />

        <EditMessageModal
          open={editModal != null}
          initialText={editModal?.text ?? ''}
          onCancel={() => setEditModal(null)}
          onConfirm={handleConfirmEdit}
        />

        <CodeSendModal
          open={codeModalOpen}
          onClose={() => setCodeModalOpen(false)}
          onSend={handleSendCode}
        />

        {taskAllowed && (
          <TaskCreateModal
            open={taskModalOpen}
            onClose={() => setTaskModalOpen(false)}
            onSubmit={async (title) => {
              try {
                await handleCreateTask(title)
              } catch (err) {
                message.error(formatError(err, 'chat.taskCreateFailed'))
                throw err
              }
            }}
          />
        )}

        <Modal
          open={linkToTaskModal != null}
          title={t('chat.linkMessageToTaskTitle')}
          okText={t('chat.linkFileToTaskConfirm')}
          cancelText={t('common.cancel')}
          confirmLoading={linkSaving}
          okButtonProps={{ disabled: !linkTaskId }}
          onCancel={() => {
            setLinkToTaskModal(null)
            setLinkTaskId(undefined)
          }}
          onOk={() => void handleConfirmLinkToTask()}
        >
          <Text type="secondary">
            {linkToTaskModal
              ? t('chat.linkMessageToTaskHint', { preview: linkToTaskModal.preview })
              : null}
          </Text>
          <Select
            style={{ width: '100%', marginTop: 12 }}
            placeholder={t('chat.linkFileToTaskPick')}
            value={linkTaskId}
            onChange={setLinkTaskId}
            options={tasks.map((task) => ({ value: task.taskId, label: task.title }))}
            showSearch
            optionFilterProp="label"
          />
        </Modal>

        <MemberProfileModal
          open={profileMember != null}
          member={profileMember}
          isSelf={profileMember?.userId === currentUserId}
          dmAllowed={dmAllowed && !inDm}
          onClose={() => setProfileMember(null)}
          onMention={insertMention}
          onStartDm={startDmWithMember}
        />
      </div>
      </ChatWorkspaceFrame>
    </div>
    </ChatMessageActionsProvider>
    </ChatPluginMenusProvider>
  )
}
