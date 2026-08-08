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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'
import { Delete, Download, Promotion, Refresh, UploadFilled } from '@element-plus/icons-vue'
import { filesApi } from '../api'
import { useAuthStore } from '../stores/auth'
import { useEventsStore } from '../stores/events'
import type { FileEntity } from '../types'

const auth = useAuthStore()
const eventsStore = useEventsStore()

const activeTab = ref<'my' | 'all'>('my')
const files = ref<FileEntity[]>([])
const loading = ref(false)
const uploading = ref(false)
const uploadRef = ref<UploadInstance>()

const emptyText = computed(() =>
  activeTab.value === 'my'
    ? '暂无提交记录，点击右上角「提交文件」上传会议稿件'
    : '暂无会议文件',
)

function formatTime(value: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

function uploaderName(row: FileEntity): string {
  let name = row.uploaderName
  if (!name && auth.user && row.uploaderId === auth.user.id) {
    name = auth.user.name
  }
  if (!name) {
    return '—'
  }
  return row.uploaderCabinetName ? `${name}（${row.uploaderCabinetName}）` : name
}

async function loadFiles() {
  loading.value = true
  try {
    files.value = await filesApi.list('CONFERENCE', activeTab.value === 'my' ? 'MY' : undefined)
  } catch {
    files.value = []
    // 错误提示已由 axios 拦截器统一处理
  } finally {
    loading.value = false
  }
}

function handleTabChange() {
  void loadFiles()
}

async function handleFileChange(uploadFile: UploadFile) {
  // 选择文件即开始上传；若已有文件在上传中则忽略本次选择，避免并发竞态
  if (uploading.value) return
  const raw = uploadFile.raw
  if (!raw) return
  uploading.value = true
  try {
    await filesApi.upload('CONFERENCE', raw)
    ElMessage.success('文件上传成功')
    await loadFiles()
  } catch {
    // 错误提示已由 axios 拦截器统一处理
  } finally {
    uploading.value = false
    uploadRef.value?.clearFiles()
  }
}

async function handleDownload(row: FileEntity) {
  try {
    const res = await filesApi.download(row.id)
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = row.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch {
    // 错误提示已由 axios 拦截器统一处理
  }
}

async function handlePublish(row: FileEntity) {
  try {
    await ElMessageBox.confirm(
      `确认将「${row.fileName}」一键复制到公共空间吗？发布后所有用户均可在公共空间查看该文件。`,
      '一键复制到公共空间',
      {
        confirmButtonText: '确认发布',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }
  loading.value = true
  try {
    await filesApi.publish(row.id)
    ElMessage.success('已发布至公共空间')
  } catch {
    // 错误提示已由 axios 拦截器统一处理
  } finally {
    loading.value = false
  }
}

async function handleDelete(row: FileEntity) {
  try {
    await ElMessageBox.confirm(
      `确认删除「${row.fileName}」吗？删除后无法恢复。`,
      '删除文件',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'error',
      },
    )
  } catch {
    return
  }
  loading.value = true
  try {
    await filesApi.remove(row.id)
    ElMessage.success('删除成功')
    await loadFiles()
  } catch {
    // 错误提示已由 axios 拦截器统一处理
  } finally {
    loading.value = false
  }
}

let unsubscribe: (() => void) | undefined

onMounted(() => {
  void loadFiles()
  unsubscribe = eventsStore.subscribe((e) => {
    if (
      e.type === 'file.changed' &&
      e.spaceType === 'CONFERENCE' &&
      e.actorId !== auth.user?.id &&
      (auth.isAcademic || activeTab.value === 'all')
    ) {
      void loadFiles()
    }
  })
})

onUnmounted(() => unsubscribe?.())
</script>

<template>
  <div class="page-card">
    <div class="page-header">
      <div>
        <div class="title">会议空间</div>
        <div class="subtitle">提交会议稿件，经学术团队审核后可发布至公共空间</div>
      </div>
      <div class="header-actions">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleFileChange"
          :disabled="uploading"
        >
          <el-button type="primary" :icon="UploadFilled" :loading="uploading">提交文件</el-button>
        </el-upload>
        <el-button :icon="Refresh" circle :loading="loading" @click="loadFiles" />
      </div>
    </div>

    <el-alert
      v-if="!auth.isAcademic"
      class="delegate-hint"
      type="info"
      show-icon
      :closable="false"
      title="文件提交后将由学术团队统一管理，上传后无法修改或删除，请确认内容无误后再提交。"
    />

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="我的提交" name="my" />
      <el-tab-pane v-if="auth.isAcademic" label="全部提交" name="all" />
    </el-tabs>

    <div v-loading="loading" class="table-wrap">
      <el-table :data="files" stripe class="file-table">
        <el-table-column prop="fileName" label="文件名" min-width="240" show-overflow-tooltip />
        <el-table-column label="上传者" width="120" align="center">
          <template #default="{ row }">
            <span>{{ uploaderName(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="上传时间" width="180" align="center">
          <template #default="{ row }">
            <span>{{ formatTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" :width="auth.isAcademic ? 320 : 100" align="center">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Download" @click="handleDownload(row)">下载</el-button>
            <el-button
              v-if="auth.isAcademic"
              link
              type="success"
              :icon="Promotion"
              @click="handlePublish(row)"
            >
              一键复制到公共空间
            </el-button>
            <el-button
              v-if="auth.isAcademic"
              link
              type="danger"
              :icon="Delete"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="emptyText" :image-size="80" />
        </template>
      </el-table>
    </div>

    <div class="mobile-file-list" v-loading="loading">
      <div v-for="f in files" :key="f.id" class="mobile-file-card">
        <div class="mobile-file-main">
          <el-icon class="mobile-file-icon"><Document /></el-icon>
          <div class="mobile-file-info">
            <div class="mobile-file-name">{{ f.fileName }}</div>
            <div class="mobile-file-meta">
              {{ uploaderName(f) }} · 上传于 {{ formatTime(f.createdAt) }}
            </div>
          </div>
        </div>
        <div class="mobile-file-actions">
          <el-button link type="primary" size="small" @click="handleDownload(f)">下载</el-button>
          <el-button
            v-if="auth.isAcademic"
            link
            type="success"
            size="small"
            @click="handlePublish(f)"
          >
            发布到公共空间
          </el-button>
          <el-button
            v-if="auth.isAcademic"
            link
            type="danger"
            size="small"
            @click="handleDelete(f)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.delegate-hint {
  margin-bottom: 12px;
}

/* 移动端（<768px）：隐藏表格，展示卡片式文件列表 */
.mobile-file-list {
  display: none;
}

.mobile-file-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  padding: 12px;
}

.mobile-file-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.mobile-file-icon {
  color: #909399;
  font-size: 20px;
  margin-top: 2px;
}

.mobile-file-name {
  font-size: 14px;
  color: #303133;
  word-break: break-all;
}

.mobile-file-meta {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.mobile-file-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  border-top: 1px solid #f0f2f5;
  padding-top: 8px;
  margin-top: 10px;
}

@media (max-width: 768px) {
  .file-table {
    display: none;
  }

  .mobile-file-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}
</style>
