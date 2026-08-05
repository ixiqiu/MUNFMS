import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('mun_token') || '')
  const user = ref<User | null>(JSON.parse(localStorage.getItem('mun_user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isAcademic = computed(() => user.value?.role === 'ACADEMIC')

  function persist() {
    localStorage.setItem('mun_token', token.value)
    localStorage.setItem('mun_user', JSON.stringify(user.value))
  }

  async function login(username: string, password: string) {
    const res = await authApi.login(username, password)
    token.value = res.access_token
    user.value = res.user
    persist()
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('mun_token')
    localStorage.removeItem('mun_user')
  }

  return { token, user, isLoggedIn, isAcademic, login, logout }
})
