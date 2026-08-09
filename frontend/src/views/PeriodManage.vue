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
import { ElMessage } from 'element-plus'
import { periodsApi } from '../api/periods'
import { useAuthStore } from '../stores/auth'
import { useEventsStore } from '../stores/events'
import type { ConferencePeriod } from '../types'

const auth = useAuthStore()
const eventsStore = useEventsStore()

const periods = ref<ConferencePeriod[]>([])
const currentPeriodId = ref('')
const loading = ref(false)
const switching = ref(false)
const creating = ref(false)

const manualNumber = ref<number | null>(null)
const manualName = ref('')

/** 下拉选项文案：第{number}会期{name} */
function periodLabel(p: ConferencePeriod): string {
  return `第${p.number}会期${p.name ?? ''}`
}

async function loadPeriods(): Promise<void> {
  loading.value = true
  try {
    const res = await periodsApi.list()
    periods.value = res.periods
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    loading.value = false
  }
}

async function loadCurrent(): Promise<void> {
  try {
    const res = await periodsApi.getCurrent()
    currentPeriodId.value = res.period?.id ?? ''
  } catch {
    // 错误提示由 axios 拦截器统一处理
  }
}

function refreshAll(): Promise<[void, void]> {
  return Promise.all([loadPeriods(), loadCurrent()])
}

/** 下拉选择即切换（即时生效，无保存按钮） */
async function onSelectCurrent(periodId: string): Promise<void> {
  if (!periodId || switching.value) return
  switching.value = true
  try {
    const res = await periodsApi.setCurrent(periodId)
    currentPeriodId.value = res.period.id
    ElMessage.success(`已切换到第${res.period.number}会期`)
  } catch {
    // 切换失败：回滚选中态到实际当前会期
    await loadCurrent()
  } finally {
    switching.value = false
  }
}

/** 下一个会期：按 MAX(number)+1 自动新建并切换 */
async function onNextPeriod(): Promise<void> {
  if (switching.value || creating.value) return
  creating.value = true
  try {
    const maxNumber = periods.value.reduce((m, p) => Math.max(m, p.number), 0)
    const res = await periodsApi.create({ number: maxNumber + 1 })
    await periodsApi.setCurrent(res.period.id)
    ElMessage.success(`已创建并切换到第${res.period.number}会期`)
    await refreshAll()
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    creating.value = false
  }
}

/** 手动输入编号（+ 可选名称）创建并切换 */
async function onManualCreate(): Promise<void> {
  if (switching.value || creating.value) return
  if (!manualNumber.value || manualNumber.value <= 0) {
    ElMessage.warning('请输入有效的会期编号')
    return
  }
  creating.value = true
  try {
    const res = await periodsApi.create({
      number: manualNumber.value,
      name: manualName.value.trim() || undefined,
    })
    await periodsApi.setCurrent(res.period.id)
    ElMessage.success(`已创建并切换到第${res.period.number}会期`)
    manualNumber.value = null
    manualName.value = ''
    await refreshAll()
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    creating.value = false
  }
}

/** 表格当前行高亮 */
function rowClassName({ row }: { row: ConferencePeriod }): string {
  return row.id === currentPeriodId.value ? 'current-row' : ''
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

let unsubscribe: (() => void) | undefined

onMounted(() => {
  void loadPeriods()
  void loadCurrent()
  unsubscribe = eventsStore.subscribe((e) => {
    if (e.type === 'period.changed') void refreshAll()
  })
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="page-card">
    <div class="page-header">
      <div>
        <div class="title">会期管理</div>
        <div class="subtitle">会议会期与全局当前会期设置（切换即时生效）</div>
      </div>
    </div>

    <div v-if="auth.isAcademic" class="period-controls">
      <div class="control-group">
        <span class="control-label">当前会期</span>
        <el-select
          v-model="currentPeriodId"
          class="period-select"
          placeholder="选择要切换的会期"
          :loading="loading"
          :disabled="switching || creating"
          @change="onSelectCurrent"
        >
          <el-option
            v-for="p in periods"
            :key="p.id"
            :label="periodLabel(p)"
            :value="p.id"
          />
        </el-select>
      </div>

      <el-button
        type="primary"
        :loading="creating"
        :disabled="switching"
        @click="onNextPeriod"
      >
        下一个会期
      </el-button>

      <div class="control-group manual-group">
        <span class="control-label">手动新建</span>
        <el-input-number
          v-model="manualNumber"
          :min="1"
          :max="9999"
          placeholder="编号"
          controls-position="right"
          class="manual-number"
        />
        <el-input
          v-model="manualName"
          placeholder="名称（选填）"
          clearable
          class="manual-name"
        />
        <el-button
          type="success"
          :loading="creating"
          :disabled="switching"
          @click="onManualCreate"
        >
          创建并切换
        </el-button>
      </div>
    </div>

    <el-table
      :data="periods"
      v-loading="loading"
      row-key="id"
      :row-class-name="rowClassName"
      class="period-table"
    >
      <el-table-column label="编号" width="100" align="center">
        <template #default="{ row }">
          {{ (row as ConferencePeriod).number }}
        </template>
      </el-table-column>

      <el-table-column label="名称" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          {{ (row as ConferencePeriod).name || '—' }}
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">
          {{ formatTime((row as ConferencePeriod).createdAt) }}
        </template>
      </el-table-column>

      <el-table-column label="当前标记" width="100" align="center">
        <template #default="{ row }">
          <el-tag
            v-if="(row as ConferencePeriod).id === currentPeriodId"
            type="success"
            size="small"
          >
            当前
          </el-tag>
          <span v-else>—</span>
        </template>
      </el-table-column>

      <template #empty>
        <el-empty
          :description="loading ? '加载中…' : '暂无会期，请创建第一个会期'"
          :image-size="80"
        />
      </template>
    </el-table>
  </div>
</template>

<style scoped>
.period-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  white-space: nowrap;
}

.period-select {
  width: 200px;
}

.manual-number {
  width: 120px;
}

.manual-name {
  width: 180px;
}

.period-table :deep(tr.current-row > td.el-table__cell) {
  background-color: var(--el-color-success-light-9, #f0f9eb);
}

@media (max-width: 768px) {
  .period-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .control-group {
    flex-wrap: wrap;
  }

  .period-select,
  .manual-number,
  .manual-name {
    width: 100%;
  }

  .manual-group {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
