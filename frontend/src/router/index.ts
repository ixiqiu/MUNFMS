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

import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue') },
    {
      path: '/',
      component: () => import('../layouts/MainLayout.vue'),
      children: [
        { path: '', redirect: '/cabinet' },
        { path: 'cabinet', name: 'cabinet', component: () => import('../views/CabinetSpace.vue') },
        { path: 'public', name: 'public', component: () => import('../views/PublicSpace.vue') },
        { path: 'conference', name: 'conference', component: () => import('../views/ConferenceSpace.vue') },
        { path: 'consult', name: 'consult', component: () => import('../views/ConsultSpace.vue') },
        { path: 'academic', name: 'academic', component: () => import('../views/AcademicOverview.vue') },
        { path: 'admin', name: 'admin', component: () => import('../views/AdminView.vue') },
        { path: 'about', name: 'about', component: () => import('../views/AboutView.vue') },
        { path: 'periods', name: 'periods', component: () => import('../views/PeriodManage.vue') },
        { path: 'timeline', name: 'timeline', component: () => import('../views/TimelineView.vue') },
        { path: 'directives', name: 'directives', component: () => import('../views/DirectivesView.vue') },
        { path: 'asym', name: 'asym', component: () => import('../views/AsymSpace.vue') },
        {
          path: 'directive-types',
          name: 'directive-types',
          component: () => import('../views/DirectiveTypesView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('mun_token')
  if (!token && to.name !== 'login' && to.name !== 'register') {
    return { name: 'login' }
  }
  if (token && (to.name === 'login' || to.name === 'register')) {
    return { name: 'cabinet' }
  }
  if (to.name === 'admin') {
    const user = JSON.parse(localStorage.getItem('mun_user') || 'null')
    if (user?.role !== 'ADMIN') {
      return { name: 'cabinet' }
    }
  }
  const user = JSON.parse(localStorage.getItem('mun_user') || 'null')
  if (
    user?.role === 'ADMIN' &&
    !['admin', 'about', 'consult', 'directive-types'].includes(to.name as string)
  ) {
    return { name: 'admin' }
  }
  if (to.name === 'academic') {
    const academicUser = JSON.parse(localStorage.getItem('mun_user') || 'null')
    if (academicUser?.role !== 'ACADEMIC') {
      return { name: 'cabinet' }
    }
  }
  if (to.name === 'periods') {
    const periodsUser = JSON.parse(localStorage.getItem('mun_user') || 'null')
    if (periodsUser?.role !== 'ACADEMIC') {
      return { name: 'cabinet' }
    }
  }
  if (to.name === 'directive-types') {
    const directiveTypesUser = JSON.parse(localStorage.getItem('mun_user') || 'null')
    if (directiveTypesUser?.role !== 'ADMIN') {
      return { name: 'cabinet' }
    }
  }
})

export default router
