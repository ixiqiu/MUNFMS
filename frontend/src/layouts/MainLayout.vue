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
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useEventsStore } from '../stores/events'
import { useNotificationsStore } from '../stores/notifications'
import { periodsApi } from '../api/periods'
import type { ConferencePeriod } from '../types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const eventsStore = useEventsStore()
const notificationsStore = useNotificationsStore()

const isMobile = ref(false)
const drawerVisible = ref(false)

function updateIsMobile() {
  isMobile.value = window.innerWidth < 768
}

watch(
  () => route.name,
  () => {
    drawerVisible.value = false
  },
)

const spaceTitle = computed(() => {
  const map: Record<string, { title: string; subtitle: string }> = {
    cabinet: { title: '内阁空间', subtitle: '本内阁内部文件，严格隔离' },
    public: { title: '公共空间', subtitle: '官方发布区，全员可读' },
    conference: { title: '会议空间', subtitle: '大会文件提交与审核' },
    consult: { title: '磋商空间', subtitle: '双边文件磋商（传纸条）' },
    academic: { title: '通知总控', subtitle: '代表通知状态一览' },
    admin: { title: '系统管理', subtitle: '账户与内阁管理' },
    about: { title: '关于', subtitle: '项目信息与许可证' },
    periods: { title: '会期管理', subtitle: '会议会期与全局当前会期设置' },
    timeline: { title: '局势时间线', subtitle: '危机局势更新与新闻动态' },
    directives: { title: '指令提交', subtitle: '指令提交与审核' },
    asym: { title: '不对称消息', subtitle: '与学术组的一对一私密通道' },
    'directive-types': { title: '指令类型管理', subtitle: '指令类型的新增与删除' },
  }
  return map[route.name as string] || { title: '', subtitle: '' }
})

const isAdmin = computed(() => auth.user?.role === 'ADMIN')
const roleLabel = computed(() => {
  if (auth.user?.role === 'ADMIN') return '系统管理员'
  return auth.isAcademic ? '学术组' : '代表'
})

const showFileListBanner = computed(
  () =>
    eventsStore.mode === 'polling' &&
    !eventsStore.bannerDismissed &&
    ['cabinet', 'public', 'conference'].includes(route.name as string),
)

// 当前会期展示（无会期时隐藏）
const currentPeriod = ref<ConferencePeriod | null>(null)

const currentPeriodLabel = computed(() => {
  const p = currentPeriod.value
  if (!p) return ''
  return `当前会期：第${p.number}会期${p.name ?? ''}`
})

async function refreshCurrentPeriod() {
  try {
    const res = await periodsApi.getCurrent()
    currentPeriod.value = res.period
  } catch {
    // 错误已由 axios 拦截器统一提示
  }
}

let unsubscribePeriod: (() => void) | undefined

onMounted(() => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
  eventsStore.init()
  notificationsStore.init()
  void refreshCurrentPeriod()
  unsubscribePeriod = eventsStore.subscribe((e) => {
    if (e.type === 'period.changed') void refreshCurrentPeriod()
  })
})
onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
  eventsStore.destroy()
  notificationsStore.destroy()
  unsubscribePeriod?.()
})

function logout() {
  auth.logout()
  router.push('/login')
}

const notifDialogVisible = ref(false)

function handleCommand(cmd: string) {
  if (cmd === 'logout') return logout()
  if (cmd === 'notif-settings') notifDialogVisible.value = true
}

function handleToggleEnabled(value: string | number | boolean) {
  void notificationsStore.toggleEnabled(Boolean(value))
}
</script>

<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <el-icon :size="22"><Collection /></el-icon>
        <span>模联文件管理</span>
      </div>
      <el-menu :default-active="route.name as string" router class="menu">
        <template v-if="isAdmin">
          <el-menu-item index="admin">
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </el-menu-item>
          <el-menu-item index="consult">
            <el-icon><ChatDotRound /></el-icon>
            <span>群聊管理</span>
          </el-menu-item>
          <el-menu-item index="directive-types">
            <el-icon><PriceTag /></el-icon>
            <span>指令类型管理</span>
          </el-menu-item>
        </template>
        <template v-else>
          <el-menu-item v-if="auth.isAcademic" index="periods">
            <el-icon><Calendar /></el-icon>
            <span>会期管理</span>
          </el-menu-item>
          <el-menu-item index="cabinet">
            <el-icon><FolderOpened /></el-icon>
            <span>内阁空间</span>
          </el-menu-item>
          <el-menu-item index="public">
            <el-icon><Files /></el-icon>
            <span>公共空间</span>
          </el-menu-item>
          <el-menu-item index="conference">
            <el-icon><Document /></el-icon>
            <span>会议空间</span>
          </el-menu-item>
          <el-menu-item index="consult">
            <el-icon><ChatDotRound /></el-icon>
            <span>磋商空间</span>
          </el-menu-item>
          <el-menu-item index="timeline">
            <el-icon><Clock /></el-icon>
            <span>局势时间线</span>
          </el-menu-item>
          <el-menu-item index="directives">
            <el-icon><Memo /></el-icon>
            <span>指令提交</span>
          </el-menu-item>
          <el-menu-item index="asym">
            <el-icon><ChatLineRound /></el-icon>
            <span>不对称消息</span>
          </el-menu-item>
          <el-menu-item v-if="auth.isAcademic" index="academic">
            <el-icon><Bell /></el-icon>
            <span>通知总控</span>
          </el-menu-item>
        </template>
        <el-menu-item index="about">
          <el-icon><InfoFilled /></el-icon>
          <span>关于</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <el-button
          v-if="isMobile"
          circle
          class="menu-btn"
          aria-label="打开菜单"
          @click="drawerVisible = true"
        >
          <el-icon><Menu /></el-icon>
        </el-button>
        <div>
          <div class="header-title">{{ spaceTitle.title }}</div>
          <div class="header-subtitle">{{ spaceTitle.subtitle }}</div>
        </div>
        <div class="header-right">
          <el-tag v-if="currentPeriodLabel" type="info" effect="plain" class="period-tag">
            {{ currentPeriodLabel }}
          </el-tag>
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="32" class="avatar">
                {{ auth.user?.name?.charAt(0)?.toUpperCase() }}
              </el-avatar>
              <div class="user-text">
                <div class="user-name">{{ auth.user?.name }}</div>
                <div class="user-role">
                  {{ auth.user?.cabinet?.name || '' }} ·
                  {{ roleLabel }}
                </div>
              </div>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="notif-settings">通知设置</el-dropdown-item>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <el-alert
          v-if="showFileListBanner"
          type="warning"
          show-icon
          :closable="true"
          class="sse-banner"
          title="受限于网络环境，无法自动更新文件列表，请定期手动刷新"
          @close="eventsStore.dismissBanner()"
        />
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <el-drawer
    v-model="drawerVisible"
    direction="ltr"
    size="240px"
    :with-header="false"
    class="mobile-drawer"
  >
    <div class="drawer-inner">
      <div class="logo">
        <el-icon :size="22"><Collection /></el-icon>
        <span>模联文件管理</span>
      </div>
      <el-menu :default-active="route.name as string" router class="menu">
        <template v-if="isAdmin">
          <el-menu-item index="admin">
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </el-menu-item>
          <el-menu-item index="consult">
            <el-icon><ChatDotRound /></el-icon>
            <span>群聊管理</span>
          </el-menu-item>
          <el-menu-item index="directive-types">
            <el-icon><PriceTag /></el-icon>
            <span>指令类型管理</span>
          </el-menu-item>
        </template>
        <template v-else>
          <el-menu-item v-if="auth.isAcademic" index="periods">
            <el-icon><Calendar /></el-icon>
            <span>会期管理</span>
          </el-menu-item>
          <el-menu-item index="cabinet">
            <el-icon><FolderOpened /></el-icon>
            <span>内阁空间</span>
          </el-menu-item>
          <el-menu-item index="public">
            <el-icon><Files /></el-icon>
            <span>公共空间</span>
          </el-menu-item>
          <el-menu-item index="conference">
            <el-icon><Document /></el-icon>
            <span>会议空间</span>
          </el-menu-item>
          <el-menu-item index="consult">
            <el-icon><ChatDotRound /></el-icon>
            <span>磋商空间</span>
          </el-menu-item>
          <el-menu-item index="timeline">
            <el-icon><Clock /></el-icon>
            <span>局势时间线</span>
          </el-menu-item>
          <el-menu-item index="directives">
            <el-icon><Memo /></el-icon>
            <span>指令提交</span>
          </el-menu-item>
          <el-menu-item index="asym">
            <el-icon><ChatLineRound /></el-icon>
            <span>不对称消息</span>
          </el-menu-item>
          <el-menu-item v-if="auth.isAcademic" index="academic">
            <el-icon><Bell /></el-icon>
            <span>通知总控</span>
          </el-menu-item>
        </template>
        <el-menu-item index="about">
          <el-icon><InfoFilled /></el-icon>
          <span>关于</span>
        </el-menu-item>
      </el-menu>
    </div>
  </el-drawer>

  <!-- 通知设置弹窗 -->
  <el-dialog v-model="notifDialogVisible" title="通知设置" width="420px">
    <div class="notif-settings">
      <div class="notif-row">
        <span class="notif-label">接收浏览器通知</span>
        <el-switch
          v-model="notificationsStore.enabled"
          @change="handleToggleEnabled"
        />
      </div>
      <div class="notif-status">
        <template v-if="notificationsStore.permission === 'granted'">
          <span class="notif-status-text">通知权限已授权</span>
        </template>
        <template v-else-if="notificationsStore.permission === 'denied'">
          <span class="notif-status-text notif-status-warn">
            浏览器已阻止通知权限，请在地址栏左侧图标 → 网站设置 → 通知中允许本站
          </span>
        </template>
        <template v-else-if="notificationsStore.permission === 'default'">
          <span class="notif-status-text">尚未授权</span>
          <el-button size="small" type="primary" @click="notificationsStore.requestPermission()">
            重新请求权限
          </el-button>
        </template>
        <template v-else>
          <span class="notif-status-text">当前浏览器不支持通知</span>
        </template>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="notifDialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.layout {
  height: 100%;
}

.aside {
  background: #001529;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.menu {
  flex: 1;
  border-right: none;
  background: transparent;
  --el-menu-text-color: rgba(255, 255, 255, 0.68);
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.08);
  --el-menu-active-color: #409eff;
  --el-menu-bg-color: transparent;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-subtitle {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.period-tag {
  flex-shrink: 0;
  font-size: 12px;
}

.avatar {
  background: #409eff;
  color: #fff;
  font-weight: 600;
}

.user-text {
  text-align: left;
  line-height: 1.2;
}

.user-name {
  font-size: 13px;
  color: #303133;
}

.user-role {
  font-size: 11px;
  color: #909399;
}

.main {
  padding: 20px;
  overflow-y: auto;
}

.sse-banner {
  margin-bottom: 12px;
}

.drawer-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #001529;
}

.mobile-drawer {
  background: #001529;
}

.mobile-drawer :deep(.el-drawer__body) {
  padding: 0;
}

.notif-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notif-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notif-label {
  font-size: 14px;
  color: #303133;
}

.notif-status {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.notif-status-text {
  font-size: 13px;
  line-height: 1.5;
  color: #909399;
}

.notif-status-warn {
  color: #e6a23c;
}

@media (max-width: 768px) {
  .aside {
    display: none;
  }

  .main {
    padding: 12px;
  }

  .header {
    padding: 0 12px;
    justify-content: flex-start;
    gap: 10px;
  }

  .header-right {
    margin-left: auto;
  }

  .header :deep(.el-dropdown) {
    margin-left: auto;
  }
}
</style>
