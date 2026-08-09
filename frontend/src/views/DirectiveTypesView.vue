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
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'
import { directivesApi } from '../api/directives'
import type { DirectiveType } from '../types'

const types = ref<DirectiveType[]>([])
const loading = ref(false)
const newTypeName = ref('')
const creating = ref(false)

async function loadTypes(): Promise<void> {
  loading.value = true
  try {
    const res = await directivesApi.listTypes()
    types.value = res.types
  } catch {
    // 错误由 axios 拦截器统一提示
  } finally {
    loading.value = false
  }
}

async function createType(): Promise<void> {
  const name = newTypeName.value.trim()
  if (!name) {
    ElMessage.warning('请输入类型名称')
    return
  }
  creating.value = true
  try {
    await directivesApi.createType(name)
    ElMessage.success('类型创建成功')
    newTypeName.value = ''
    await loadTypes()
  } catch {
    // 错误由 axios 拦截器统一提示（重名会提示「该指令类型已存在」）
  } finally {
    creating.value = false
  }
}

async function deleteType(t: DirectiveType): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除指令类型「${t.name}」？删除后已提交指令保留类型名称快照，不受影响。`,
      '删除指令类型',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }
  try {
    await directivesApi.deleteType(t.id)
    ElMessage.success('类型已删除')
    await loadTypes()
  } catch {
    // 错误由 axios 拦截器统一提示
  }
}

function formatTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(() => {
  void loadTypes()
})
</script>

<template>
  <div class="page-card">
    <div class="page-header">
      <div>
        <div class="title">指令类型管理</div>
        <div class="subtitle">代表提交指令时可选的类型；删除类型不影响已提交指令</div>
      </div>
    </div>

    <div class="create-bar">
      <el-input
        v-model="newTypeName"
        placeholder="输入新指令类型名称"
        maxlength="50"
        clearable
        @keyup.enter="createType"
      />
      <el-button type="primary" :icon="Plus" :loading="creating" @click="createType">新增类型</el-button>
    </div>

    <el-table :data="types" v-loading="loading" row-key="id">
      <el-table-column label="类型名称" min-width="160">
        <template #default="{ row }">
          {{ (row as DirectiveType).name }}
        </template>
      </el-table-column>
      <el-table-column label="预设标记" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="(row as DirectiveType).isPreset ? 'info' : 'success'" size="small">
            {{ (row as DirectiveType).isPreset ? '预设' : '自定义' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="170">
        <template #default="{ row }">
          {{ formatTime((row as DirectiveType).createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" align="center">
        <template #default="{ row }">
          <el-button
            size="small"
            type="danger"
            plain
            :icon="Delete"
            @click="deleteType(row as DirectiveType)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无指令类型" :image-size="80" />
      </template>
    </el-table>
  </div>
</template>

<style scoped>
.create-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  max-width: 420px;
}

@media (max-width: 768px) {
  .page-header {
    flex-wrap: wrap;
    gap: 12px;
  }

  .create-bar {
    max-width: 100%;
  }
}
</style>
