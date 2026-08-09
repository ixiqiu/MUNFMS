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
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'
import { Document, Download, Menu, Upload } from '@element-plus/icons-vue'
import { asymApi } from '../api/asym'
import type { AsymChannel } from '../api/asym'
import { useAuthStore } from '../stores/auth'
import { useEventsStore, type SseMode } from '../stores/events'
import type { AsymMessage } from '../types'
import { downloadBlob, isImageFile } from '../utils/file'

const auth = useAuthStore()
const eventsStore = useEventsStore()

// 学术组与全部内阁对话；代表固定本内阁单通道
const isAcademic = computed(() => auth.user?.role === 'ACADEMIC')
const myCabinetId = computed(() => auth.cabinetId)
const myUserId = computed(() => auth.user?.id ?? '')

// ---------- 频道列表 ----------
const channels = ref<AsymChannel[]>([])
const currentCabinetId = ref<string | null>(null)
const messageListRef = ref<HTMLElement | null>(null)

// ---------- 移动端适配（<768px 时频道列表变为覆盖式抽屉） ----------
const isMobile = ref(false)
function updateIsMobile() {
  isMobile.value = window.innerWidth < 768
}
const sessionPanelOpen = ref(false)

const currentChannel = computed(
  () => channels.value.find((c) => c.cabinetId === currentCabinetId.value) || null,
)

async function refreshChannels() {
  try {
    const res = await asymApi.channels()
    channels.value = res.channels
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}

// ---------- 消息 ----------
const messages = ref<AsymMessage[]>([])

async function loadMessages(cabinetId: string, behavior: ScrollBehavior = 'auto') {
  if (cabinetId !== currentCabinetId.value) return
  try {
    const res = await asymApi.messages(cabinetId)
    const list = res.messages
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

// ---------- 定时轮询（SSE 断开回退） ----------
let pollingTimer: number | undefined

function startPollingTimer() {
  if (pollingTimer !== undefined) return
  pollingTimer = window.setInterval(() => {
    void refreshChannels()
    if (currentCabinetId.value) void loadMessages(currentCabinetId.value, 'smooth')
  }, 15000)
}

function stopPollingTimer() {
  if (pollingTimer !== undefined) {
    window.clearInterval(pollingTimer)
    pollingTimer = undefined
  }
}

// SSE 连接断开时回退轮询，恢复后自动切回 SSE
function applyMode(mode: SseMode) {
  if (mode === 'polling') startPollingTimer()
  else stopPollingTimer()
}

watch(() => eventsStore.mode, applyMode, { immediate: true })

watch(currentCabinetId, (id) => {
  revokeAllImageUrls()
  if (id) {
    messages.value = []
    void loadMessages(id, 'auto')
  } else {
    messages.value = []
  }
})

let unsubscribe: (() => void) | undefined

onMounted(() => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
  void refreshChannels()
  unsubscribe = eventsStore.subscribe((e) => {
    if (e.type !== 'asym.message.new') return
    // 只处理对方侧消息：学术组收 CABINET，代表收 ACADEMIC
    const fromOtherSide = isAcademic.value
      ? e.senderType === 'CABINET'
      : e.senderType === 'ACADEMIC'
    if (!fromOtherSide) return
    // 学术组对任意内阁生效；代表仅限本内阁
    const forMe = isAcademic.value || e.targetId === myCabinetId.value
    if (!forMe) return
    // 正在查看该频道且不是自己发的 → 重拉消息；否则仅刷新未读角标
    const viewing = isAcademic.value
      ? e.targetId === currentCabinetId.value
      : true
    if (viewing && e.actorId !== myUserId.value && currentCabinetId.value) {
      void loadMessages(currentCabinetId.value, 'smooth')
    } else {
      void refreshChannels()
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
  unsubscribe?.()
  stopPollingTimer()
  revokeAllImageUrls()
})

function selectChannel(channel: AsymChannel) {
  if (channel.cabinetId === currentCabinetId.value) return
  currentCabinetId.value = channel.cabinetId
  if (isMobile.value) sessionPanelOpen.value = false
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
  const cabinetId = currentCabinetId.value
  const text = chatText.value.trim()
  if (!cabinetId) {
    ElMessage.warning('请先选择内阁')
    return
  }
  if (!text) return
  sendingText.value = true
  try {
    const formData = new FormData()
    formData.append('cabinetId', cabinetId)
    formData.append('content', text)
    await asymApi.send(formData)
    chatText.value = ''
    await loadMessages(cabinetId, 'smooth')
    await refreshChannels()
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    sendingText.value = false
  }
}

// ---------- 发送文件（手动选择） ----------
const uploadRef = ref<UploadInstance>()
const sending = ref(false)

function onUploadChange(uploadFile: UploadFile) {
  const raw = uploadFile.raw
  const cabinetId = currentCabinetId.value
  if (!raw || !cabinetId) {
    uploadRef.value?.clearFiles()
    return
  }
  void sendFile(raw, cabinetId)
}

async function sendFile(file: File, cabinetId: string) {
  sending.value = true
  try {
    const formData = new FormData()
    formData.append('cabinetId', cabinetId)
    formData.append('file', file)
    await asymApi.send(formData)
    ElMessage.success('文件发送成功')
    await loadMessages(cabinetId, 'smooth')
    await refreshChannels()
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    sending.value = false
    uploadRef.value?.clearFiles()
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
  const cabinetId = currentCabinetId.value
  const file = pasteFile.value
  if (!cabinetId || !file) return
  sendingPaste.value = true
  try {
    const formData = new FormData()
    formData.append('cabinetId', cabinetId)
    formData.append('file', file)
    const caption = chatText.value.trim()
    if (caption) formData.append('content', caption)
    await asymApi.send(formData)
    chatText.value = ''
    pasteDialogVisible.value = false
    ElMessage.success('文件发送成功')
    await loadMessages(cabinetId, 'smooth')
    await refreshChannels()
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    sendingPaste.value = false
  }
}

// ---------- 图片内联预览 ----------
const imageUrlMap = ref<Record<string, string>>({})

function hasImage(m: AsymMessage): boolean {
  return !!m.file && isImageFile(m.file.fileName)
}

async function loadImageUrl(m: AsymMessage) {
  if (!m.file || !isImageFile(m.file.fileName) || imageUrlMap.value[m.id]) return
  try {
    const res = await asymApi.download(m.id)
    if (imageUrlMap.value[m.id]) return
    if (m.cabinetId !== currentCabinetId.value) return
    imageUrlMap.value[m.id] = URL.createObjectURL(res.data)
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}

function preloadImageUrls(list: AsymMessage[]) {
  for (const m of list) {
    if (hasImage(m) && !imageUrlMap.value[m.id]) void loadImageUrl(m)
  }
}

function revokeAllImageUrls() {
  for (const url of Object.values(imageUrlMap.value)) URL.revokeObjectURL(url)
  imageUrlMap.value = {}
}

// ---------- 下载 ----------
async function downloadMessage(message: AsymMessage) {
  if (!message.file) return
  try {
    const res = await asymApi.download(message.id)
    downloadBlob(res, message.file.fileName)
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}

// ---------- 展示工具 ----------
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

// 己方消息：学术组发 ACADEMIC；代表发 CABINET
function isOwn(message: AsymMessage): boolean {
  return message.senderType === (isAcademic.value ? 'ACADEMIC' : 'CABINET')
}

function senderLabel(m: AsymMessage): string {
  const name = m.senderName || '未知'
  if (m.senderType === 'ACADEMIC') return `${name}（学术）`
  if (m.senderCabinetName) return `${name}（${m.senderCabinetName}）`
  return name
}
</script>

<template>
  <div class="page-card asym-page">
    <div class="asym-layout">
      <!-- 移动端：点击遮罩（右侧空白）关闭频道列表 -->
      <div
        v-if="isMobile && sessionPanelOpen"
        class="session-mask"
        @click="sessionPanelOpen = false"
      />
      <!-- 左侧：频道列表 -->
      <div class="session-panel" :class="{ open: sessionPanelOpen }">
        <div class="session-panel-header">
          <span class="session-panel-title">私密通道</span>
        </div>
        <div v-if="channels.length" class="session-list">
          <div
            v-for="c in channels"
            :key="c.cabinetId"
            class="session-item"
            :class="{ active: c.cabinetId === currentCabinetId }"
            @click="selectChannel(c)"
          >
            <el-badge
              :value="c.unreadCount || 0"
              :hidden="!(c.unreadCount && c.unreadCount > 0)"
              :max="99"
            >
              <el-avatar :size="40" class="session-avatar">
                {{ c.cabinetName.charAt(0) }}
              </el-avatar>
            </el-badge>
            <div class="session-meta">
              <div class="session-name-row">
                <span class="session-name" :title="c.cabinetName">{{ c.cabinetName }}</span>
                <span class="session-time">{{ formatTime(c.lastMessageAt ?? null) }}</span>
              </div>
              <div class="session-subtitle">与学术组的一对一私密通道</div>
            </div>
          </div>
        </div>
        <div v-else class="session-empty">
          <el-empty description="暂无频道" :image-size="80" />
        </div>
      </div>

      <!-- 右侧：聊天窗口 -->
      <div class="chat-panel">
        <template v-if="currentChannel">
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
              <span class="chat-target-name" :title="currentChannel.cabinetName">
                {{ currentChannel.cabinetName }}
              </span>
              <el-tag v-if="isAcademic" size="small" type="info" class="academic-header-tag">
                学团身份 · 全部内阁可见
              </el-tag>
              <el-tag v-else size="small" type="info" class="academic-header-tag">
                本内阁私密通道
              </el-tag>
            </div>
          </div>

          <div ref="messageListRef" class="message-list">
            <div v-if="!messages.length" class="message-empty">
              <el-empty description="暂无消息，发送文字或文件开始对话" :image-size="80" />
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
                :disabled="!currentCabinetId || sendingText"
                @keydown="onTextKeydown"
                @paste="onPaste"
              />
              <el-button
                type="primary"
                class="chat-send-btn"
                :loading="sendingText"
                :disabled="!currentCabinetId || !chatText.trim()"
                @click="sendText"
              >
                发送
              </el-button>
            </div>
            <div class="chat-actions-row">
              <el-upload
                ref="uploadRef"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="onUploadChange"
              >
                <el-button
                  type="primary"
                  plain
                  :loading="sending"
                  :disabled="!currentCabinetId"
                  :icon="Upload"
                >
                  发送文件
                </el-button>
              </el-upload>
              <span class="toolbar-hint">
                <span>支持粘贴图片/文件直接上传</span>
                <span class="toolbar-hint-sep">·</span>
                <span>
                  {{
                    eventsStore.mode === 'polling' ? '实时连接已断开，消息每 15 秒轮询刷新' : '消息实时更新'
                  }}
                </span>
              </span>
            </div>
          </div>
        </template>

        <div v-else class="chat-placeholder">
          <div v-if="isMobile" class="placeholder-actions">
            <el-button type="primary" @click="sessionPanelOpen = true">选择内阁</el-button>
          </div>
          <el-empty description="选择左侧内阁开始对话" :image-size="120" />
        </div>
      </div>
    </div>

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
  </div>
</template>

<style scoped>
.asym-page {
  height: calc(100vh - 140px);
  padding: 0;
  overflow: hidden;
  display: flex;
}

.asym-layout {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* ---------- 左侧频道列表 ---------- */
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

/* 移动端「频道」切换按钮（仅在 isMobile 时渲染，桌面端无影响） */
.session-toggle-btn {
  flex-shrink: 0;
}

/* ---------- 移动端适配（<768px）：频道列表变为覆盖式抽屉 ---------- */
@media (max-width: 768px) {
  .asym-layout {
    position: relative;
  }

  /* 点击右侧空白处关闭频道列表（z-index 低于面板 30） */
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
</style>
