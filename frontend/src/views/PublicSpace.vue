<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'
import { filesApi } from '../api'
import { useAuthStore } from '../stores/auth'
import type { FileEntity } from '../types'

const auth = useAuthStore()

const loading = ref(false)
const files = ref<FileEntity[]>([])
const uploadRef = ref<UploadInstance>()

async function loadFiles() {
  loading.value = true
  try {
    files.value = await filesApi.list('PUBLIC')
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    loading.value = false
  }
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

function handleFileChange(uploadFile: UploadFile) {
  uploadRef.value?.clearFiles()
  const rawFile = uploadFile.raw
  if (!rawFile) return
  handleUpload(rawFile)
}

async function handleUpload(file: File) {
  loading.value = true
  try {
    await filesApi.upload('PUBLIC', file)
    ElMessage.success('上传成功')
    await loadFiles()
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    loading.value = false
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
    // 错误提示由 axios 拦截器统一处理
  }
}

async function handleDelete(row: FileEntity) {
  try {
    await ElMessageBox.confirm(`确定要删除文件「${row.fileName}」吗？删除后不可恢复。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return // 用户取消
  }
  try {
    await filesApi.remove(row.id)
    ElMessage.success('删除成功')
    await loadFiles()
  } catch {
    // 错误提示由 axios 拦截器统一处理
  }
}

onMounted(loadFiles)
</script>

<template>
  <div class="page-card">
    <div class="page-header">
      <div>
        <div class="title">公共空间</div>
        <div class="subtitle">官方发布区 · 全员可读</div>
      </div>
      <el-upload
        v-if="auth.isAcademic"
        ref="uploadRef"
        :show-file-list="false"
        :auto-upload="false"
        :on-change="handleFileChange"
      >
        <el-button type="primary">
          <el-icon><Upload /></el-icon>
          <span class="upload-text">上传文件</span>
        </el-button>
      </el-upload>
    </div>

    <el-table v-loading="loading" :data="files" style="width: 100%">
      <el-table-column prop="fileName" label="文件名" min-width="240" show-overflow-tooltip />
      <el-table-column label="上传时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="来源" width="140" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isFromConference ? 'warning' : 'success'" size="small">
            {{ row.isFromConference ? '会议空间复制' : '官方发布' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="handleDownload(row)">
            <el-icon><Download /></el-icon>
            <span class="action-text">下载</span>
          </el-button>
          <el-button
            v-if="auth.isAcademic"
            link
            type="danger"
            size="small"
            @click="handleDelete(row)"
          >
            <el-icon><Delete /></el-icon>
            <span class="action-text">删除</span>
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="公共空间暂无文件" :image-size="80" />
      </template>
    </el-table>
  </div>
</template>

<style scoped>
.upload-text {
  margin-left: 6px;
}

.action-text {
  margin-left: 4px;
}
</style>
