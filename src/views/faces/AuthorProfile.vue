<template>
  <div class="author-page">
    <GlobalHeader />
    <main :aria-busy="loading">
      <RouterLink class="back" to="/faces">← {{ text.collection }}</RouterLink>
      <div v-if="loading" class="state" role="status">{{ text.loading }}</div>
      <div v-else-if="error" class="state" role="alert"><h1>{{ text.error }}</h1><button @click="load">{{ text.retry }}</button></div>
      <template v-else-if="author">
        <header class="profile">
          <img v-if="author.avatar && !avatarFailed" :src="author.avatar" alt="" class="avatar" @error="avatarFailed = true" />
          <span v-else class="avatar initials">{{ author.name.slice(0, 1).toUpperCase() }}</span>
          <div><p class="eyebrow">{{ text.creator }}</p><h1>{{ author.name }}</h1><p>{{ text.count(author.works.total) }}</p></div>
        </header>
        <section :aria-label="text.works">
          <h2>{{ text.works }}</h2>
          <p v-if="!author.works.list.length" class="state">{{ text.empty }}</p>
          <div v-else class="face-grid">
            <FaceCard v-for="face in author.works.list" :key="face.appId" :face="face" />
          </div>
          <nav v-if="author.works.pages > 1" class="pagination" :aria-label="text.pagination">
            <button :disabled="page <= 1" @click="changePage(-1)">← {{ text.previous }}</button>
            <span>{{ page }} / {{ author.works.pages }}</span>
            <button :disabled="page >= author.works.pages" @click="changePage(1)">{{ text.next }} →</button>
          </nav>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GlobalHeader from '@/components/layout/GlobalHeader.vue'
import FaceCard from './FaceCard.vue'
import { useI18n } from '@/i18n'
import { loadAuthorProfile, type AuthorProfile } from './catalog'
const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const text = computed(() => locale.value === 'zh' ? {
  collection: '表盘', loading: '正在加载作者主页…', error: '无法加载作者主页，作者可能不存在或服务暂不可用。', retry: '重试', creator: '创作者', works: '公开作品', empty: '这位作者暂时没有公开作品。', noPreview: '暂无预览', free: '免费', pricing: '查看价格', pagination: '作品分页', previous: '上一页', next: '下一页', count: (n: number) => `${n} 件公开作品`,
} : {
  collection: 'Watch faces', loading: 'Loading creator profile…', error: 'Unable to load this creator. The profile may not exist or the service may be unavailable.', retry: 'Try again', creator: 'CREATOR', works: 'Public creations', empty: 'This creator has no public creations yet.', noPreview: 'Preview unavailable', free: 'Free', pricing: 'View pricing', pagination: 'Creations pages', previous: 'Previous', next: 'Next', count: (n: number) => `${n} public creations`,
})
const page = computed(() => { const n = Number(route.query.page); return Number.isSafeInteger(n) && n > 0 ? n : 1 })
const author = ref<AuthorProfile | null>(null)
const loading = ref(false)
const error = ref(false)
const avatarFailed = ref(false)
let request = 0
async function load() {
  const current = ++request
  loading.value = true
  error.value = false
  author.value = null
  avatarFailed.value = false
  try {
    const result = await loadAuthorProfile(String(route.params.userId), page.value)
    if (current === request) author.value = result
  } catch { if (current === request) error.value = true }
  finally { if (current === request) loading.value = false }
}
function changePage(delta: number) { router.push({ query: { ...route.query, page: String(page.value + delta) } }) }
watch(() => [route.params.userId, page.value], load, { immediate: true })
</script>

<style scoped>
.author-page { min-height: 100vh; background: var(--studio-bg); color: var(--studio-text); }
main { max-width: 1280px; margin: auto; padding: 32px 24px 72px; }
.back { color: var(--studio-text-muted); text-decoration: none; }
.profile { display: flex; gap: 24px; align-items: center; padding: 48px 0; border-bottom: 1px solid var(--studio-border); margin-bottom: 32px; }
.avatar { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.initials { display: grid; place-items: center; background: var(--studio-primary-soft); color: var(--studio-primary); font-size: 36px; }
h1 { font-size: clamp(28px, 5vw, 42px); margin: 4px 0 8px; overflow-wrap: anywhere; }
.eyebrow { color: var(--studio-primary); font-size: 12px; letter-spacing: .14em; }
p { margin: 0; color: var(--studio-text-muted); }
h2 { font-size: 22px; margin-bottom: 24px; }
.face-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 22px 18px; }
@media (max-width: 1100px) { .face-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 800px) { .face-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 520px) { .face-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 10px; } }
.state { text-align: center; padding: 64px 16px; }.state h1 { font-size: 22px; margin-bottom: 20px; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 20px; margin-top: 32px; }
button { background: var(--studio-surface-raised); color: var(--studio-text); border: 1px solid var(--studio-border); border-radius: 8px; padding: 10px 16px; cursor: pointer; }button:disabled { opacity: .45; cursor: default; }
@media (max-width: 540px) { main { padding: 24px 16px 48px; }.profile { padding: 32px 0; gap: 16px; }.avatar { width: 64px; height: 64px; } }
</style>
