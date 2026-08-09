/*
 * MUNFMS - A dedicated file management tool for organizing and sharing documents in MUN meetings.
 * Copyright (C) 2026 iXiQiu (@ixiqiu)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { defineStore } from 'pinia'
import { h, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { notificationsApi } from '../api/notifications'
import { sessionsApi } from '../api'
import { useAuthStore } from './auth'
import { useEventsStore } from './events'
import router from '../router'
import type { NotificationPermissionState, SseEvent } from '../types'

const DISMISS_KEY = 'mun_notif_reminder_dismissed'
const POLL_DETECT_INTERVAL = 15000
const COOLDOWN_MS = 15000           // 每会话连续 2 条推送后的冷却期
const MAX_CONSECUTIVE_PUSHES = 2    // 冷却前允许的连续推送条数

export const useNotificationsStore = defineStore('notifications', () => {
  const enabled = ref(true)
  const dndSessionIds = ref<Set<string>>(new Set())
  const permission = ref<NotificationPermissionState>('default')
  const viewingSessionId = ref<string | null>(null)

  const authStore = useAuthStore()
  const eventsStore = useEventsStore()

  // —— 私有状态 ——
  let initialized = false
  let unsubscribe: (() => void) | null = null
  let stopModeWatch: (() => void) | null = null
  let pollTimer: number | undefined
  let reminderShown = false
  // sessionId -> { name }（来自 sessionsApi.list()，兼作群成员判断）
  let sessionCache = new Map<string, { name: string }>()
  // sessionId -> { lastMessageTime, unreadCount }（轮询增量检测基线）
  let sessionSnapshot = new Map<string, { lastMessageTime: string | null; unreadCount: number }>()
  // sessionId -> { pushCount, cooldownUntil }（每会话推送节流状态）
  const throttle = new Map<string, { pushCount: number; cooldownUntil: number }>()

  // —— 通知展示 ——
  function showNotification(title: string, body: string, tag?: string, onClick?: () => void): void {
    try {
      const n = new Notification(title, { body, tag })
      n.onclick = () => {
        window.focus()
        onClick?.()
        n.close()
      }
    } catch {
      // 非安全上下文 / 被禁用：静默忽略
    }
  }

  // —— 服务端尽力上报 ——
  async function reportPermissionState(state: string): Promise<void> {
    try {
      await notificationsApi.reportPermission(state)
    } catch {
      // 尽力上报，忽略失败
    }
  }

  async function reportConnectionMode(mode: string): Promise<void> {
    try {
      await notificationsApi.reportConnectionMode(mode)
    } catch {
      // 尽力上报，忽略失败
    }
  }

  // —— 会话缓存（群成员判断 + 群名 + 轮询检测基线） ——
  async function refreshSessions(): Promise<void> {
    try {
      const sessions = await sessionsApi.list()
      const nextCache = new Map<string, { name: string }>()
      const nextSnapshot = new Map<string, { lastMessageTime: string | null; unreadCount: number }>()
      for (const s of sessions) {
        nextCache.set(s.id, { name: s.name ?? '' })
        nextSnapshot.set(s.id, { lastMessageTime: s.lastMessageTime ?? null, unreadCount: s.unreadCount ?? 0 })
      }
      sessionCache = nextCache
      sessionSnapshot = nextSnapshot
    } catch {
      // 静默：保留旧缓存，下一轮重试
    }
  }

  // —— 每会话推送节流：每条消息立即推送；连续 2 条后冷却 15s ——
  function notifySessionMessage(sessionId: string): void {
    const now = Date.now()
    let state = throttle.get(sessionId)
    if (state && now < state.cooldownUntil) return // 冷却期内不推送（应用内未读角标仍更新）
    const sessionName = sessionCache.get(sessionId)?.name || '群聊'
    showNotification(
      `群聊「${sessionName}」`,
      '有新消息',
      `mun-consult-${sessionId}-${now}`, // 唯一 tag：逐条独立成通知（可堆叠），不再同名替换
      () => {
        void router.push('/consult')
      },
    )
    if (!state) {
      state = { pushCount: 0, cooldownUntil: 0 }
      throttle.set(sessionId, state)
    }
    state.pushCount += 1
    if (state.pushCount >= MAX_CONSECUTIVE_PUSHES) {
      state.cooldownUntil = now + COOLDOWN_MS
      state.pushCount = 0
    }
  }

  // —— 轮询增量检测（仅 polling 模式，15s 周期） ——
  async function detectFromSessions(): Promise<void> {
    if (!enabled.value) return
    try {
      const sessions = await sessionsApi.list()
      for (const s of sessions) {
        const prev = sessionSnapshot.get(s.id)
        const now = { lastMessageTime: s.lastMessageTime ?? null, unreadCount: s.unreadCount ?? 0 }
        sessionSnapshot.set(s.id, now)
        if (!prev) continue
        const delta = now.unreadCount - prev.unreadCount
        // unreadCount 增量天然排除同内阁消息（服务端 countUnread 语义），无需 senderCabinetId
        if (delta > 0 && s.id !== viewingSessionId.value && !dndSessionIds.value.has(s.id)) {
          notifySessionMessage(s.id)
        }
      }
      // 轮询期间周期续报，防服务端 90s 过期判定
      void reportConnectionMode('polling')
    } catch {
      // 忽略：下一轮再试
    }
  }

  // —— 页面恢复可见时立即补一次轮询检测（轮询模式下避免等满 15s 周期；SSE 模式事件实时补发，无需检测） ——
  function handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && eventsStore.mode === 'polling') {
      void detectFromSessions()
    }
  }

  function startPollDetection(): void {
    if (pollTimer !== undefined) return
    pollTimer = window.setInterval(() => {
      void detectFromSessions()
    }, POLL_DETECT_INTERVAL)
  }

  function stopPollDetection(): void {
    if (pollTimer !== undefined) {
      window.clearInterval(pollTimer)
      pollTimer = undefined
    }
  }

  // —— SSE 模式与轮询模式切换 ——
  function applyMode(mode: 'sse' | 'polling'): void {
    if (mode === 'polling') {
      startPollDetection()
      void reportConnectionMode('polling')
    } else {
      stopPollDetection()
      void reportConnectionMode('sse')
    }
  }

  // —— 每会话一次的权限提醒弹窗（不再提醒 → localStorage） ——
  function showReminderOnce(): void {
    if (reminderShown) return
    let dismissed = false
    try {
      dismissed = !!localStorage.getItem(DISMISS_KEY)
    } catch {
      dismissed = false
    }
    if (dismissed) return
    reminderShown = true
    let noMore = false
    ElMessageBox({
      title: '通知权限提醒',
      message: h('div', { class: 'notif-reminder' }, [
        h('p', null, '无法获取浏览器通知权限，将无法收到新文件/新消息提醒。'),
        h('p', null, '请在浏览器地址栏左侧图标 → 网站设置中允许本站通知。'),
        h('label', { style: 'display:flex;align-items:center;margin-top:8px;cursor:pointer;' }, [
          h('input', {
            type: 'checkbox',
            style: 'margin-right:6px;',
            onChange: (e: Event) => {
              noMore = (e.target as HTMLInputElement).checked
            },
          }),
          '不再提醒',
        ]),
      ]),
      confirmButtonText: '知道了',
      showCancelButton: false,
      closeOnClickModal: true,
      closeOnPressEscape: true,
    })
      .catch(() => {})
      .finally(() => {
        if (noMore) {
          try {
            localStorage.setItem(DISMISS_KEY, '1')
          } catch {
            // 忽略
          }
        }
      })
  }

  // —— 权限 FSM ——
  async function requestPermission(): Promise<void> {
    if (!('Notification' in window)) {
      permission.value = 'unsupported'
      return
    }
    const current = window.Notification.permission
    if (current === 'granted') {
      permission.value = 'granted'
      await reportPermissionState('granted')
      return
    }
    if (current === 'denied') {
      permission.value = 'denied'
      await reportPermissionState('denied')
      showReminderOnce()
      return
    }
    // current === 'default'：发起请求（try/catch 兜底非安全上下文）
    let result: NotificationPermission
    try {
      result = await window.Notification.requestPermission()
    } catch {
      permission.value = 'default'
      await reportPermissionState('default')
      showReminderOnce()
      return
    }
    permission.value = result
    if (result === 'granted') {
      await reportPermissionState('granted')
      return
    }
    if (result === 'denied') {
      await reportPermissionState('denied')
      showReminderOnce()
      return
    }
    // 提示被忽略，仍为 default
    await reportPermissionState('default')
    showReminderOnce()
  }

  // —— SSE 事件处理（过滤规则均为「与」关系） ——
  function handleEvent(event: SseEvent): void {
    if (!enabled.value) return
    // 自己刚操作过 → 跳过
    if (event.actorId && event.actorId === authStore.user?.id) return

    if (event.type === 'file.changed') {
      if (event.spaceType === 'PUBLIC' && authStore.user?.role === 'DELEGATE') {
        showNotification('公共空间新增文件', event.fileName ?? '新文件已上传', 'mun-public-file', () => {
          void router.push('/public')
        })
        return
      }
      if (event.spaceType === 'CONFERENCE' && authStore.isAcademic) {
        showNotification('有代表提交新文件', event.fileName ?? '新文件已提交', 'mun-conference-file', () => {
          void router.push('/conference')
        })
        return
      }
      return
    }

    if (event.type === 'message.new') {
      if (authStore.user?.role !== 'DELEGATE') return
      if (!event.sessionId) return
      if (!sessionCache.has(event.sessionId)) return
      if (event.senderCabinetId !== undefined && event.senderCabinetId === authStore.cabinetId) return
      if (event.sessionId === viewingSessionId.value) return
      if (dndSessionIds.value.has(event.sessionId)) return
      notifySessionMessage(event.sessionId)
      return
    }

    if (event.type === 'timeline.changed') {
      if (authStore.user?.role === 'ADMIN') return
      showNotification('危机时间线更新', event.entryType === 'SITUATION' ? '新的局势更新已发布' : '新的新闻已发布', 'mun-timeline')
      return
    }

    if (event.type === 'directive.new') {
      if (!authStore.isAcademic) return
      showNotification('新指令提交', '有代表提交了新的指令', 'mun-directive-new')
      return
    }

    if (event.type === 'directive.changed') {
      if (authStore.user?.role !== 'DELEGATE') return
      if (event.targetId !== authStore.cabinetId) return
      showNotification('指令已审核', event.status === 'ACCEPTED' ? '您的指令已被接受' : '您的指令已被驳回', `mun-directive-status-${event.ts}`)
      return
    }

    if (event.type === 'asym.message.new') {
      if (event.senderType === 'CABINET' && authStore.isAcademic) {
        showNotification('内阁消息', '收到一条来自内阁的新消息', `mun-asym-${event.ts}`)
        return
      }
      if (event.senderType === 'ACADEMIC' && authStore.user?.role === 'DELEGATE' && event.targetId === authStore.cabinetId) {
        showNotification('学术组消息', '学术组发来一条消息', `mun-asym-${event.ts}`)
        return
      }
      return
    }

    if (event.type === 'period.changed') {
      // 会期切换：仅由页面订阅刷新展示，不弹浏览器通知
      return
    }

    if (event.type === 'session.changed') {
      void refreshSessions()
    }
  }

  // —— init 异步引导：设置 → 会话 → 权限 FSM（顺序即约定） ——
  async function bootstrap(): Promise<void> {
    try {
      const settings = await notificationsApi.getSettings()
      enabled.value = settings.enabled
      dndSessionIds.value = new Set(settings.dndSessionIds)
    } catch {
      // 静默：保持默认（enabled=true, dnd 为空）
    }
    await refreshSessions()
    if (enabled.value) {
      await requestPermission()
    }
  }

  function init(): void {
    if (initialized) return
    initialized = true
    // 1. Notification 能力检测
    if (!('Notification' in window)) {
      permission.value = 'unsupported'
    } else {
      permission.value = window.Notification.permission
    }
    // 2. 先订阅后取数
    unsubscribe = eventsStore.subscribe(handleEvent)
    // 3. 连接模式：polling → 启动 15s 增量检测 + 上报；sse → 停止
    stopModeWatch = watch(() => eventsStore.mode, applyMode, { immediate: true })
    // 页面恢复可见时立即补一次轮询检测
    document.addEventListener('visibilitychange', handleVisibilityChange)
    // 4-6. 设置 → 会话 → 权限 FSM
    void bootstrap()
  }

  function destroy(): void {
    initialized = false
    // 清推送节流状态（无定时器，仅重置计数与冷却时间戳）
    throttle.clear()
    // 清轮询定时器
    stopPollDetection()
    // 退订 SSE
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    // 停止 mode watch
    if (stopModeWatch) {
      stopModeWatch()
      stopModeWatch = null
    }
    // 移除 visibilitychange 监听
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    // reset 状态到默认（不触碰 Notification.permission）
    enabled.value = true
    dndSessionIds.value = new Set()
    permission.value = 'default'
    viewingSessionId.value = null
    sessionCache = new Map()
    sessionSnapshot = new Map()
  }

  function setViewingSession(id: string | null): void {
    viewingSessionId.value = id
  }

  async function toggleEnabled(v: boolean): Promise<void> {
    const prev = enabled.value
    enabled.value = v
    try {
      await notificationsApi.setEnabled(v)
    } catch {
      // 失败回滚 + 静默
      enabled.value = prev
      return
    }
    if (v) {
      // 重新开启：允许再次提醒
      try {
        localStorage.removeItem(DISMISS_KEY)
      } catch {
        // 忽略
      }
      await requestPermission()
    }
  }

  async function toggleDnd(sessionId: string): Promise<void> {
    const muted = !dndSessionIds.value.has(sessionId)
    const next = new Set(dndSessionIds.value)
    if (muted) next.add(sessionId)
    else next.delete(sessionId)
    dndSessionIds.value = next
    try {
      await notificationsApi.setDnd(sessionId, muted)
    } catch (err) {
      // 失败回滚并上抛（由调用方提示）
      const rollback = new Set(dndSessionIds.value)
      if (muted) rollback.delete(sessionId)
      else rollback.add(sessionId)
      dndSessionIds.value = rollback
      throw err
    }
  }

  return {
    enabled,
    dndSessionIds,
    permission,
    viewingSessionId,
    init,
    destroy,
    setViewingSession,
    toggleEnabled,
    toggleDnd,
    requestPermission,
  }
})
