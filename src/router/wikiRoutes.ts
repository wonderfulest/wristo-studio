import type { RouteRecordRaw } from 'vue-router'
import Layout from '@/components/layout/Layout.vue'

export const wikiRoutes: RouteRecordRaw[] = [
  {
    path: '/academy',
    redirect: (to) => ({ path: '/wiki', query: to.query, hash: to.hash })
  },
  {
    path: '/wiki',
    component: Layout,
    meta: { requiresAuth: false },
    children: [
      {
        path: '',
        name: 'WikiFaq',
        component: () => import('@/views/WikiFaq.vue'),
        meta: { requiresAuth: false }
      }
    ]
  }
]
