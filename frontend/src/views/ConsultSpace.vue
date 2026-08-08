<!--
  MUNFMS - A dedicated file management tool for organizing and sharing documents in MUN meetings.
  Copyright (C) 2026 iXiQiu (@ixiqiu)
  
  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.
  
  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.
  
  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
-->

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument, Edit, Plus, Upload } from '@element-plus/icons-vue'
import { cabinetsApi, filesApi, sessionsApi } from '../api'
import { useAuthStore } from '../stores/auth'
import { useEventsStore, type SseMode } from '../stores/events'
import type { Cabinet, CabinetType, FileEntity, Message, Session } from '../types'

const auth = useAuthStore()
const eventsStore = useEventsStore()
// 学术组与管理员拥有全部群聊的查看与解散权限
const isManager = computed(() => auth.user?.role === 'ACADEMIC' || auth.user?.role === 'ADMIN')
const myCabinetId = computed(() => auth.cabinetId)
const myUserId = computed(() => auth.user?.id ?? '')

// ---------- 会话列表 ----------
const sessions = ref<Session[]>([])
const currentSessionId = ref<string | null>(null)
const messageListRef = ref<HTMLElement | null>(null)

// ---------- 移动端适配（<768px 时会话列表变为覆盖式抽屉） ----------
const isMobile = ref(false)
function updateIsMobile() {
  isMobile.value = window.innerWidth < 768
}
const sessionPanelOpen = ref(false)

const currentSession = computed(
  () => sessions.value.find((s) => s.id === currentSessionId.value) || null,
)

function groupName(session: Session): string {
  if (session.name) return session.name
  const names = session.members.map((m) => m.name)
  if (!names.length) return '未知群聊'
  return names.slice(0, 2).join(' · ')
}

function memberNames(session: Session): string {
  const names = session.members.map((m) => m.name)
  return names.length ? names.join(' · ') : '暂无成员'
}

async function refreshSessions() {
  try {
    sessions.value = await sessionsApi.list()
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}

// ---------- 消息 ----------
const messages = ref<Message[]>([])

async function loadMessages(sessionId: string, behavior: ScrollBehavior = 'auto') {
  if (sessionId !== currentSessionId.value) return
  try {
    const list = await sessionsApi.messages(sessionId)
    // 仅在消息数量增长时刷新并滚动到底部（轮询时不重复滚动）
    if (list.length !== messages.value.length) {
      messages.value = list
      nextTick(() => scrollToBottom(behavior))
    }
    preloadImageUrls(list)
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}

function scrollToBottom(behavior: ScrollBehavior = 'auto') {
  const el = messageListRef.value
  if (el) el.scrollTo({ top: el.scrollHeight, behavior })
}

// ---------- 定时轮询 ----------
let sessionTimer: number | undefined
let messageTimer: number | undefined

function startSessionTimer() {
  if (sessionTimer !== undefined) return
  sessionTimer = window.setInterval(() => refreshSessions(), 3000)
}

function stopSessionTimer() {
  if (sessionTimer !== undefined) {
    window.clearInterval(sessionTimer)
    sessionTimer = undefined
  }
}

function startMessageTimer() {
  if (messageTimer !== undefined) return
  messageTimer = window.setInterval(() => {
    if (currentSessionId.value) loadMessages(currentSessionId.value, 'smooth')
  }, 3000)
}

function stopMessageTimer() {
  if (messageTimer !== undefined) {
    window.clearInterval(messageTimer)
    messageTimer = undefined
  }
}

watch(currentSessionId, (id) => {
  revokeAllImageUrls()
  if (id) {
    messages.value = []
    loadMessages(id, 'auto')
    if (eventsStore.mode === 'polling') startMessageTimer()
  } else {
    stopMessageTimer()
    messages.value = []
  }
})

// SSE 连接断开时回退轮询，恢复后自动切回 SSE
function applyMode(mode: SseMode) {
  if (mode === 'polling') {
    startSessionTimer()
    if (currentSessionId.value) startMessageTimer()
  } else {
    stopSessionTimer()
    stopMessageTimer()
  }
}

watch(() => eventsStore.mode, applyMode, { immediate: true })

let unsubscribe: (() => void) | undefined

onMounted(() => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
  refreshSessions()
  unsubscribe = eventsStore.subscribe((e) => {
    if (e.type === 'message.new') {
      refreshSessions()
      if (e.sessionId && e.sessionId === currentSessionId.value && e.actorId !== myUserId.value) {
        loadMessages(e.sessionId, 'smooth')
      }
    } else if (e.type === 'session.changed') {
      refreshSessions()
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
  unsubscribe?.()
  stopSessionTimer()
  stopMessageTimer()
  revokeAllImageUrls()
})

function selectSession(session: Session) {
  if (session.id === currentSessionId.value) return
  currentSessionId.value = session.id
  if (isMobile.value) sessionPanelOpen.value = false
}

// ---------- 新建群聊 ----------
const dialogVisible = ref(false)
const creating = ref(false)
const selectedCabinetIds = ref<string[]>([])
const groupNameInput = ref('')
const cabinets = ref<Cabinet[]>([])

const candidateCabinets = computed(() =>
  cabinets.value.filter((c) => c.id !== myCabinetId.value),
)

const canCreate = computed(() => selectedCabinetIds.value.length >= 1)

async function openCreateDialog() {
  selectedCabinetIds.value = []
  groupNameInput.value = ''
  dialogVisible.value = true
  try {
    cabinets.value = await cabinetsApi.list()
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}

async function createSession() {
  if (!canCreate.value) {
    ElMessage.warning('请至少选择 1 个内阁')
    return
  }
  creating.value = true
  try {
    const name = groupNameInput.value.trim()
    const session = await sessionsApi.create(
      selectedCabinetIds.value,
      name ? name : undefined,
    )
    await refreshSessions()
    currentSessionId.value = session.id
    dialogVisible.value = false
    ElMessage.success('群聊创建成功')
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    creating.value = false
  }
}

// ---------- 修改群名 ----------
const renameDialogVisible = ref(false)
const renaming = ref(false)
const renameInput = ref('')

function openRenameDialog() {
  const session = currentSession.value
  if (!session) return
  renameInput.value = session.name || groupName(session)
  renameDialogVisible.value = true
}

async function renameSession() {
  const sessionId = currentSessionId.value
  const name = renameInput.value.trim()
  if (!sessionId || !name) {
    ElMessage.warning('群名不能为空')
    return
  }
  renaming.value = true
  try {
    await sessionsApi.rename(sessionId, name)
    await refreshSessions()
    renameDialogVisible.value = false
    ElMessage.success('群名修改成功')
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    renaming.value = false
  }
}

// ---------- 解散 / 退出群聊 ----------
const closingSession = ref(false)

async function dissolveCurrentSession() {
  const session = currentSession.value
  if (!session || !isManager.value) return
  try {
    await ElMessageBox.confirm(
      `解散后将删除「${groupName(session)}」的全部消息与文件，且无法恢复。确定解散吗？`,
      '解散群聊',
      { type: 'warning', confirmButtonText: '确认解散', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  closingSession.value = true
  try {
    await sessionsApi.dissolve(session.id)
    currentSessionId.value = null
    await refreshSessions()
    ElMessage.success('群聊已解散')
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    closingSession.value = false
  }
}

async function leaveCurrentSession() {
  const session = currentSession.value
  if (!session || isManager.value) return
  try {
    await ElMessageBox.confirm(
      `退出后你将不再看到「${groupName(session)}」的群聊与消息，群聊及其中文件将保留给学术组审议。确定退出吗？`,
      '退出群聊',
      { type: 'warning', confirmButtonText: '确认退出', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  closingSession.value = true
  try {
    await sessionsApi.leave(session.id)
    currentSessionId.value = null
    await refreshSessions()
    ElMessage.success('已退出群聊')
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    closingSession.value = false
  }
}

// ---------- 发送文件 ----------
const fileInput = ref<HTMLInputElement | null>(null)
const sending = ref(false)

function triggerFileSelect() {
  if (!currentSessionId.value) {
    ElMessage.warning('请先选择群聊')
    return
  }
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  const sessionId = currentSessionId.value
  if (!file || !sessionId) return
  sending.value = true
  try {
    await sessionsApi.sendMessage(sessionId, { file })
    ElMessage.success('文件发送成功')
    await loadMessages(sessionId, 'smooth')
    await refreshSessions()
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    sending.value = false
    input.value = ''
  }
}

// ---------- 发送文字消息 ----------
const chatText = ref('')
const sendingText = ref(false)

function onTextKeydown(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void sendText()
  }
}

async function sendText() {
  const sessionId = currentSessionId.value
  const text = chatText.value.trim()
  if (!sessionId) {
    ElMessage.warning('请先选择群聊')
    return
  }
  if (!text) return
  sendingText.value = true
  try {
    await sessionsApi.sendMessage(sessionId, { content: text })
    chatText.value = ''
    await loadMessages(sessionId, 'smooth')
    await refreshSessions()
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    sendingText.value = false
  }
}

// ---------- 粘贴即上传（带预览确认） ----------
const pasteDialogVisible = ref(false)
const pasteFile = ref<File | null>(null)
const pastePreviewUrl = ref('')
const sendingPaste = ref(false)

function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.kind !== 'file') continue
    const file = item.getAsFile()
    if (!file) continue
    e.preventDefault()
    openPasteDialog(file)
    return
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function openPasteDialog(file: File) {
  if (pastePreviewUrl.value) URL.revokeObjectURL(pastePreviewUrl.value)
  pasteFile.value = file
  pastePreviewUrl.value = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
  pasteDialogVisible.value = true
}

function closePasteDialog() {
  if (pastePreviewUrl.value) URL.revokeObjectURL(pastePreviewUrl.value)
  pastePreviewUrl.value = ''
  pasteFile.value = null
  pasteDialogVisible.value = false
}

async function confirmPasteSend() {
  const sessionId = currentSessionId.value
  const file = pasteFile.value
  if (!sessionId || !file) return
  sendingPaste.value = true
  try {
    const caption = chatText.value.trim()
    await sessionsApi.sendMessage(sessionId, caption ? { file, content: caption } : { file })
    chatText.value = ''
    pasteDialogVisible.value = false
    ElMessage.success('文件发送成功')
    await loadMessages(sessionId, 'smooth')
    await refreshSessions()
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    sendingPaste.value = false
  }
}

// ---------- 从内阁复制文件 ----------
const cabinetFiles = ref<FileEntity[]>([])
const cabinetFilesLoading = ref(false)
const copyDialogVisible = ref(false)
const copying = ref(false)

async function openCopyDialog() {
  copyDialogVisible.value = true
  cabinetFilesLoading.value = true
  try {
    cabinetFiles.value = await filesApi.list('CABINET')
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    cabinetFilesLoading.value = false
  }
}

async function copyFromCabinet(file: FileEntity) {
  const sessionId = currentSessionId.value
  if (!sessionId) return
  copying.value = true
  try {
    await sessionsApi.copyFileToSession(sessionId, file.id)
    copyDialogVisible.value = false
    ElMessage.success('文件已复制到群聊')
    await loadMessages(sessionId, 'smooth')
    await refreshSessions()
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    copying.value = false
  }
}

// ---------- 图片内联预览 ----------
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp']
const imageUrlMap = ref<Record<string, string>>({})

function isImageFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTENSIONS.includes(ext)
}

function hasImage(m: Message): boolean {
  return !!m.file && isImageFile(m.file.fileName)
}

async function loadImageUrl(m: Message) {
  if (!m.file || !isImageFile(m.file.fileName) || imageUrlMap.value[m.id]) return
  try {
    const res = await sessionsApi.downloadMessage(m.id)
    if (imageUrlMap.value[m.id]) return
    if (m.sessionId !== currentSessionId.value) return
    imageUrlMap.value[m.id] = URL.createObjectURL(res.data)
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}

function preloadImageUrls(list: Message[]) {
  for (const m of list) {
    if (hasImage(m) && !imageUrlMap.value[m.id]) void loadImageUrl(m)
  }
}

function revokeAllImageUrls() {
  for (const url of Object.values(imageUrlMap.value)) URL.revokeObjectURL(url)
  imageUrlMap.value = {}
}

// ---------- 下载 ----------
async function downloadMessage(message: Message) {
  if (!message.file) return
  try {
    const res = await sessionsApi.downloadMessage(message.id)
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = message.file.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}

// ---------- 展示工具 ----------
const typeLabelMap: Record<CabinetType, string> = {
  CABINET: '内阁',
  BUREAU: '部委',
  CRISIS: '危机',
}

function typeLabel(type?: CabinetType): string {
  return type ? typeLabelMap[type] : ''
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (d.toDateString() === new Date().toDateString()) return `${hh}:${mm}`
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')} ${hh}:${mm}`
}

function formatMessageTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function isOwn(message: Message): boolean {
  return (
    !!myCabinetId.value &&
    message.senderType === 'CABINET' &&
    message.senderCabinetId === myCabinetId.value
  )
}

function senderLabel(m: Message): string {
  const name = m.uploaderName || m.senderName || '未知'
  if (m.senderType === 'ACADEMIC') return `${name}（学术）`
  if (m.uploaderCabinetName) return `${name}（${m.uploaderCabinetName}）`
  return name
}
</script>

<template>
  <div class="page-card consult-page">
    <div class="consult-layout">
      <!-- 移动端：点击遮罩（右侧空白）关闭会话列表 -->
      <div
        v-if="isMobile && sessionPanelOpen"
        class="session-mask"
        @click="sessionPanelOpen = false"
      />
      <!-- 左侧：群聊列表 -->
      <div class="session-panel" :class="{ open: sessionPanelOpen }">
        <div class="session-panel-header">
          <span class="session-panel-title">磋商群聊</span>
          <el-button
            v-if="!isManager"
            type="primary"
            size="small"
            :icon="Plus"
            @click="openCreateDialog"
          >
            新建群
          </el-button>
        </div>
        <div v-if="sessions.length" class="session-list">
          <div
            v-for="s in sessions"
            :key="s.id"
            class="session-item"
            :class="{ active: s.id === currentSessionId }"
            @click="selectSession(s)"
          >
            <el-badge
              :value="s.unreadCount || 0"
              :hidden="!(s.unreadCount && s.unreadCount > 0)"
              :max="99"
            >
              <el-avatar :size="40" class="session-avatar">
                {{ groupName(s).charAt(0) }}
              </el-avatar>
            </el-badge>
            <div class="session-meta">
              <div class="session-name-row">
                <span class="session-name" :title="groupName(s)">{{ groupName(s) }}</span>
                <span class="session-time">{{ formatTime(s.lastMessageTime) }}</span>
              </div>
              <div class="session-subtitle" :title="memberNames(s)">{{ memberNames(s) }}</div>
            </div>
          </div>
        </div>
        <div v-else class="session-empty">
          <el-empty
            :description="isManager ? '暂无群聊' : '暂无群聊，点击新建群发起磋商'"
            :image-size="80"
          />
        </div>
      </div>

      <!-- 右侧：聊天窗口 -->
      <div class="chat-panel">
        <template v-if="currentSession">
          <div class="chat-header">
            <el-button
              v-if="isMobile"
              class="session-toggle-btn"
              circle
              @click="sessionPanelOpen = true"
            >
              <el-icon><Menu /></el-icon>
            </el-button>
            <div class="chat-target">
              <span class="chat-target-name" :title="groupName(currentSession)">
                {{ groupName(currentSession) }}
              </span>
              <span class="chat-target-type">{{ currentSession.members.length }} 人</span>
              <el-button
                v-if="!isManager"
                link
                type="primary"
                size="small"
                :icon="Edit"
                @click="openRenameDialog"
              >
                改群名
              </el-button>
              <el-button
                v-if="!isManager"
                link
                type="danger"
                size="small"
                :loading="closingSession"
                @click="leaveCurrentSession"
              >
                退出群聊
              </el-button>
              <template v-else>
                <el-tag size="small" type="info" class="academic-header-tag">
                  {{ auth.user?.role === 'ADMIN' ? '管理员' : '学团身份' }} · 全部群聊可见
                </el-tag>
                <el-button
                  link
                  type="danger"
                  size="small"
                  :loading="closingSession"
                  @click="dissolveCurrentSession"
                >
                  解散群聊
                </el-button>
              </template>
            </div>
            <el-button
              v-if="!isManager"
              type="primary"
              size="small"
              :icon="Plus"
              @click="openCreateDialog"
            >
              新建群
            </el-button>
          </div>

          <div ref="messageListRef" class="message-list">
            <div v-if="!messages.length" class="message-empty">
              <el-empty description="暂无消息，发送文字或文件开始磋商" :image-size="80" />
            </div>
            <div
              v-for="m in messages"
              :key="m.id"
              class="message-row"
              :class="{ own: isOwn(m) }"
            >
              <div class="message-sender">
                <span class="sender-name">{{ senderLabel(m) }}</span>
              </div>
              <div class="message-bubble" :class="{ 'with-image': hasImage(m) }">
                <div v-if="m.content" class="text-bubble">{{ m.content }}</div>
                <template v-if="m.file">
                  <template v-if="hasImage(m)">
                    <div class="image-container">
                      <el-image
                        v-if="imageUrlMap[m.id]"
                        :src="imageUrlMap[m.id]"
                        :preview-src-list="[imageUrlMap[m.id]]"
                        preview-teleported
                        fit="contain"
                        class="inline-image"
                      >
                        <template #error>
                          <div class="image-fallback">图片加载失败</div>
                        </template>
                      </el-image>
                      <div v-else class="image-fallback">图片加载中…</div>
                      <div class="image-meta">
                        <span class="file-name">{{ m.file.fileName }}</span>
                        <span class="file-hint">点击预览</span>
                      </div>
                    </div>
                  </template>
                  <div v-else class="file-card" @click="downloadMessage(m)">
                    <el-icon class="file-icon"><Document /></el-icon>
                    <div class="file-info">
                      <span class="file-name">{{ m.file.fileName }}</span>
                      <span class="file-hint">点击下载</span>
                    </div>
                    <el-icon class="download-icon"><Download /></el-icon>
                  </div>
                </template>
                <div class="message-time">{{ formatMessageTime(m.createdAt) }}</div>
              </div>
            </div>
          </div>

          <div class="chat-toolbar">
            <div class="chat-input-row">
              <el-input
                v-model="chatText"
                type="textarea"
                :rows="1"
                autosize
                resize="none"
                class="chat-text-input"
                placeholder="输入文字，Enter 发送 / Shift+Enter 换行；支持粘贴图片、文件直接上传"
                :disabled="!currentSessionId || sendingText"
                @keydown="onTextKeydown"
                @paste="onPaste"
              />
              <el-button
                type="primary"
                class="chat-send-btn"
                :loading="sendingText"
                :disabled="!currentSessionId || !chatText.trim()"
                @click="sendText"
              >
                发送
              </el-button>
            </div>
            <div class="chat-actions-row">
              <el-button
                type="primary"
                plain
                :loading="sending"
                :disabled="!currentSessionId"
                :icon="Upload"
                @click="triggerFileSelect"
              >
                发送文件
              </el-button>
              <el-button
                v-if="!isManager"
                plain
                :icon="CopyDocument"
                :loading="copying"
                :disabled="!currentSessionId"
                @click="openCopyDialog"
              >
                从内阁复制
              </el-button>
              <span class="toolbar-hint">
                <span>支持粘贴图片/文件直接上传</span>
                <span class="toolbar-hint-sep">·</span>
                <span>
                  {{
                    eventsStore.mode === 'polling' ? '实时连接已断开，消息每 3 秒轮询刷新' : '消息实时更新'
                  }}
                </span>
              </span>
            </div>
            <input ref="fileInput" type="file" class="hidden-file-input" @change="onFileChange" />
          </div>
        </template>

        <div v-else class="chat-placeholder">
          <div v-if="isMobile" class="placeholder-actions">
            <el-button type="primary" @click="sessionPanelOpen = true">选择群聊</el-button>
          </div>
          <el-empty description="选择左侧群聊开始磋商" :image-size="120" />
        </div>
      </div>
    </div>

    <!-- 新建群聊对话框 -->
    <el-dialog v-model="dialogVisible" title="新建群聊" width="480px" :close-on-click-modal="false">
      <div class="dialog-body">
        <el-alert
          v-if="candidateCabinets.length < 1"
          type="warning"
          :closable="false"
          title="内阁不足，无法创建群聊"
          show-icon
        />
        <template v-else>
          <p class="dialog-tip">选择群成员（至少 1 个内阁，自己会自动加入）</p>
          <el-select
            v-model="selectedCabinetIds"
            multiple
            filterable
            placeholder="请选择群成员"
            style="width: 100%"
          >
            <el-option
              v-for="c in candidateCabinets"
              :key="c.id"
              :label="`${c.name}（${typeLabel(c.type)}）`"
              :value="c.id"
            />
          </el-select>
          <p class="dialog-tip dialog-tip-top">群名（可选）</p>
          <el-input
            v-model="groupNameInput"
            placeholder="留空则自动以成员名命名"
            maxlength="30"
            clearable
          />
          <p v-if="!canCreate" class="dialog-hint">
            请至少再选择 1 个内阁
          </p>
        </template>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="creating"
          :disabled="!canCreate"
          @click="createSession"
        >
          确认创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 修改群名对话框 -->
    <el-dialog
      v-model="renameDialogVisible"
      title="修改群名"
      width="420px"
      :close-on-click-modal="false"
    >
      <div class="dialog-body">
        <el-input
          v-model="renameInput"
          placeholder="请输入群名"
          maxlength="30"
          clearable
          @keyup.enter="renameSession"
        />
      </div>
      <template #footer>
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="renaming" @click="renameSession">保存</el-button>
      </template>
    </el-dialog>

    <!-- 粘贴上传预览对话框 -->
    <el-dialog
      v-model="pasteDialogVisible"
      title="粘贴上传预览"
      width="440px"
      :close-on-click-modal="false"
      @close="closePasteDialog"
    >
      <div class="paste-dialog-body">
        <template v-if="pasteFile">
          <div class="paste-preview">
            <img
              v-if="pastePreviewUrl"
              :src="pastePreviewUrl"
              alt="粘贴内容预览"
              class="paste-preview-image"
            />
            <div v-else class="paste-preview-placeholder">
              <el-icon :size="44" color="#c0c4cc"><Document /></el-icon>
            </div>
          </div>
          <div class="paste-file-meta">
            <span class="paste-file-name" :title="pasteFile.name">{{ pasteFile.name }}</span>
            <span class="paste-file-size">{{ formatSize(pasteFile.size) }}</span>
          </div>
          <div class="paste-caption">
            <el-input
              v-model="chatText"
              type="textarea"
              :rows="2"
              resize="none"
              placeholder="附言（可选），随文件一并发送"
            />
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="closePasteDialog">取消</el-button>
        <el-button type="primary" :loading="sendingPaste" @click="confirmPasteSend">发送</el-button>
      </template>
    </el-dialog>

    <!-- 从内阁复制文件对话框 -->
    <el-dialog
      v-model="copyDialogVisible"
      title="从内阁复制文件"
      width="460px"
      :close-on-click-modal="false"
    >
      <div v-loading="cabinetFilesLoading" class="copy-cabinet-body">
        <template v-if="cabinetFiles.length">
          <div
            v-for="f in cabinetFiles"
            :key="f.id"
            class="copy-file-item"
            @click="copyFromCabinet(f)"
          >
            <el-icon class="copy-file-icon"><Document /></el-icon>
            <div class="copy-file-info">
              <div class="copy-file-name">{{ f.fileName }}</div>
              <div class="copy-file-meta">上传于 {{ formatTime(f.createdAt) }}</div>
            </div>
            <el-button
              type="primary"
              size="small"
              :loading="copying"
              @click.stop="copyFromCabinet(f)"
            >
              复制
            </el-button>
          </div>
        </template>
        <el-empty
          v-else-if="!cabinetFilesLoading"
          description="内阁空间暂无文件，请先在内阁空间上传"
          :image-size="80"
        />
      </div>
      <template #footer>
        <el-button @click="copyDialogVisible = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.consult-page {
  height: calc(100vh - 140px);
  padding: 0;
  overflow: hidden;
  display: flex;
}

.consult-layout {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* ---------- 左侧群聊列表 ---------- */
.session-panel {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.session-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f2f5;
}

.session-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
  min-height: 0;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.session-item:hover {
  background: #f5f7fa;
}

.session-item.active {
  background: #ecf5ff;
}

.session-avatar {
  background: #409eff;
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
}

.session-meta {
  flex: 1;
  min-width: 0;
}

.session-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.session-name {
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  font-size: 11px;
  color: #909399;
  flex-shrink: 0;
}

.session-subtitle {
  margin-top: 3px;
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ---------- 右侧聊天窗口 ---------- */
.chat-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.chat-target {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.chat-target-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

.chat-target-type {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.academic-header-tag {
  flex-shrink: 0;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.message-empty {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.message-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.message-row.own {
  align-items: flex-end;
}

.message-sender {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #909399;
}

.message-row.own .sender-name {
  color: #409eff;
}

.message-bubble {
  max-width: 60%;
  background: #fff;
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 1px 3px rgba(0, 21, 41, 0.08);
}

.message-row.own .message-bubble {
  background: #409eff;
  color: #fff;
}

.file-card {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px 0;
  min-width: 200px;
  max-width: 320px;
  border-radius: 6px;
  transition: opacity 0.15s;
}

.file-card:hover {
  opacity: 0.85;
}

.file-icon {
  font-size: 22px;
  color: #409eff;
  flex-shrink: 0;
}

.message-row.own .file-icon {
  color: #fff;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-hint {
  font-size: 11px;
  opacity: 0.7;
}

.download-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.message-time {
  font-size: 11px;
  color: #909399;
  margin-top: 6px;
  text-align: right;
}

.message-row.own .message-time {
  color: rgba(255, 255, 255, 0.75);
}

.chat-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
}

.chat-input-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.chat-text-input {
  flex: 1;
}

.chat-actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #909399;
}

.toolbar-hint-sep {
  color: #dcdfe6;
}

/* 文字消息气泡 */
.text-bubble {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 图片消息：气泡改回白底，保证图片观感正常 */
.message-bubble.with-image {
  background: #fff;
  color: #303133;
}

.message-row.own .message-bubble.with-image {
  background: #fff;
  color: #303133;
}

.message-row.own .message-bubble.with-image .message-time {
  color: #909399;
}

/* 图片内联预览 */
.image-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.inline-image {
  display: block;
  max-width: 240px;
  max-height: 180px;
  border-radius: 8px;
  cursor: zoom-in;
}

.inline-image :deep(.el-image__inner) {
  width: auto;
  height: auto;
  max-width: 240px;
  max-height: 180px;
  display: block;
  border-radius: 8px;
}

.image-fallback {
  width: 120px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
  font-size: 12px;
  color: #909399;
}

.image-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  line-height: 1.4;
}

.image-meta .file-name {
  font-size: 12px;
}

/* 粘贴上传预览对话框 */
.paste-dialog-body {
  padding-top: 4px;
}

.paste-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
  overflow: hidden;
}

.paste-preview-image {
  max-width: 100%;
  max-height: 260px;
  object-fit: contain;
  border-radius: 4px;
}

.paste-preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}

.paste-file-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.paste-file-name {
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.paste-file-size {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.paste-caption {
  margin-top: 12px;
}

.hidden-file-input {
  display: none;
}

.chat-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ---------- 滚动条 ---------- */
.session-list::-webkit-scrollbar,
.message-list::-webkit-scrollbar {
  width: 6px;
}

.session-list::-webkit-scrollbar-thumb,
.message-list::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.session-list::-webkit-scrollbar-track,
.message-list::-webkit-scrollbar-track {
  background: transparent;
}

/* ---------- 对话框 ---------- */
.dialog-body {
  padding-top: 4px;
}

.dialog-tip {
  font-size: 13px;
  color: #909399;
  margin-bottom: 10px;
}

.dialog-tip-top {
  margin-top: 12px;
}

.dialog-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #e6a23c;
}

/* 移动端「会话」切换按钮（仅在 isMobile 时渲染，桌面端无影响） */
.session-toggle-btn {
  flex-shrink: 0;
}

/* ---------- 移动端适配（<768px）：会话列表变为覆盖式抽屉 ---------- */
@media (max-width: 768px) {
  .consult-layout {
    position: relative;
  }

  /* 点击右侧空白处关闭会话列表（z-index 低于面板 30） */
  .session-mask {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 20;
    background: rgba(0, 0, 0, 0.3);
  }

  .session-panel {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 80%;
    max-width: 300px;
    z-index: 30;
    background: #fff;
    border-right: 1px solid #e4e7ed;
    box-shadow: 4px 0 16px rgba(0, 21, 41, 0.12);
    transform: translateX(-105%);
    transition: transform 0.25s ease;
  }

  .session-panel.open {
    transform: translateX(0);
  }

  .chat-panel {
    width: 100%;
  }

  .chat-target-name {
    max-width: 130px;
  }

  .message-bubble {
    max-width: 82%;
  }

  .inline-image,
  .inline-image :deep(.el-image__inner) {
    max-width: 100%;
  }

  .file-card {
    max-width: 70vw;
  }

  .toolbar-hint {
    font-size: 11px;
  }

  .chat-placeholder {
    flex-direction: column;
    gap: 16px;
  }

  .placeholder-actions {
    display: flex;
    justify-content: center;
  }
}

/* 从内阁复制文件对话框 */
.copy-cabinet-body {
  min-height: 120px;
  max-height: 50vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.copy-file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.copy-file-item:hover {
  background: #f5f7fa;
}

.copy-file-icon {
  font-size: 20px;
  color: #909399;
  flex-shrink: 0;
}

.copy-file-info {
  flex: 1;
  min-width: 0;
}

.copy-file-name {
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.copy-file-meta {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}
</style>
