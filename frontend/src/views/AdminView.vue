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
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi, cabinetsApi } from '../api'
import type { AdminUser, Cabinet, CabinetType } from '../types'

/* ---------- 通用工具 ---------- */

/** 将 ISO 时间字符串格式化为 YYYY-MM-DD HH:mm */
function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const roleLabel: Record<string, string> = {
  ADMIN: '系统管理员',
  DELEGATE: '代表',
  ACADEMIC: '学术组',
}

const roleTagType: Record<string, 'danger' | 'primary' | 'warning'> = {
  ADMIN: 'danger',
  DELEGATE: 'primary',
  ACADEMIC: 'warning',
}

const cabinetTypeLabel: Record<string, string> = {
  CABINET: '内阁',
  BUREAU: '主席团',
  CRISIS: '危机团队',
}

const cabinetTagType: Record<string, 'primary' | 'warning' | 'danger'> = {
  CABINET: 'primary',
  BUREAU: 'warning',
  CRISIS: 'danger',
}

const activeTab = ref('users')

/* ---------- 数据加载 ---------- */

const users = ref<AdminUser[]>([])
const cabinets = ref<Cabinet[]>([])
const usersLoading = ref(false)
const cabinetsLoading = ref(false)

async function loadUsers(): Promise<void> {
  usersLoading.value = true
  try {
    users.value = await adminApi.users()
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    usersLoading.value = false
  }
}

async function loadCabinets(): Promise<void> {
  cabinetsLoading.value = true
  try {
    cabinets.value = await cabinetsApi.list()
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    cabinetsLoading.value = false
  }
}

onMounted(() => {
  void loadUsers()
  void loadCabinets()
})

/* ---------- 添加账户 ---------- */

const addUserVisible = ref(false)
const addUserSubmitting = ref(false)
const addUserForm = ref({
  name: '',
  password: '',
  role: 'DELEGATE' as 'DELEGATE' | 'ACADEMIC',
  cabinetId: '',
})

/** 所属组织选项：代表只能归入内阁，学术组归入主席团/危机团队 */
const availableCabinetsForAdd = computed(() =>
  cabinets.value.filter((c) =>
    addUserForm.value.role === 'DELEGATE' ? c.type === 'CABINET' : c.type !== 'CABINET',
  ),
)

function onAddUserRoleChange(): void {
  addUserForm.value.cabinetId = ''
}

function resetAddUserForm(): void {
  addUserForm.value = { name: '', password: '', role: 'DELEGATE', cabinetId: '' }
}

async function handleCreateUser(): Promise<void> {
  const { name, password, role, cabinetId } = addUserForm.value
  if (!name) {
    ElMessage.warning('请输入用户名')
    return
  }
  if (password.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }
  if (!cabinetId) {
    ElMessage.warning('请选择所属组织')
    return
  }
  addUserSubmitting.value = true
  try {
    await adminApi.createUser({ name, password, role, cabinetId })
    ElMessage.success('账户创建成功')
    addUserVisible.value = false
    resetAddUserForm()
    await loadUsers()
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    addUserSubmitting.value = false
  }
}

/* ---------- 修改密码 ---------- */

const pwdVisible = ref(false)
const pwdSubmitting = ref(false)
const pwdTarget = ref<AdminUser | null>(null)
const newPassword = ref('')

function openChangePassword(row: AdminUser): void {
  pwdTarget.value = row
  newPassword.value = ''
  pwdVisible.value = true
}

async function handleChangePassword(): Promise<void> {
  const target = pwdTarget.value
  if (!target) return
  if (newPassword.value.length < 6) {
    ElMessage.warning('新密码至少 6 位')
    return
  }
  pwdSubmitting.value = true
  try {
    await adminApi.changePassword(target.id, newPassword.value)
    ElMessage.success('密码修改成功')
    pwdVisible.value = false
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    pwdSubmitting.value = false
  }
}

/* ---------- 删除账户 ---------- */

async function handleDeleteUser(row: AdminUser): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除账户「${row.name}」吗？删除后不可恢复。`, '删除账户', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return
  }
  try {
    await adminApi.deleteUser(row.id)
    ElMessage.success('删除成功')
    await loadUsers()
  } catch {
    // 错误提示由 axios 拦截器统一处理
  }
}

/* ---------- 开设内阁 ---------- */

const addCabinetVisible = ref(false)
const addCabinetSubmitting = ref(false)
const addCabinetForm = ref<{ name: string; type: CabinetType }>({ name: '', type: 'CABINET' })

const cabinetTypeOptions: { value: CabinetType; label: string }[] = [
  { value: 'CABINET', label: '内阁' },
  { value: 'BUREAU', label: '主席团' },
  { value: 'CRISIS', label: '危机团队' },
]

function resetAddCabinetForm(): void {
  addCabinetForm.value = { name: '', type: 'CABINET' }
}

async function handleCreateCabinet(): Promise<void> {
  const { name, type } = addCabinetForm.value
  if (!name) {
    ElMessage.warning('请输入组织名称')
    return
  }
  addCabinetSubmitting.value = true
  try {
    await adminApi.createCabinet({ name, type })
    ElMessage.success('内阁创建成功')
    addCabinetVisible.value = false
    resetAddCabinetForm()
    // 刷新列表，同时刷新「添加账户」弹窗中的所属组织选项
    await loadCabinets()
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    addCabinetSubmitting.value = false
  }
}

/* ---------- 删除内阁 ---------- */

async function handleDeleteCabinet(row: Cabinet): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除内阁「${row.name}」吗？删除内阁将同时删除其成员账户与所有文件，此操作不可恢复。`,
      '删除内阁',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      },
    )
  } catch {
    return
  }
  try {
    await adminApi.deleteCabinet(row.id)
    ElMessage.success('删除成功')
    await loadCabinets()
  } catch {
    // 错误提示由 axios 拦截器统一处理
  }
}
</script>

<template>
  <div class="page-card">
    <el-tabs v-model="activeTab">
      <!-- 账户管理 -->
      <el-tab-pane label="账户管理" name="users">
        <div class="page-header">
          <div>
            <div class="title">账户管理</div>
            <div class="subtitle">管理系统全部用户账户</div>
          </div>
          <el-button type="primary" @click="addUserVisible = true">
            <el-icon><Plus /></el-icon>
            <span>添加账户</span>
          </el-button>
        </div>

        <el-table :data="users" v-loading="usersLoading" row-key="id">
          <el-table-column label="用户名" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              {{ (row as AdminUser).name }}
            </template>
          </el-table-column>

          <el-table-column label="身份" width="120">
            <template #default="{ row }">
              <el-tag :type="roleTagType[(row as AdminUser).role]" size="small">
                {{ roleLabel[(row as AdminUser).role] }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="所属组织" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              {{ (row as AdminUser).cabinet?.name || '—' }}
            </template>
          </el-table-column>

          <el-table-column label="注册时间" width="170">
            <template #default="{ row }">
              {{ formatTime((row as AdminUser).createdAt) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                size="small"
                @click="openChangePassword(row as AdminUser)"
              >
                <el-icon><Key /></el-icon>
                <span>改密码</span>
              </el-button>
              <el-button
                v-if="(row as AdminUser).role !== 'ADMIN'"
                link
                type="danger"
                size="small"
                @click="handleDeleteUser(row as AdminUser)"
              >
                <el-icon><Delete /></el-icon>
                <span>删除</span>
              </el-button>
            </template>
          </el-table-column>

          <template #empty>
            <el-empty description="暂无账户" :image-size="80" />
          </template>
        </el-table>
      </el-tab-pane>

      <!-- 内阁管理 -->
      <el-tab-pane label="内阁管理" name="cabinets">
        <div class="page-header">
          <div>
            <div class="title">内阁管理</div>
            <div class="subtitle">管理内阁、主席团与危机团队组织</div>
          </div>
          <el-button type="primary" @click="addCabinetVisible = true">
            <el-icon><OfficeBuilding /></el-icon>
            <span>开设内阁</span>
          </el-button>
        </div>

        <el-table :data="cabinets" v-loading="cabinetsLoading" row-key="id">
          <el-table-column label="名称" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              {{ (row as Cabinet).name }}
            </template>
          </el-table-column>

          <el-table-column label="类型" width="140">
            <template #default="{ row }">
              <el-tag :type="cabinetTagType[(row as Cabinet).type]" size="small">
                {{ cabinetTypeLabel[(row as Cabinet).type] }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button
                link
                type="danger"
                size="small"
                @click="handleDeleteCabinet(row as Cabinet)"
              >
                <el-icon><Delete /></el-icon>
                <span>删除</span>
              </el-button>
            </template>
          </el-table-column>

          <template #empty>
            <el-empty description="暂无内阁" :image-size="80" />
          </template>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加账户弹窗 -->
    <el-dialog v-model="addUserVisible" title="添加账户" width="440px" @closed="resetAddUserForm">
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="用户名">
          <el-input v-model="addUserForm.name" placeholder="请输入用户名" />
        </el-form-item>

        <el-form-item label="初始密码">
          <el-input
            v-model="addUserForm.password"
            type="password"
            show-password
            placeholder="至少 6 位"
          />
        </el-form-item>

        <el-form-item label="身份">
          <el-select v-model="addUserForm.role" style="width: 100%" @change="onAddUserRoleChange">
            <el-option value="DELEGATE" label="代表" />
            <el-option value="ACADEMIC" label="学术组" />
          </el-select>
        </el-form-item>

        <el-form-item label="所属组织">
          <el-select
            v-model="addUserForm.cabinetId"
            style="width: 100%"
            :loading="cabinetsLoading"
            placeholder="请选择所属组织"
          >
            <el-option
              v-for="c in availableCabinetsForAdd"
              :key="c.id"
              :value="c.id"
              :label="`${c.name}（${cabinetTypeLabel[c.type]}）`"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="addUserVisible = false">取消</el-button>
        <el-button type="primary" :loading="addUserSubmitting" @click="handleCreateUser">
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 修改密码弹窗 -->
    <el-dialog
      v-model="pwdVisible"
      :title="`修改密码：${pwdTarget?.name || ''}`"
      width="420px"
    >
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="新密码">
          <el-input
            v-model="newPassword"
            type="password"
            show-password
            placeholder="至少 6 位"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="pwdSubmitting" @click="handleChangePassword">
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 开设内阁弹窗 -->
    <el-dialog
      v-model="addCabinetVisible"
      title="开设内阁"
      width="440px"
      @closed="resetAddCabinetForm"
    >
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="名称">
          <el-input v-model="addCabinetForm.name" placeholder="请输入组织名称" />
        </el-form-item>

        <el-form-item label="类型">
          <el-select v-model="addCabinetForm.type" style="width: 100%">
            <el-option
              v-for="opt in cabinetTypeOptions"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="addCabinetVisible = false">取消</el-button>
        <el-button type="primary" :loading="addCabinetSubmitting" @click="handleCreateCabinet">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
