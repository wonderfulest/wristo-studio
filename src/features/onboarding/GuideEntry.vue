<template>
  <main class="guide-entry" role="status">
    <p>{{ locale.currentLocale === 'zh' ? '正在打开你的表盘制作引导…' : 'Opening your watch face guide…' }}</p>
    <button v-if="failed" @click="open">{{ locale.currentLocale === 'zh' ? '重试' : 'Try again' }}</button>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useLocaleStore } from '@/stores/locale'
import { enterWatchFaceGuide } from './entry'

const route = useRoute(), router = useRouter(), user = useUserStore(), locale = useLocaleStore()
const failed = ref(false)
async function open() {
  if (!user.isAuthenticated || !user.userInfo?.id) return
  failed.value = false
  if (typeof route.query.lang === 'string') locale.setLocale(route.query.lang)
  try {
    const failure = await router.replace(enterWatchFaceGuide(String(user.userInfo.id)))
    failed.value = !!failure
  } catch {
    failed.value = true
  }
}
onMounted(open)
</script>

<style scoped>
.guide-entry { min-height: 100vh; display: grid; place-content: center; text-align: center; color: var(--studio-text, #172033); background: var(--studio-surface, #fff); }
.guide-entry button { padding: 10px 20px; cursor: pointer; }
</style>
