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
import { ref } from 'vue'
import { eventsApi } from '../api/events'
import type { SseEvent } from '../types'

export type SseMode = 'sse' | 'polling'
export type SseStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'polling'

const MAX_RETRIES = 3
const RETRY_DELAYS = [3000, 6000, 12000]
const POLLING_PROBE_INTERVAL = 30000

export const useEventsStore = defineStore('events', () => {
  const mode = ref<SseMode>('sse')
  const status = ref<SseStatus>('idle')
  const bannerDismissed = ref(false)

  // 私有：连接与状态机内部状态
  let es: EventSource | null = null
  let retryCount = 0
  let reconnectTimer: number | undefined
  let pollingProbeTimer: number | undefined
  // destroy() 会使 epoch 自增，失效所有已排队的回调（防销毁竞态）
  let epoch = 0
  const listeners = new Set<(e: SseEvent) => void>()

  function clearReconnectTimer(): void {
    if (reconnectTimer !== undefined) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = undefined
    }
  }

  function clearProbeTimer(): void {
    if (pollingProbeTimer !== undefined) {
      window.clearInterval(pollingProbeTimer)
      pollingProbeTimer = undefined
    }
  }

  // 回退到轮询模式：磋商空间收到 mode==='polling' 信号后自行启动轮询定时器；
  // 此处仅启动 30s 探测，探测成功由 onopen 自动切回 sse 并停止探测。
  function switchToPolling(): void {
    mode.value = 'polling'
    status.value = 'polling'
    if (pollingProbeTimer === undefined) {
      const myEpoch = epoch
      pollingProbeTimer = window.setInterval(() => {
        if (myEpoch !== epoch) return
        void connect()
      }, POLLING_PROBE_INTERVAL)
    }
  }

  // 一次连接尝试失败：探测失败保持轮询等下一次探测；否则退避重连，3 次后回退轮询。
  function handleConnectFailure(): void {
    if (mode.value === 'polling') {
      status.value = 'polling'
      return
    }
    retryCount += 1
    if (retryCount < MAX_RETRIES) {
      status.value = 'reconnecting'
      clearReconnectTimer()
      const myEpoch = epoch
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = undefined
        if (myEpoch !== epoch) return
        void connect()
      }, RETRY_DELAYS[retryCount - 1])
    } else {
      switchToPolling()
    }
  }

  // 换新票据 → 新建 EventSource。票据一次性，绝不放任 EventSource 自动重连旧 URL。
  async function connect(): Promise<void> {
    if (es !== null || status.value === 'connecting') return
    const myEpoch = epoch
    status.value = 'connecting'

    let ticket: string
    try {
      ticket = await eventsApi.getTicket()
    } catch {
      // 取票失败视为一次失败尝试；401 已由 axios 拦截器处理跳登录。
      if (myEpoch !== epoch) return
      handleConnectFailure()
      return
    }
    if (myEpoch !== epoch) return // destroy() 在取票期间执行

    const source = new EventSource('/api/events/stream?ticket=' + encodeURIComponent(ticket))
    es = source

    source.onopen = () => {
      if (myEpoch !== epoch) return
      retryCount = 0
      mode.value = 'sse'
      status.value = 'connected'
      clearProbeTimer()
    }
    source.onmessage = (ev: MessageEvent) => {
      if (myEpoch !== epoch) return
      try {
        const event = JSON.parse(ev.data) as SseEvent
        listeners.forEach((fn) => fn(event))
      } catch {
        // 忽略畸形载荷（心跳注释行不会触发 onmessage）
      }
    }
    source.onerror = () => {
      if (myEpoch !== epoch) return
      source.close()
      if (es === source) es = null
      handleConnectFailure()
    }
  }

  function subscribe(fn: (e: SseEvent) => void): () => void {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }

  function dismissBanner(): void {
    bannerDismissed.value = true
  }

  // 幂等：仅首次（或 destroy 之后）触发连接
  function init(): void {
    if (status.value !== 'idle') return
    void connect()
  }

  function destroy(): void {
    epoch += 1
    if (es !== null) {
      es.close()
      es = null
    }
    clearReconnectTimer()
    clearProbeTimer()
    listeners.clear()
    retryCount = 0
    mode.value = 'sse'
    status.value = 'idle'
  }

  return { mode, status, bannerDismissed, subscribe, dismissBanner, init, destroy }
})
