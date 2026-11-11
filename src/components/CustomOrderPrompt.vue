<template>
  <el-dialog v-model="visible" :title="copy.title" width="min(480px, 94vw)" append-to-body>
    <p class="custom-order-description">{{ copy.description }}</p>
    <template #footer>
      <el-button @click="visible = false">{{ copy.later }}</el-button>
      <a class="custom-order-link" :href="orderUrl" target="_blank" rel="noopener" @click="visible = false">{{ copy.action }}</a>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getUserInfo } from '@/api/wristo/auth'
import { useUserStore } from '@/stores/user'
import { useLocaleStore } from '@/stores/locale'
import { useCustomOrderPrompt } from '@/composables/useCustomOrderPrompt'

const user = useUserStore()
const locale = useLocaleStore()
const route = useRoute()
const supportedRoute = computed(() => !!route.name && !route.path.startsWith('/auth/'))
const visible = useCustomOrderPrompt(user, supportedRoute, getUserInfo, sessionStorage)
const chinese = computed(() => locale.currentLocale === 'zh')
const orderUrl = computed(() => `https://wristo.io/${chinese.value ? 'zh' : 'en'}/custom-watchface`)
const copy = computed(() => chinese.value ? {
  title: '定制你的专属表盘',
  description: '有喜欢的照片或表盘创意？告诉我们你的需求，让我们帮你制作。',
  later: '暂时不用',
  action: '定制我的表盘',
} : {
  title: 'Your own custom watch face',
  description: 'Have a favourite photo or a watch face idea? Share what you have in mind and let us create it for you.',
  later: 'Not now',
  action: 'Customize my watch face',
})
</script>

<style scoped>
.custom-order-description { margin: 0; line-height: 1.8; color: var(--studio-text-secondary); }
.custom-order-link { display: inline-block; margin-left: 12px; padding: 8px 16px; border-radius: 4px; background: var(--el-color-primary); color: #fff; text-decoration: none; line-height: 1.5; }
</style>
