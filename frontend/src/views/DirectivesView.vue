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
import type { UploadFile } from 'element-plus'
import { Delete, Download, Plus, Refresh, Upload } from '@element-plus/icons-vue'
import { directivesApi } from '../api/directives'
import { periodsApi } from '../api/periods'
import { cabinetsApi } from '../api'
import { useAuthStore } from '../stores/auth'
import { useEventsStore, type SseMode } from '../stores/events'
import { isImageFile, downloadBlob } from '../utils/file'
import type { Directive, DirectiveStatus, DirectiveType, ConferencePeriod, Cabinet } from '../types'

const auth = useAuthStore()
const eventsStore = useEventsStore()

const isAcademic = computed(() => auth.user?.role === 'ACADEMIC')

// ---------- 列表 ----------
const directives = ref<Directive[]>([])
const types = ref<DirectiveType[]>([])
const periods = ref<ConferencePeriod[]>([])
const cabinets = ref<Cabinet[]>([])
const loading = ref(false)

// 筛选（学术组）
const filterPeriodId = ref('')
const filterTypeId = ref('')
const filterCabinetId = ref('')

// 提交对话框（代表）
const submitVisible = ref(false)
const submitting = ref(false)
const submitTypeId = ref('')
const submitContent = ref('')
const submitFile = ref<File | null>(null)
const submitPreviewUrl = ref('')

// 审核对话框（学术组）
const reviewVisible = ref(false)
const reviewingDirective = ref<Directive | null>(null)
const reviewing = ref(false)
const reviewStatus = ref<DirectiveStatus | ''>('')
const reviewReply = ref('')
const reviewFile = ref<File | null>(null)
const reviewPreviewUrl = ref('')

// ---------- 图片内联预览（键 = 指令 id 或 id + '-reply'，镜像 ConsultSpace） ----------
const imageUrlMap = ref<Record<string, string>>({})

async function loadImageUrl(key: string, d: Directive, isReply: boolean): Promise<void> {
  if (imageUrlMap.value[key]) return
  try {
    const res = isReply ? await directivesApi.downloadReply(d.id) : await directivesApi.download(d.id)
    if (imageUrlMap.value[key]) return
    imageUrlMap.value[key] = URL.createObjectURL(res.data)
  } catch {
    // 错误由 axios 拦截器统一提示
  }
}

function preloadImageUrls(list: Directive[]): void {
  for (const d of list) {
    if (d.file && isImageFile(d.file.fileName) && !imageUrlMap.value[d.id]) {
      void loadImageUrl(d.id, d, false)
    }
    if (d.replyFile && isImageFile(d.replyFile.fileName) && !imageUrlMap.value[`${d.id}-reply`]) {
      void loadImageUrl(`${d.id}-reply`, d, true)
    }
  }
}

function revokeAllImageUrls(): void {
  for (const url of Object.values(imageUrlMap.value)) URL.revokeObjectURL(url)
  imageUrlMap.value = {}
}

// ---------- 数据加载 ----------
async function refresh(): Promise<void> {
  loading.value = true
  try {
    const params: { periodId?: string; typeId?: string; cabinetId?: string } = {}
    if (isAcademic.value) {
      if (filterPeriodId.value) params.periodId = filterPeriodId.value
      if (filterTypeId.value) params.typeId = filterTypeId.value
      if (filterCabinetId.value) params.cabinetId = filterCabinetId.value
    }
    const res = await directivesApi.list(params)
    directives.value = res.directives
    preloadImageUrls(res.directives)
  } catch {
    // 错误由 axios 拦截器统一提示
  } finally {
    loading.value = false
  }
}

async function loadTypes(): Promise<void> {
  try {
    const res = await directivesApi.listTypes()
    types.value = res.types
  } catch {
    // 错误由 axios 拦截器统一提示
  }
}

async function loadPeriods(): Promise<void> {
  if (!isAcademic.value) return
  try {
    const res = await periodsApi.list()
    periods.value = res.periods
  } catch {
    // 错误由 axios 拦截器统一提示
  }
}

async function loadCabinets(): Promise<void> {
  try {
    const all = await cabinetsApi.list()
    // 指令仅由代表（CABINET 类型内阁）提交，主席团/危机组（BUREAU/CRISIS）不出现在筛选框
    cabinets.value = all.filter((c) => c.type === 'CABINET')
  } catch {
    // 错误由 axios 拦截器统一提示
  }
}

// ---------- 提交指令（代表） ----------
function openSubmitDialog(): void {
  submitTypeId.value = ''
  submitContent.value = ''
  clearSubmitFile()
  submitVisible.value = true
}

function onPickSubmitFile(file: UploadFile): void {
  if (!file.raw) return
  submitFile.value = file.raw
  if (submitPreviewUrl.value) URL.revokeObjectURL(submitPreviewUrl.value)
  submitPreviewUrl.value = file.raw.type.startsWith('image/') ? URL.createObjectURL(file.raw) : ''
}

function clearSubmitFile(): void {
  if (submitPreviewUrl.value) URL.revokeObjectURL(submitPreviewUrl.value)
  submitPreviewUrl.value = ''
  submitFile.value = null
}

async function submitDirective(): Promise<void> {
  if (!submitTypeId.value) {
    ElMessage.warning('请选择指令类型')
    return
  }
  if (!submitContent.value.trim()) {
    ElMessage.warning('请输入指令内容')
    return
  }
  submitting.value = true
  try {
    const form = new FormData()
    form.append('typeId', submitTypeId.value)
    form.append('content', submitContent.value.trim())
    if (submitFile.value) form.append('file', submitFile.value)
    await directivesApi.create(form)
    ElMessage.success('指令提交成功')
    submitVisible.value = false
    submitTypeId.value = ''
    submitContent.value = ''
    clearSubmitFile()
    await refresh()
  } catch {
    // 错误由 axios 拦截器统一提示
  } finally {
    submitting.value = false
  }
}

// ---------- 删除待审指令（代表） ----------
async function deleteDirective(d: Directive): Promise<void> {
  try {
    await ElMessageBox.confirm('删除后不可恢复，确定删除该指令？', '删除指令', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await directivesApi.remove(d.id)
    ElMessage.success('指令已删除')
    await refresh()
  } catch {
    // 错误由 axios 拦截器统一提示
  }
}

// ---------- 审核（学术组） ----------
function openReview(d: Directive): void {
  reviewingDirective.value = d
  reviewStatus.value = ''
  reviewReply.value = ''
  reviewFile.value = null
  reviewPreviewUrl.value = ''
  reviewVisible.value = true
}

function onPickReviewFile(file: UploadFile): void {
  if (!file.raw) return
  reviewFile.value = file.raw
  if (reviewPreviewUrl.value) URL.revokeObjectURL(reviewPreviewUrl.value)
  reviewPreviewUrl.value = file.raw.type.startsWith('image/') ? URL.createObjectURL(file.raw) : ''
}

function clearReviewFile(): void {
  if (reviewPreviewUrl.value) URL.revokeObjectURL(reviewPreviewUrl.value)
  reviewPreviewUrl.value = ''
  reviewFile.value = null
}

async function confirmReview(): Promise<void> {
  if (!reviewStatus.value) {
    ElMessage.warning('请选择接受或驳回')
    return
  }
  if (!reviewingDirective.value) return
  reviewing.value = true
  try {
    const form = new FormData()
    form.append('status', reviewStatus.value)
    if (reviewReply.value.trim()) form.append('reply', reviewReply.value.trim())
    if (reviewFile.value) form.append('file', reviewFile.value)
    await directivesApi.review(reviewingDirective.value.id, form)
    ElMessage.success('审核完成')
    reviewVisible.value = false
    await refresh()
  } catch {
    // 错误由 axios 拦截器统一提示
  } finally {
    reviewing.value = false
  }
}

// ---------- 附件下载 ----------
async function downloadAttachment(d: Directive): Promise<void> {
  if (!d.file) return
  try {
    const res = await directivesApi.download(d.id)
    downloadBlob(res, d.file.fileName)
  } catch {
    // 错误由 axios 拦截器统一提示
  }
}

async function downloadReply(d: Directive): Promise<void> {
  if (!d.replyFile) return
  try {
    const res = await directivesApi.downloadReply(d.id)
    downloadBlob(res, d.replyFile.fileName)
  } catch {
    // 错误由 axios 拦截器统一提示
  }
}

// ---------- 展示工具 ----------
const statusLabel: Record<DirectiveStatus, string> = {
  PENDING: '等待审核',
  ACCEPTED: '已接受',
  REJECTED: '已驳回',
}

const statusTagType: Record<DirectiveStatus, 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
}

function directiveTitle(d: Directive): string {
  return `[${d.cabinetName || '本内阁'}][${d.typeName}][${d.sequence}]`
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

// ---------- 轮询回退（15s 定时重拉，镜像 ConsultSpace 模式） ----------
let pollTimer: number | undefined

function startPollTimer(): void {
  if (pollTimer !== undefined) return
  pollTimer = window.setInterval(() => {
    void refresh()
  }, 15000)
}

function stopPollTimer(): void {
  if (pollTimer !== undefined) {
    window.clearInterval(pollTimer)
    pollTimer = undefined
  }
}

function applyMode(mode: SseMode): void {
  if (mode === 'polling') startPollTimer()
  else stopPollTimer()
}

watch(() => eventsStore.mode, applyMode, { immediate: true })

// ---------- 生命周期 ----------
let unsubscribe: (() => void) | undefined

onMounted(() => {
  void loadTypes()
  void loadCabinets()
  if (isAcademic.value) void loadPeriods()
  void refresh()
  unsubscribe = eventsStore.subscribe((e) => {
    if (e.type === 'directive.new' || e.type === 'directive.changed') {
      void refresh()
    }
  })
})

onUnmounted(() => {
  unsubscribe?.()
  stopPollTimer()
  revokeAllImageUrls()
})
</script>

<template>
  <div class="page-card">
    <div class="page-header">
      <div>
        <div class="title">指令提交</div>
        <div class="subtitle">{{ isAcademic ? '审核代表提交的指令并给出答复' : '向学术组提交危机指令' }}</div>
      </div>
      <div v-if="!isAcademic" class="header-actions">
        <el-button type="primary" :icon="Plus" @click="openSubmitDialog">提交指令</el-button>
      </div>
    </div>

    <!-- 筛选区（学术组） -->
    <div v-if="isAcademic" class="filter-bar">
      <el-select
        v-model="filterPeriodId"
        placeholder="全部会期"
        clearable
        style="width: 200px"
        @change="() => refresh()"
      >
        <el-option
          v-for="p in periods"
          :key="p.id"
          :label="`第 ${p.number} 会期${p.name ? ' · ' + p.name : ''}`"
          :value="p.id"
        />
      </el-select>
      <el-select
        v-model="filterTypeId"
        placeholder="全部指令类型"
        clearable
        style="width: 200px"
        @change="() => refresh()"
      >
        <el-option v-for="t in types" :key="t.id" :label="t.name" :value="t.id" />
      </el-select>
      <el-select
        v-model="filterCabinetId"
        placeholder="全部内阁"
        clearable
        style="width: 200px"
        @change="() => refresh()"
      >
        <el-option v-for="c in cabinets" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-button :icon="Refresh" circle title="刷新" @click="refresh" />
      <span v-if="eventsStore.mode === 'polling'" class="polling-tip">实时连接已断开，每 15 秒轮询刷新</span>
    </div>

    <!-- 指令列表 -->
    <div v-loading="loading" class="directive-list">
      <div v-for="d in directives" :key="d.id" class="directive-item">
        <div class="directive-head">
          <span class="directive-title">{{ directiveTitle(d) }}</span>
          <el-tag :type="statusTagType[d.status]" size="small">{{ statusLabel[d.status] }}</el-tag>
        </div>
        <div class="directive-content">{{ d.content }}</div>
        <div v-if="d.file" class="directive-file">
          <el-image
            v-if="imageUrlMap[d.id]"
            :src="imageUrlMap[d.id]"
            :preview-src-list="[imageUrlMap[d.id]]"
            fit="cover"
            class="file-image"
            :preview-teleported="true"
          />
          <span v-else class="file-card" @click="downloadAttachment(d)">
            <el-icon><Download /></el-icon>
            <span class="file-name">{{ d.file.fileName }}</span>
          </span>
        </div>
        <div v-if="d.status !== 'PENDING'" class="directive-reply">
          <div v-if="d.reply" class="reply-text">学术组答复：{{ d.reply }}</div>
          <div v-if="d.replyFile" class="directive-file">
            <el-image
              v-if="imageUrlMap[`${d.id}-reply`]"
              :src="imageUrlMap[`${d.id}-reply`]"
              :preview-src-list="[imageUrlMap[`${d.id}-reply`]]"
              fit="cover"
              class="file-image"
              :preview-teleported="true"
            />
            <span v-else class="file-card" @click="downloadReply(d)">
              <el-icon><Download /></el-icon>
              <span class="file-name">{{ d.replyFile.fileName }}</span>
            </span>
          </div>
        </div>
        <div class="directive-foot">
          <span class="time">{{ formatTime(d.createdAt) }}</span>
          <span class="foot-actions">
            <el-button
              v-if="isAcademic && d.status === 'PENDING'"
              size="small"
              type="primary"
              @click="openReview(d)"
            >
              审核
            </el-button>
            <el-button
              v-if="!isAcademic && d.status === 'PENDING'"
              size="small"
              type="danger"
              plain
              :icon="Delete"
              @click="deleteDirective(d)"
            >
              删除
            </el-button>
          </span>
        </div>
      </div>
      <el-empty
        v-if="!loading && directives.length === 0"
        :description="isAcademic ? '暂无指令' : '暂无指令，点击右上角「提交指令」'"
        :image-size="80"
      />
    </div>

    <!-- 提交指令对话框（代表） -->
    <el-dialog
      v-model="submitVisible"
      title="提交指令"
      width="min(92vw, 520px)"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="指令类型" required>
          <el-select v-model="submitTypeId" placeholder="请选择指令类型" style="width: 100%">
            <el-option v-for="t in types" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="指令内容" required>
          <el-input
            v-model="submitContent"
            type="textarea"
            :rows="5"
            placeholder="请输入指令内容"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="附件">
          <div class="file-upload-wrap">
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept="*"
              :on-change="onPickSubmitFile"
            >
              <el-button :icon="Upload">选择附件</el-button>
            </el-upload>
            <div v-if="submitFile" class="picked-file">
              <el-image v-if="submitPreviewUrl" :src="submitPreviewUrl" fit="cover" class="picked-image" />
              <span v-else class="picked-name">{{ submitFile.name }}</span>
              <el-button size="small" text type="danger" @click="clearSubmitFile">移除</el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="submitVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitDirective">提交</el-button>
      </template>
    </el-dialog>

    <!-- 审核对话框（学术组） -->
    <el-dialog
      v-model="reviewVisible"
      title="审核指令"
      width="min(92vw, 520px)"
      :close-on-click-modal="false"
    >
      <div v-if="reviewingDirective" class="review-target">
        <div class="directive-title">{{ directiveTitle(reviewingDirective) }}</div>
        <div class="directive-content">{{ reviewingDirective.content }}</div>
      </div>
      <el-form label-width="80px">
        <el-form-item label="审核结果" required>
          <el-radio-group v-model="reviewStatus">
            <el-radio value="ACCEPTED">接受</el-radio>
            <el-radio value="REJECTED">驳回</el-radio>
          </el-radio-group>
          <div class="review-tip">审核结果提交后不可修改</div>
        </el-form-item>
        <el-form-item label="答复">
          <el-input
            v-model="reviewReply"
            type="textarea"
            :rows="4"
            placeholder="选填：给代表的答复"
          />
        </el-form-item>
        <el-form-item label="附件">
          <div class="file-upload-wrap">
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept="*"
              :on-change="onPickReviewFile"
            >
              <el-button :icon="Upload">选择附件</el-button>
            </el-upload>
            <div v-if="reviewFile" class="picked-file">
              <el-image v-if="reviewPreviewUrl" :src="reviewPreviewUrl" fit="cover" class="picked-image" />
              <span v-else class="picked-name">{{ reviewFile.name }}</span>
              <el-button size="small" text type="danger" @click="clearReviewFile">移除</el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" :loading="reviewing" @click="confirmReview">提交审核</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.polling-tip {
  font-size: 12px;
  color: #e6a23c;
}

.directive-list {
  min-height: 120px;
}

.directive-item {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.directive-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.directive-title {
  font-weight: 600;
  font-size: 14px;
}

.directive-content {
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
}

.directive-file {
  margin-top: 10px;
}

.file-image {
  max-width: 260px;
  max-height: 200px;
  border-radius: 6px;
  cursor: pointer;
  display: block;
}

.file-card {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  font-size: 13px;
  color: #409eff;
  cursor: pointer;
}

.file-card:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.file-name {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.directive-reply {
  margin-top: 10px;
  padding: 10px 12px;
  background: #f0f9eb;
  border-radius: 6px;
}

.reply-text {
  font-size: 13px;
  color: #529b2e;
  white-space: pre-wrap;
  word-break: break-word;
}

.directive-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  gap: 12px;
}

.time {
  font-size: 12px;
  color: #909399;
}

.foot-actions {
  display: inline-flex;
  gap: 8px;
}

.file-upload-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.picked-file {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.picked-image {
  max-width: 120px;
  max-height: 90px;
  border-radius: 6px;
}

.picked-name {
  font-size: 13px;
  color: #606266;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-target {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 16px;
}

.review-target .directive-content {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
}

.review-tip {
  font-size: 12px;
  color: #e6a23c;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .page-header {
    flex-wrap: wrap;
    gap: 12px;
  }

  .filter-bar .el-select {
    width: 100% !important;
  }

  .file-image {
    max-width: 100%;
  }
}
</style>
