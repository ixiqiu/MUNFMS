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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Download, Plus, Upload } from '@element-plus/icons-vue'
import { timelineApi } from '../api/timeline'
import { periodsApi } from '../api/periods'
import { useAuthStore } from '../stores/auth'
import { useEventsStore, type SseMode } from '../stores/events'
import { downloadBlob, isImageFile } from '../utils/file'
import type { ConferencePeriod, TimelineEntry, TimelineEntryType } from '../types'

const auth = useAuthStore()
const eventsStore = useEventsStore()
const isAcademic = computed(() => auth.user?.role === 'ACADEMIC')

// ---------- 筛选 ----------
const periods = ref<ConferencePeriod[]>([])
const periodFilter = ref<string | undefined>(undefined)
const typeFilter = ref<TimelineEntryType | ''>('')
const loading = ref(false)

// ---------- 列表 ----------
const entries = ref<TimelineEntry[]>([])

async function loadEntries() {
  loading.value = true
  try {
    const params: { periodId?: string; type?: string } = {}
    if (periodFilter.value) params.periodId = periodFilter.value
    if (typeFilter.value) params.type = typeFilter.value
    const res = await timelineApi.list(params)
    entries.value = res.entries
    preloadImageUrls(res.entries)
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    loading.value = false
  }
}

async function loadPeriods() {
  try {
    const res = await periodsApi.list()
    periods.value = res.periods
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}

watch([periodFilter, typeFilter], () => {
  revokeAllImageUrls()
  void loadEntries()
})

// ---------- SSE 实时刷新 + 轮询回退（镜像 ConsultSpace 模式） ----------
let pollTimer: number | undefined

function startPollTimer() {
  if (pollTimer !== undefined) return
  pollTimer = window.setInterval(() => void loadEntries(), 15000)
}

function stopPollTimer() {
  if (pollTimer !== undefined) {
    window.clearInterval(pollTimer)
    pollTimer = undefined
  }
}

function applyMode(mode: SseMode) {
  if (mode === 'polling') {
    startPollTimer()
  } else {
    stopPollTimer()
  }
}

watch(() => eventsStore.mode, applyMode, { immediate: true })

let unsubscribe: (() => void) | undefined

onMounted(() => {
  void loadPeriods()
  void loadEntries()
  unsubscribe = eventsStore.subscribe((e) => {
    if (e.type === 'timeline.changed') {
      void loadEntries()
    }
  })
})

onUnmounted(() => {
  unsubscribe?.()
  stopPollTimer()
  revokeAllImageUrls()
})

// ---------- 展示 ----------
function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function entryTitle(e: TimelineEntry): string {
  const tag = e.type === 'NEWS' ? '新闻' : '局势更新'
  const num = e.period?.number ?? '?'
  let label = `[${tag}][${num}.${e.sequence}]`
  if (e.type === 'NEWS' && e.newsSource) label += `[${e.newsSource}]`
  return e.content ? `${label} ${e.content}` : label
}

// ---------- 图片内联预览（blob + URL.createObjectURL，镜像 ConsultSpace） ----------
const imageUrlMap = ref<Record<string, string>>({})

function hasImage(e: TimelineEntry): boolean {
  return !!e.file && isImageFile(e.file.fileName)
}

async function loadImageUrl(e: TimelineEntry) {
  if (!e.file || !isImageFile(e.file.fileName) || imageUrlMap.value[e.id]) return
  try {
    const res = await timelineApi.download(e.id)
    if (imageUrlMap.value[e.id]) return
    imageUrlMap.value[e.id] = URL.createObjectURL(res.data)
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}

function preloadImageUrls(list: TimelineEntry[]) {
  for (const e of list) {
    if (hasImage(e) && !imageUrlMap.value[e.id]) void loadImageUrl(e)
  }
}

function revokeAllImageUrls() {
  for (const url of Object.values(imageUrlMap.value)) URL.revokeObjectURL(url)
  imageUrlMap.value = {}
}

// ---------- 附件下载 ----------
async function downloadAttachment(entry: TimelineEntry) {
  if (!entry.file) return
  try {
    const res = await timelineApi.download(entry.id)
    downloadBlob(res, entry.file.fileName)
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}

// ---------- 发布（仅学术组） ----------
const dialogVisible = ref(false)
const publishing = ref(false)
const publishType = ref<TimelineEntryType>('SITUATION')
const publishSource = ref('')
const publishContent = ref('')
const publishFile = ref<File | null>(null)
const publishFilePreviewUrl = ref('')

function clearPublishFile() {
  if (publishFilePreviewUrl.value) URL.revokeObjectURL(publishFilePreviewUrl.value)
  publishFilePreviewUrl.value = ''
  publishFile.value = null
}

function openPublishDialog() {
  publishType.value = 'SITUATION'
  publishSource.value = ''
  publishContent.value = ''
  clearPublishFile()
  dialogVisible.value = true
}

function onFileChange(uploadFile: { raw?: File }) {
  clearPublishFile()
  const file = uploadFile.raw
  if (!file) return
  publishFile.value = file
  if (isImageFile(file.name)) {
    publishFilePreviewUrl.value = URL.createObjectURL(file)
  }
}

async function submitPublish() {
  const content = publishContent.value.trim()
  if (!content && !publishFile.value) {
    ElMessage.warning('内容与附件至少填写一项')
    return
  }
  publishing.value = true
  try {
    const form = new FormData()
    form.append('type', publishType.value)
    if (publishType.value === 'NEWS' && publishSource.value.trim()) {
      form.append('newsSource', publishSource.value.trim())
    }
    if (content) form.append('content', content)
    if (publishFile.value) form.append('file', publishFile.value)
    await timelineApi.create(form)
    dialogVisible.value = false
    ElMessage.success('发布成功')
    await loadEntries()
  } catch {
    // 错误已由 axios 拦截器统一提示
  } finally {
    publishing.value = false
  }
}

// ---------- 删除（仅学术组） ----------
async function removeEntry(entry: TimelineEntry) {
  try {
    await ElMessageBox.confirm(
      '删除后不可恢复（误删可重新发布），确定删除该条时间线吗？',
      '删除时间线',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await timelineApi.remove(entry.id)
    ElMessage.success('已删除')
    await loadEntries()
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}
</script>

<template>
  <div class="page-card">
    <div class="page-header">
      <div>
        <div class="title">局势时间线</div>
        <div class="subtitle">学术组发布的局势更新与新闻，混排按发布时间倒序</div>
      </div>
      <div class="header-actions">
        <el-select
          v-model="periodFilter"
          class="filter-select"
          placeholder="全部会期"
          clearable
        >
          <el-option
            v-for="p in periods"
            :key="p.id"
            :value="p.id"
            :label="`第${p.number}会期${p.name ? ' · ' + p.name : ''}`"
          />
        </el-select>
        <el-select
          v-model="typeFilter"
          class="filter-select"
          placeholder="全部类型"
          clearable
        >
          <el-option label="局势更新" value="SITUATION" />
          <el-option label="新闻" value="NEWS" />
        </el-select>
        <el-button v-if="isAcademic" type="primary" :icon="Plus" @click="openPublishDialog">
          发布
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="entry-list">
      <el-empty
        v-if="!loading && !entries.length"
        description="暂无时间线条目"
        :image-size="80"
      />
      <div v-for="e in entries" :key="e.id" class="entry-card">
        <div class="entry-header">
          <span class="entry-title">{{ entryTitle(e) }}</span>
          <el-button
            v-if="isAcademic"
            type="danger"
            size="small"
            link
            @click="removeEntry(e)"
          >
            删除
          </el-button>
        </div>
        <div class="entry-time">{{ formatTime(e.createdAt) }}</div>
        <template v-if="e.file">
          <template v-if="hasImage(e)">
            <div class="image-container">
              <el-image
                v-if="imageUrlMap[e.id]"
                :src="imageUrlMap[e.id]"
                :preview-src-list="[imageUrlMap[e.id]]"
                preview-teleported
                fit="contain"
                class="inline-image"
              >
                <template #error>
                  <div class="image-fallback">图片加载失败</div>
                </template>
              </el-image>
              <div v-else class="image-fallback">图片加载中…</div>
              <div class="file-meta">
                <span class="file-name">{{ e.file.fileName }}</span>
                <span class="file-hint">点击预览</span>
              </div>
            </div>
          </template>
          <div v-else class="file-card" @click="downloadAttachment(e)">
            <el-icon class="file-icon"><Document /></el-icon>
            <div class="file-info">
              <span class="file-name">{{ e.file.fileName }}</span>
              <span class="file-hint">点击下载</span>
            </div>
            <el-icon class="download-icon"><Download /></el-icon>
          </div>
        </template>
      </div>
    </div>

    <!-- 发布对话框（仅学术组） -->
    <el-dialog v-model="dialogVisible" title="发布时间线" width="520px">
      <div class="dialog-form">
        <div class="form-item">
          <div class="form-label">类型</div>
          <el-radio-group v-model="publishType">
            <el-radio value="SITUATION">局势更新</el-radio>
            <el-radio value="NEWS">新闻</el-radio>
          </el-radio-group>
        </div>
        <div v-if="publishType === 'NEWS'" class="form-item">
          <div class="form-label">新闻来源</div>
          <el-input
            v-model="publishSource"
            placeholder="如：塔斯社"
            maxlength="50"
            clearable
          />
        </div>
        <div class="form-item">
          <div class="form-label">内容</div>
          <el-input
            v-model="publishContent"
            type="textarea"
            :rows="4"
            resize="none"
            placeholder="输入时间线内容（与附件至少填写一项）"
          />
        </div>
        <div class="form-item">
          <div class="form-label">附件</div>
          <el-upload
            :auto-upload="false"
            :limit="1"
            :show-file-list="false"
            :on-change="onFileChange"
          >
            <el-button :icon="Upload">选择附件</el-button>
          </el-upload>
          <div v-if="publishFile" class="attach-preview">
            <el-image
              v-if="publishFilePreviewUrl"
              :src="publishFilePreviewUrl"
              fit="contain"
              class="attach-image"
            />
            <div class="attach-name">
              <span>{{ publishFile.name }}</span>
              <el-button type="danger" size="small" link @click="clearPublishFile">
                移除
              </el-button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="submitPublish">
          发布
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-select {
  width: 170px;
}

.entry-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 120px;
}

.entry-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px 14px;
  transition: box-shadow 0.15s;
}

.entry-card:hover {
  box-shadow: 0 1px 6px rgba(0, 21, 41, 0.1);
}

.entry-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.entry-title {
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
}

.entry-time {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}

/* 图片内联预览（镜像 ConsultSpace） */
.image-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
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
  width: 200px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 13px;
  background: #f5f7fa;
  border-radius: 8px;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-meta .file-name {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

.file-meta .file-hint {
  font-size: 11px;
  color: #909399;
}

/* 附件卡片（镜像 ConsultSpace） */
.file-card {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 0;
  margin-top: 6px;
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
  color: #909399;
}

.download-icon {
  font-size: 16px;
  color: #909399;
  flex-shrink: 0;
}

/* 发布对话框 */
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}

.attach-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.attach-image {
  width: 80px;
  height: 60px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.attach-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #303133;
}

@media (max-width: 768px) {
  .header-actions {
    width: 100%;
  }

  .filter-select {
    flex: 1;
    min-width: 0;
    width: auto;
  }
}
</style>
