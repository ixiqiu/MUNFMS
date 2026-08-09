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
import { Search } from '@element-plus/icons-vue'
import { notificationsApi } from '../api/notifications'
import type { ConnectionStatus, DelegateNotificationStatus, NotificationPermissionState } from '../types'

/** 将 ISO 时间字符串格式化为 YYYY-MM-DD HH:mm */
function formatTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const delegates = ref<DelegateNotificationStatus[]>([])
const loading = ref(false)
const keyword = ref('')
let searchTimer: number | undefined

async function loadOverview(): Promise<void> {
  loading.value = true
  try {
    const res = await notificationsApi.getOverview(keyword.value.trim() || undefined)
    delegates.value = res.delegates
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    loading.value = false
  }
}

function onSearchInput(): void {
  if (searchTimer !== undefined) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    searchTimer = undefined
    void loadOverview()
  }, 300)
}

onMounted(() => {
  void loadOverview()
})

onUnmounted(() => {
  if (searchTimer !== undefined) window.clearTimeout(searchTimer)
})

/* ---------- 展示映射（只读，无任何写入口） ---------- */

const permissionLabel: Record<NotificationPermissionState, string> = {
  granted: '已授权',
  denied: '未授权-已阻止',
  default: '未授权-未应答',
  unsupported: '不支持',
}

const permissionTagType: Record<NotificationPermissionState, 'success' | 'danger' | 'warning' | 'info'> = {
  granted: 'success',
  denied: 'danger',
  default: 'warning',
  unsupported: 'info',
}

const connectionLabel: Record<ConnectionStatus, string> = {
  online: '在线',
  polling: '轮询回退',
  offline: '离线',
}

const connectionTagType: Record<ConnectionStatus, 'success' | 'warning' | 'info'> = {
  online: 'success',
  polling: 'warning',
  offline: 'info',
}

function connectionTip(status: ConnectionStatus): string {
  if (status === 'online') return '在线：SSE 实时连接中'
  if (status === 'polling') return '轮询回退：SSE 失联已降级为轮询'
  return '离线：未连接'
}
</script>

<template>
  <div class="page-card">
    <div class="page-header">
      <div>
        <div class="title">通知总控</div>
        <div class="subtitle">代表通知开关与浏览器权限状态一览</div>
      </div>
      <el-input
        v-model="keyword"
        class="overview-search"
        placeholder="搜索姓名 / 所属内阁"
        clearable
        :prefix-icon="Search"
        @input="onSearchInput"
      />
    </div>

    <el-table :data="delegates" v-loading="loading" row-key="userId" class="overview-table">
      <el-table-column label="姓名" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">
          {{ (row as DelegateNotificationStatus).name }}
        </template>
      </el-table-column>

      <el-table-column label="所属内阁" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          {{ (row as DelegateNotificationStatus).cabinetName || '—' }}
        </template>
      </el-table-column>

      <el-table-column label="通知开关" width="100" align="center">
        <template #default="{ row }">
          <el-tag
            :type="(row as DelegateNotificationStatus).enabled ? 'success' : 'info'"
            size="small"
          >
            {{ (row as DelegateNotificationStatus).enabled ? '开启' : '关闭' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="浏览器权限" width="150" align="center">
        <template #default="{ row }">
          <el-tooltip
            content="仅供参考：浏览器权限由客户端最近一次上报"
            placement="top"
          >
            <el-tag
              v-if="(row as DelegateNotificationStatus).lastPermission"
              :type="permissionTagType[(row as DelegateNotificationStatus).lastPermission as NotificationPermissionState]"
              size="small"
            >
              {{ permissionLabel[(row as DelegateNotificationStatus).lastPermission as NotificationPermissionState] }}
            </el-tag>
            <el-tag v-else type="info" size="small">未上报</el-tag>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column label="连接状态" width="110" align="center">
        <template #default="{ row }">
          <el-tooltip :content="connectionTip((row as DelegateNotificationStatus).connectionStatus)" placement="top">
            <el-tag
              :type="connectionTagType[(row as DelegateNotificationStatus).connectionStatus]"
              size="small"
            >
              {{ connectionLabel[(row as DelegateNotificationStatus).connectionStatus] }}
            </el-tag>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column label="最近上报时间" width="170">
        <template #default="{ row }">
          {{ formatTime((row as DelegateNotificationStatus).lastPermissionAt) }}
        </template>
      </el-table-column>

      <template #empty>
        <el-empty
          :description="loading ? '加载中…' : '暂无代表数据'"
          :image-size="80"
        />
      </template>
    </el-table>
  </div>
</template>

<style scoped>
.overview-search {
  width: 240px;
}

@media (max-width: 768px) {
  .page-header {
    flex-wrap: wrap;
    gap: 12px;
  }

  .overview-search {
    width: 100%;
  }
}
</style>
