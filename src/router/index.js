import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Layout from '@/components/layout/Layout.vue'
import DesignList from '@/views/DesignList.vue'

const routes = [
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
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 导航守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 检查路由是否需要认证
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  // 如果路由需要认证且用户未登录，重定向到登录页面
  if (requiresAuth && !authStore.isAuthenticated) {
    next({
      path: '/login',
      query: { redirect: to.fullPath } // 保存原目标路由，登录后可以跳回
    })
    return
  }

  // 如果用户已登录且访问登录页，重定向到首页
  if (to.path === '/login' && authStore.isAuthenticated) {
    next('/')
    return
  }

  next()
})

export default router
