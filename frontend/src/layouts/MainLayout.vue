<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const spaceTitle = computed(() => {
  const map: Record<string, { title: string; subtitle: string }> = {
    cabinet: { title: '内阁空间', subtitle: '本内阁内部文件，严格隔离' },
    public: { title: '公共空间', subtitle: '官方发布区，全员可读' },
    conference: { title: '会议空间', subtitle: '大会文件提交与审核' },
    consult: { title: '磋商空间', subtitle: '双边文件磋商（传纸条）' },
  }
  return map[route.name as string] || { title: '', subtitle: '' }
})

function logout() {
  auth.logout()
  router.push('/login')
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
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div>
          <div class="header-title">{{ spaceTitle.title }}</div>
          <div class="header-subtitle">{{ spaceTitle.subtitle }}</div>
        </div>
        <el-dropdown @command="(cmd: string) => cmd === 'logout' && logout()">
          <div class="user-info">
            <el-avatar :size="32" class="avatar">
              {{ auth.user?.name?.charAt(0)?.toUpperCase() }}
            </el-avatar>
            <div class="user-text">
              <div class="user-name">{{ auth.user?.name }}</div>
              <div class="user-role">
                {{ auth.user?.cabinet?.name || '' }} ·
                {{ auth.isAcademic ? '学术组' : '代表' }}
              </div>
            </div>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
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
</style>
