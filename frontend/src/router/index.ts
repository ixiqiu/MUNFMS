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
})

export default router
