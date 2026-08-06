/*
 * MUNFMS - A dedicated file management tool for organizing and sharing documents in MUN meetings.
 * Copyright (C) 2026 iXiQiu (@ixiqiu)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
