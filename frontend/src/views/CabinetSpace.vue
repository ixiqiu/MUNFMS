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
import { onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox, type UploadFile, type UploadInstance } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { filesApi } from '../api'
import { useAuthStore } from '../stores/auth'
import { useEventsStore } from '../stores/events'
import type { FileEntity } from '../types'

const auth = useAuthStore()
const eventsStore = useEventsStore()
// Pinia store refs auto-unwrap: isAcademic 为布尔值
const isAcademic = auth.isAcademic

const files = ref<FileEntity[]>([])
const loading = ref(false)
const uploading = ref(false)
const uploadRef = ref<UploadInstance>()

/** 将 ISO 时间字符串格式化为 YYYY-MM-DD HH:mm */
function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function loadFiles(): Promise<void> {
  loading.value = true
  try {
    files.value = await filesApi.list('CABINET')
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    loading.value = false
  }
}

async function handleFileChange(file: UploadFile): Promise<void> {
  // 选择文件即开始上传；若已有文件在上传中则忽略本次选择，避免并发竞态
  if (uploading.value) return
  const raw = file.raw
  if (!raw) return
  uploading.value = true
  try {
    await filesApi.upload('CABINET', raw)
    ElMessage.success('上传成功')
    await loadFiles()
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    uploading.value = false
    uploadRef.value?.clearFiles()
  }
}

async function handleDownload(row: FileEntity): Promise<void> {
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
    // 错误提示由 axios 拦截器统一处理
  }
}

async function handleDelete(row: FileEntity): Promise<void> {
  try {
    await ElMessageBox.confirm('确定删除该文件吗？', '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await filesApi.remove(row.id)
    ElMessage.success('删除成功')
    await loadFiles()
  } catch {
    // 错误提示由 axios 拦截器统一处理
  }
}

let unsubscribe: (() => void) | undefined

onMounted(() => {
  if (!isAcademic) {
    void loadFiles()
    unsubscribe = eventsStore.subscribe((e) => {
      if (
        e.type === 'file.changed' &&
        e.spaceType === 'CABINET' &&
        e.targetId === auth.cabinetId &&
        e.actorId !== auth.user?.id
      ) {
        void loadFiles()
      }
    })
  }
})

onUnmounted(() => unsubscribe?.())
</script>

<template>
  <!-- 学术组无权访问内阁空间 -->
  <div v-if="isAcademic" class="page-card academic">
    <el-empty description="学术组无权访问内阁空间" :image-size="120" />
  </div>

  <!-- 代表：内阁文件管理 -->
  <div v-else class="page-card" v-loading="loading">
    <div class="page-header">
      <div>
        <div class="title">内阁文件</div>
        <div class="subtitle">本内阁专属文件空间，仅内阁成员可见</div>
      </div>
      <div class="upload-area">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleFileChange"
          :disabled="uploading"
        >
          <el-button type="primary" :loading="uploading" :disabled="uploading">
            <el-icon><Upload /></el-icon>
            <span>选择文件</span>
          </el-button>
        </el-upload>
        <el-button :icon="Refresh" circle :loading="loading" @click="loadFiles" />
      </div>
    </div>

    <el-table :data="files" row-key="id" class="file-table">
      <el-table-column label="文件名" min-width="280" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="file-name">
            <el-icon class="file-name-icon"><Document /></el-icon>
            <span class="file-name-text">{{ (row as FileEntity).fileName }}</span>
          </span>
        </template>
      </el-table-column>

      <el-table-column label="上传时间" width="180">
        <template #default="{ row }">
          {{ formatTime((row as FileEntity).createdAt) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="handleDownload(row as FileEntity)">
            <el-icon><Download /></el-icon>
            <span>下载</span>
          </el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row as FileEntity)">
            <el-icon><Delete /></el-icon>
            <span>删除</span>
          </el-button>
        </template>
      </el-table-column>

      <template #empty>
        <el-empty description="暂无文件，上传第一个文件吧" :image-size="80" />
      </template>
    </el-table>

    <div class="mobile-file-list">
      <div v-for="f in files" :key="f.id" class="mobile-file-card">
        <div class="mobile-file-main">
          <el-icon class="mobile-file-icon"><Document /></el-icon>
          <div class="mobile-file-info">
            <div class="mobile-file-name">{{ f.fileName }}</div>
            <div class="mobile-file-meta">上传于 {{ formatTime(f.createdAt) }}</div>
          </div>
        </div>
        <div class="mobile-file-actions">
          <el-button link type="primary" size="small" @click="handleDownload(f)">下载</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(f)">删除</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.academic {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-table {
  width: 100%;
}

/* 文件名：图标 + 文字，超长时由 .cell 裁剪并显示省略号，悬浮显示完整名称 */
.file-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  vertical-align: middle;
}

.file-name-icon {
  flex-shrink: 0;
  color: #909399;
}

.file-name-text {
  white-space: nowrap;
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
