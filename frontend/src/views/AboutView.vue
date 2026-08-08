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
import { ref } from 'vue'
import { aboutApi } from '../api'

const licenseVisible = ref(false)
const licenseText = ref('')
const licenseLoading = ref(false)
let licenseFetched = false

async function loadLicense(): Promise<void> {
  if (licenseFetched) return
  licenseLoading.value = true
  try {
    const data = await aboutApi.getLicense()
    licenseText.value = data.text
    licenseFetched = true
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    licenseLoading.value = false
  }
}
</script>

<template>
  <div class="about-page">
    <!-- 简介 -->
    <el-card class="about-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon class="card-icon" :size="18"><InfoFilled /></el-icon>
          <span>简介</span>
        </div>
      </template>
      <p class="intro-text">
        模联文件管理系统（MUN File Management System）是常中模联会议的一站式文件流转与磋商管理平台，为模拟联合国会议提供严格隔离的内部文件管理、官方文件发布、大会文件审核提交，以及代表间「拉群」式的双边/多边磋商功能。
      </p>
      <ul class="feature-list">
        <li>四大空间：内阁 / 公共 / 会议 / 磋商空间，彼此严格隔离</li>
        <li>管理员系统：账户管理与内阁管理</li>
        <li>基于 JWT 的身份权限隔离，杜绝越权访问</li>
      </ul>
    </el-card>

    <!-- 免责声明 -->
    <el-card class="about-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon class="card-icon" :size="18"><WarningFilled /></el-icon>
          <span>免责声明</span>
        </div>
      </template>
      <pre class="disclaimer">MUNFMS  Copyright (C) 2026  iXiQiu(@ixiqiu)
This program comes with ABSOLUTELY NO WARRANTY
This is free software, and you are welcome to redistribute it under certain conditions</pre>
    </el-card>

    <!-- 许可证 -->
    <el-card class="about-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon class="card-icon" :size="18"><Reading /></el-icon>
          <span>许可证</span>
        </div>
      </template>
      <p class="desc-text">
        本项目基于 GNU General Public License v3 or later 发布，您可以在下方查看完整的许可证文本，了解您的权利与义务。
      </p>
      <el-button type="primary" @click="licenseVisible = true">
        <el-icon><Document /></el-icon>
        <span>查看完整许可证</span>
      </el-button>
    </el-card>

    <!-- 项目主页 -->
    <el-card class="about-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon class="card-icon" :size="18"><Link /></el-icon>
          <span>项目主页</span>
        </div>
      </template>
      <p class="desc-text">欢迎访问项目主页，获取源码、文档与最新动态：</p>
      <el-link type="primary" href="https://github.com/ixiqiu/" target="_blank" rel="noopener">
        https://github.com/ixiqiu/
      </el-link>
    </el-card>

    <!-- 完整许可证弹窗 -->
    <el-dialog
      v-model="licenseVisible"
      title="GNU General Public License v3 or later"
      width="800px"
      @open="loadLicense"
    >
      <div v-loading="licenseLoading" class="license-body">
        <pre v-if="licenseText" class="license-text">{{ licenseText }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.about-page {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.about-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.card-icon {
  color: #409eff;
}

.intro-text {
  color: #606266;
  font-size: 14px;
  line-height: 1.8;
}

.feature-list {
  margin-top: 12px;
  padding-left: 20px;
  color: #606266;
  font-size: 14px;
  line-height: 1.9;
}

.desc-text {
  margin-bottom: 12px;
  color: #606266;
  font-size: 14px;
  line-height: 1.8;
}

.disclaimer {
  margin: 0;
  padding: 12px 16px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.8;
  color: #303133;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
}

.license-body {
  min-height: 120px;
}

.license-text {
  margin: 0;
  padding: 4px;
  max-height: 60vh;
  overflow-y: auto;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 768px) {
  .about-page {
    padding: 0 4px;
  }

  .about-card :deep(.el-card__body) {
    padding: 14px;
  }
}
</style>
