import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Layout from '@/components/layout/Layout.vue'
import { useUserStore } from '@/stores/user'
import { redirectToSsoLogin } from '@/utils/ssoRedirect'

const routes: RouteRecordRaw[] = [
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('@/views/AuthCallback.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/moon',
    name: 'MoonPreview',
    component: () => import('@/views/MoonView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/academy',
    component: Layout,
    meta: { requiresAuth: false },
    children: [
      {
        path: '',
        name: 'CreatorAcademy',
        component: () => import('@/views/CreatorAcademy.vue'),
        meta: { requiresAuth: false },
      },
    ],
  },
  {
    path: '/',
    name: 'Home',
    component: Layout,
    redirect: '/designs/new-projects',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'design',
        name: 'Design',
        component: () => import('@/views/Design.vue'),
        props: (route) => ({ designKey: (route.query as Record<string, any>).new }),
        meta: { requiresAuth: true },
      },
      {
        path: 'designs',
        component: () => import('@/views/DesignList.vue'),
        children: [
          {
            path: '',
            name: 'my-designs',
            component: () => import('@/views/designs/MyDesigns.vue'),
          },
          {
            path: 'pending',
            name: 'pending-go-live',
            component: () => import('@/views/designs/PendingGoLiveList.vue'),
          },
          {
            path: 'new-projects',
            name: 'new-projects',
            component: () => import('@/views/designs/NewProjects.vue'),
          },
          {
            path: 'copy',
            name: 'copy-design-entry',
            component: () => import('@/views/designs/CopyDesignEntry.vue'),
          },
        ],
      },
      {
        path: 'fonts',
        name: 'Fonts',
        component: () => import('@/views/fonts/Fonts.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'number-font-library',
        name: 'NumberFontLibrary',
        component: () => import('@/views/fonts/number/NumberFontLibrary.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'icon-library',
        name: 'IconLibrary',
        component: () => import('@/views/fonts/icons/IconLibrary.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'icon-assets',
        name: 'IconAssets',
        component: () => import('@/views/fonts/icons/IconAssets.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'FAQ',
        name: 'FAQ',
        component: () => import('@/views/FAQ.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'devices',
        name: 'Devices',
        component: () => import('@/views/Devices.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'tickets',
        name: 'Tickets',
        component: () => import('@/views/Tickets.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'meter/app/:appId',
        name: 'MeterAppDetail',
        component: () => import('@/views/meter/AppDetail.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'profile',
        name: 'UserProfile',
        component: () => import('@/views/UserProfile.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'pricing',
        name: 'Pricing',
        component: () => import('@/views/Pricing.vue'),
        meta: { requiresAuth: true, hideForMerchant: true },
      },
      {
        path: 'packaging-logs/:id/build-log',
        name: 'PackagingBuildLog',
        component: () => import('@/views/PackagingBuildLog.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 导航守卫
router.beforeEach(async (to) => {
  const userStore = useUserStore()
  // 检查路由是否需要认证
  const requiresAuth = to.matched.some((record) => (record.meta as any).requiresAuth)

  // 如果路由需要认证且用户未登录，重定向到登录页面
  if (requiresAuth && !userStore.isAuthenticated) {
    redirectToSsoLogin('studio', 1000, to.fullPath)
    return false
  }

  if ((to.meta as any).hideForMerchant && userStore.isMerchantUser) {
    return '/designs/new-projects'
  }

  if ((to.meta as any).requiresMerchant && !userStore.isMerchantUser) {
    return '/designs/new-projects'
  }
})

export default router
