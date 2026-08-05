<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Upload } from '@element-plus/icons-vue'
import { cabinetsApi, sessionsApi } from '../api'
import { useAuthStore } from '../stores/auth'
import type { Cabinet, CabinetType, Message, Session } from '../types'

const auth = useAuthStore()
const myCabinetId = computed(() => auth.user?.cabinetId ?? '')

// ---------- 会话列表 ----------
const sessions = ref<Session[]>([])
const currentSessionId = ref<string | null>(null)
const messageListRef = ref<HTMLElement | null>(null)

const currentSession = computed(
  () => sessions.value.find((s) => s.id === currentSessionId.value) || null,
)

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
    if (list.length !== messages.value.length) {
      messages.value = list
      nextTick(() => scrollToBottom(behavior))
    }
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
  if (id) {
    messages.value = []
    loadMessages(id, 'auto')
    startMessageTimer()
  } else {
    stopMessageTimer()
    messages.value = []
  }
})

onMounted(() => {
  refreshSessions()
  sessionTimer = window.setInterval(() => refreshSessions(), 3000)
})

onUnmounted(() => {
  if (sessionTimer !== undefined) window.clearInterval(sessionTimer)
  stopMessageTimer()
})

function selectSession(session: Session) {
  if (session.id === currentSessionId.value) return
  currentSessionId.value = session.id
}

// ---------- 新建磋商 ----------
const dialogVisible = ref(false)
const creating = ref(false)
const targetCabinetId = ref('')
const cabinets = ref<Cabinet[]>([])

const candidateCabinets = computed(() =>
  cabinets.value.filter((c) => c.id !== myCabinetId.value),
)

async function openCreateDialog() {
  dialogVisible.value = true
  targetCabinetId.value = ''
  try {
    cabinets.value = await cabinetsApi.list()
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}

async function createSession() {
  if (!targetCabinetId.value) {
    ElMessage.warning('请选择磋商对象')
    return
  }
  creating.value = true
  try {
    const session = await sessionsApi.create(targetCabinetId.value)
    await refreshSessions()
    currentSessionId.value = session.id
    dialogVisible.value = false
    ElMessage.success('磋商创建成功')
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    creating.value = false
  }
}

// ---------- 发送文件 ----------
const fileInput = ref<HTMLInputElement | null>(null)
const sending = ref(false)

function triggerFileSelect() {
  if (!currentSessionId.value) {
    ElMessage.warning('请先选择磋商会话')
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
    await sessionsApi.sendMessage(sessionId, file)
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
  return message.senderCabinetId === myCabinetId.value
}
</script>

<template>
  <div class="page-card consult-page">
    <div class="consult-layout">
      <!-- 左侧：会话列表 -->
      <div class="session-panel">
        <div class="session-panel-header">
          <span class="session-panel-title">磋商会话</span>
          <el-button type="primary" size="small" :icon="Plus" @click="openCreateDialog">
            新建磋商
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
            <el-badge :value="s.unreadCount || 0" :hidden="!s.unreadCount" :max="99">
              <el-avatar :size="40" class="session-avatar">
                {{ (s.otherCabinet?.name || '?').charAt(0) }}
              </el-avatar>
            </el-badge>
            <div class="session-meta">
              <div class="session-name-row">
                <span class="session-name">{{ s.otherCabinet?.name || '未知内阁' }}</span>
                <span class="session-time">{{ formatTime(s.lastMessageTime) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="session-empty">
          <el-empty description="暂无磋商，点击右上角新建" :image-size="80" />
        </div>
      </div>

      <!-- 右侧：聊天窗口 -->
      <div class="chat-panel">
        <template v-if="currentSession">
          <div class="chat-header">
            <div class="chat-target">
              <span class="chat-target-name">{{ currentSession.otherCabinet?.name || '未知内阁' }}</span>
              <span v-if="currentSession.otherCabinet" class="chat-target-type">
                {{ typeLabel(currentSession.otherCabinet.type) }}
              </span>
            </div>
            <el-button type="primary" size="small" :icon="Plus" @click="openCreateDialog">
              新建磋商
            </el-button>
          </div>

          <div ref="messageListRef" class="message-list">
            <div v-if="!messages.length" class="message-empty">
              <el-empty description="暂无消息，发送一个文件开始磋商" :image-size="80" />
            </div>
            <div
              v-for="m in messages"
              :key="m.id"
              class="message-row"
              :class="{ own: isOwn(m) }"
            >
              <div class="message-bubble">
                <template v-if="m.file">
                  <div class="file-card" @click="downloadMessage(m)">
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
            <el-button type="primary" :loading="sending" :icon="Upload" @click="triggerFileSelect">
              发送文件
            </el-button>
            <span class="toolbar-hint">支持发送任意文件，对方可下载；消息每 3 秒自动刷新</span>
            <input ref="fileInput" type="file" class="hidden-file-input" @change="onFileChange" />
          </div>
        </template>

        <div v-else class="chat-placeholder">
          <el-empty description="选择左侧会话开始磋商" :image-size="120" />
        </div>
      </div>
    </div>

    <!-- 新建磋商对话框 -->
    <el-dialog v-model="dialogVisible" title="新建磋商" width="420px" :close-on-click-modal="false">
      <div class="dialog-body">
        <p class="dialog-tip">选择要发起磋商的内阁</p>
        <el-select v-model="targetCabinetId" placeholder="请选择磋商对象" filterable style="width: 100%">
          <el-option
            v-for="c in candidateCabinets"
            :key="c.id"
            :label="`${c.name}（${typeLabel(c.type)}）`"
            :value="c.id"
          />
        </el-select>
        <el-empty v-if="!candidateCabinets.length" description="暂无可磋商的内阁" :image-size="60" />
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createSession">确认</el-button>
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

/* ---------- 左侧会话列表 ---------- */
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
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.chat-target-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.chat-target-type {
  font-size: 12px;
  color: #909399;
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
  justify-content: flex-start;
}

.message-row.own {
  justify-content: flex-end;
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
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
}

.toolbar-hint {
  font-size: 12px;
  color: #909399;
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
</style>
