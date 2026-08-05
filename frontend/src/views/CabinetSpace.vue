<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox, type UploadFile, type UploadInstance } from 'element-plus'
import { filesApi } from '../api'
import { useAuthStore } from '../stores/auth'
import type { FileEntity } from '../types'

const auth = useAuthStore()
// Pinia store refs auto-unwrap: isAcademic 为布尔值
const isAcademic = auth.isAcademic

const files = ref<FileEntity[]>([])
const loading = ref(false)
const uploading = ref(false)
const selectedFile = ref<File | null>(null)
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

function handleFileChange(file: UploadFile): void {
  if (file.raw) {
    selectedFile.value = file.raw
  }
}

async function handleUpload(): Promise<void> {
  const file = selectedFile.value
  if (!file) {
    ElMessage.warning('请先选择要上传的文件')
    return
  }
  uploading.value = true
  try {
    await filesApi.upload('CABINET', file)
    ElMessage.success('上传成功')
    selectedFile.value = null
    uploadRef.value?.clearFiles()
    await loadFiles()
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    uploading.value = false
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

onMounted(() => {
  if (!isAcademic) {
    void loadFiles()
  }
})
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
        >
          <el-button :disabled="uploading">
            <el-icon><FolderAdd /></el-icon>
            <span>选择文件</span>
          </el-button>
        </el-upload>
        <el-button
          type="primary"
          :loading="uploading"
          :disabled="!selectedFile"
          @click="handleUpload"
        >
          <el-icon><Upload /></el-icon>
          <span>上传文件</span>
        </el-button>
      </div>
    </div>

    <div class="pick-hint" :class="{ 'has-file': !!selectedFile }">
      <template v-if="selectedFile">
        <el-icon class="pick-hint-icon"><Document /></el-icon>
        <span class="pick-hint-name">{{ selectedFile.name }}</span>
      </template>
      <template v-else>请先选择文件，再点击「上传文件」</template>
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

.pick-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}

.pick-hint.has-file {
  color: #606266;
}

.pick-hint-icon {
  flex-shrink: 0;
  color: #409eff;
}

.pick-hint-name {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>
