import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/components/layout/Layout.vue'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('@/views/AuthCallback.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Home',
    component: Layout,
    redirect: '/design',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'design',
        name: 'Design',
        component: () => import('@/views/Design.vue'),
        props: (route) => ({ designKey: route.query.new }),
        meta: { requiresAuth: true }
      },
      {
        path: 'designs',
        component: () => import('@/views/DesignList.vue'),
        children: [
          {
            path: '',
            name: 'my-designs',
            component: () => import('@/views/designs/MyDesigns.vue')
          },
          {
            path: 'templates',
            name: 'design-templates',
            component: () => import('@/views/designs/TemplateList.vue')
          },
          {
            path: 'favorites',
            name: 'favorite-designs',
            component: () => import('@/views/designs/FavoriteList.vue')
          }
        ]
      },
      {
        path: 'fonts',
        name: 'Fonts',
        component: () => import('@/views/Fonts.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'FAQ',
        name: 'FAQ',
        component: () => import('@/views/FAQ.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'sales',
        name: 'SalesList',
        component: () => import('@/views/SalesList.vue'),
        meta: { requiresAuth: true }
      }
    ]
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 导航守卫
router.beforeEach(async (to, _, next) => {
  const userStore = useUserStore()
  // 检查路由是否需要认证
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  console.log('路由守卫检查:', {
    to: to.path,
    requiresAuth,
    userInfo: userStore.userInfo,
    isAuthenticated: userStore.isAuthenticated
  })

  // 如果路由需要认证且用户未登录，重定向到登录页面
  if (requiresAuth && !userStore.isAuthenticated) {
    console.log('用户未认证，重定向到登录页面')
    const ssoBaseUrl = import.meta.env.VITE_SSO_LOGIN_URL
    const redirectUri = import.meta.env.VITE_SSO_REDIRECT_URI
    console.log('redirectUri 22222', redirectUri)
    setTimeout(() => {
      window.location.href = `${ssoBaseUrl}?client=studio&redirect_uri=${encodeURIComponent(redirectUri)}`
    }, 1000)
    // 阻止导航，不调用next()
    return false
  }
  
  // 如果用户已登录且访问登录页，重定向到首页
  next()
})

export default router
