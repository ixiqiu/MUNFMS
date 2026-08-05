<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '../api'
import type { CabinetType, UserRole } from '../types'

const router = useRouter()

const form = ref({
  name: '',
  password: '',
  confirm: '',
  role: 'DELEGATE' as UserRole,
  cabinetName: '',
  cabinetType: 'CABINET' as CabinetType,
})
const loading = ref(false)

const roleOptions = [
  { value: 'DELEGATE', label: '代表（归属内阁）' },
  { value: 'ACADEMIC', label: '学术组（主席团/危机团队）' },
]

const typeOptions: { value: CabinetType; label: string; hint: string }[] = [
  { value: 'CABINET', label: '内阁', hint: '国家/代表团' },
  { value: 'BUREAU', label: '主席团', hint: '学术组' },
  { value: 'CRISIS', label: '危机团队', hint: '学术组' },
]

function onRoleChange(role: UserRole) {
  form.value.cabinetType = role === 'ACADEMIC' ? 'BUREAU' : 'CABINET'
}

async function submit() {
  if (!form.value.name || !form.value.password) {
    ElMessage.warning('请填写完整信息')
    return
  }
  if (form.value.password.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }
  if (form.value.password !== form.value.confirm) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  if (!form.value.cabinetName) {
    ElMessage.warning('请填写组织名称')
    return
  }
  loading.value = true
  try {
    await authApi.register({
      name: form.value.name,
      password: form.value.password,
      role: form.value.role,
      cabinetName: form.value.cabinetName,
      cabinetType: form.value.cabinetType,
    })
    ElMessage.success('注册成功，请登录')
    router.push('/login')
  } catch {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <div class="register-card">
      <div class="brand">
        <h1>注册账号</h1>
        <p>加入模联文件管理系统</p>
      </div>

      <el-form @submit.prevent="submit" label-position="top" size="large">
        <el-form-item label="用户名">
          <el-input v-model="form.name" placeholder="登录用户名" />
        </el-form-item>

        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>

        <el-form-item label="确认密码">
          <el-input v-model="form.confirm" type="password" show-password placeholder="再次输入密码" />
        </el-form-item>

        <el-form-item label="身份">
          <el-radio-group v-model="form.role" @change="onRoleChange">
            <el-radio-button v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="组织类型">
          <el-select v-model="form.cabinetType" style="width: 100%">
            <el-option
              v-for="opt in typeOptions"
              :key="opt.value"
              :value="opt.value"
              :label="`${opt.label}（${opt.hint}）`"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="组织名称">
          <el-input v-model="form.cabinetName" placeholder="如：法国 / 主席团 / 危机团队" />
        </el-form-item>

        <el-button type="primary" class="submit-btn" size="large" :loading="loading" @click="submit">
          注 册
        </el-button>
      </el-form>

      <div class="login-link">
        已有账号？
        <router-link to="/login">去登录</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
  padding: 24px 0;
}

.register-card {
  width: 420px;
  background: #fff;
  border-radius: 12px;
  padding: 36px 36px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

.brand {
  text-align: center;
  margin-bottom: 20px;
}

.brand h1 {
  font-size: 20px;
  color: #303133;
  margin-bottom: 6px;
}

.brand p {
  font-size: 13px;
  color: #909399;
}

.submit-btn {
  width: 100%;
}

.login-link {
  margin-top: 16px;
  text-align: center;
  font-size: 13px;
  color: #909399;
}

.login-link a {
  color: #409eff;
  text-decoration: none;
}
</style>
