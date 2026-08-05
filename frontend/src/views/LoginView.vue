<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const form = ref({ username: '', password: '' })
const loading = ref(false)

async function submit() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await auth.login(form.value.username, form.value.password)
    ElMessage.success('登录成功')
    router.push('/cabinet')
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <el-icon :size="36" color="#409eff"><Collection /></el-icon>
        <h1>模联文件管理系统</h1>
        <p>常中模联 · 一站式文件流转与磋商平台</p>
      </div>

      <el-form @submit.prevent="submit" size="large">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" :prefix-icon="'User'">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            show-password
            @keyup.enter="submit"
          >
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-button
          type="primary"
          class="submit-btn"
          size="large"
          :loading="loading"
          @click="submit"
        >
          登 录
        </el-button>
      </el-form>

      <div class="register-link">
        还没有账号？
        <router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
}

.login-card {
  width: 380px;
  background: #fff;
  border-radius: 12px;
  padding: 40px 36px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

.brand {
  text-align: center;
  margin-bottom: 28px;
}

.brand h1 {
  font-size: 20px;
  color: #303133;
  margin: 12px 0 6px;
}

.brand p {
  font-size: 13px;
  color: #909399;
}

.submit-btn {
  width: 100%;
}

.register-link {
  margin-top: 18px;
  text-align: center;
  font-size: 13px;
  color: #909399;
}

.register-link a {
  color: #409eff;
  text-decoration: none;
}
</style>
