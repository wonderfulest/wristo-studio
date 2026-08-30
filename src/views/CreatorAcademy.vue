<template>
  <div class="academy-page">
    <header class="academy-topbar">
      <button type="button" class="academy-brand" @click="startProject">
        <img src="https://cdn.wristo.io/brands/wristo-logo/svg/wristo-mark.svg" alt="" class="academy-logo" />
        <span>Wristo Studio</span>
      </button>
      <el-button type="primary" @click="startProject">进入 Studio</el-button>
    </header>

    <main class="academy-shell">
      <header class="academy-hero">
        <p class="eyebrow">Creator Academy · 中文版</p>
        <h1>Wristo Studio 文本 Wiki</h1>
        <p class="hero-copy">从创建第一个 Garmin 表盘，到数据表达式、字体素材、真机安装和 Connect IQ 发布。按目录连续阅读，或使用浏览器搜索快速定位问题。</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="openChapter('getting-started')">从快速开始阅读</el-button>
          <a class="secondary-action" href="/tokens">查看 Tokens</a>
        </div>
      </header>

      <section class="academy-layout">
        <aside class="academy-sidebar" aria-label="Wiki 目录">
          <div class="toc-heading">
            <strong>目录</strong>
            <span>{{ academyChapters.length }} 章</span>
          </div>
          <nav class="academy-toc">
            <a
              v-for="(chapter, index) in academyChapters"
              :key="chapter.id"
              data-test="academy-toc-link"
              :href="`#${chapter.id}`"
              :class="{ active: activeChapterId === chapter.id }"
              :aria-current="activeChapterId === chapter.id ? 'location' : undefined"
              @click.prevent="openChapter(chapter.id)">
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              {{ chapter.title }}
            </a>
          </nav>
        </aside>

        <article class="academy-reader">
          <section v-for="(chapter, chapterIndex) in academyChapters" :id="chapter.id" :key="chapter.id" data-test="academy-chapter" class="academy-chapter">
            <header class="chapter-header">
              <p>第 {{ chapterIndex + 1 }} 章</p>
              <h2>{{ chapter.title }}</h2>
              <div>{{ chapter.summary }}</div>
            </header>

            <section v-for="section in chapter.sections" :key="section.title" class="wiki-section">
              <h3>{{ section.title }}</h3>
              <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
              <ul v-if="section.items?.length">
                <li v-for="item in section.items" :key="item">{{ item }}</li>
              </ul>

              <div v-if="section.table" class="wiki-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-for="column in section.table.columns" :key="column">{{ column }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in section.table.rows" :key="rowIndex">
                      <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <aside v-if="section.note" class="wiki-note">
                <strong>提示</strong>
                <span>{{ section.note }}</span>
              </aside>

              <div v-if="section.links?.length" class="wiki-links">
                <a v-for="link in section.links" :key="link.href" :href="link.href" :target="link.external ? '_blank' : undefined" :rel="link.external ? 'noopener noreferrer' : undefined">
                  {{ link.label }}
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </section>

            <a class="back-to-top" href="#top" @click.prevent="scrollToTop">返回顶部 ↑</a>
          </section>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { academyChapters } from './creator-academy/academyContent'

const route = useRoute()
const router = useRouter()
const firstChapterId = academyChapters[0].id
const chapterIds = new Set(academyChapters.map((chapter) => chapter.id))
const chapterIdFromHash = (hash: string) => {
  const id = decodeURIComponent(hash.replace(/^#/, ''))
  return chapterIds.has(id) ? id : firstChapterId
}

const activeChapterId = ref(chapterIdFromHash(route.hash))
let chapterObserver: IntersectionObserver | null = null

const startProject = () => {
  router.push('/designs/new-projects')
}

const openChapter = async (id: string) => {
  activeChapterId.value = id
  await router.replace({ path: '/academy', hash: `#${id}` })
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const scrollToTop = async () => {
  activeChapterId.value = firstChapterId
  await router.replace({ path: '/academy' })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(
  () => route.hash,
  (hash) => {
    activeChapterId.value = chapterIdFromHash(hash)
  }
)

onMounted(() => {
  document.title = 'Wristo Studio 文本 Wiki'
  if (!('IntersectionObserver' in window)) return

  chapterObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0]
      if (visible?.target.id) activeChapterId.value = visible.target.id
    },
    { rootMargin: '-72px 0px -68% 0px', threshold: 0 }
  )

  academyChapters.forEach((chapter) => {
    const element = document.getElementById(chapter.id)
    if (element) chapterObserver?.observe(element)
  })
})

onBeforeUnmount(() => chapterObserver?.disconnect())
</script>

<style scoped>
.academy-page {
  min-height: 100%;
  color: var(--studio-text);
  background: radial-gradient(circle at 72% 0%, color-mix(in srgb, var(--studio-primary) 8%, transparent), transparent 34rem), var(--studio-bg);
}

.academy-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  padding: 0 24px;
  background: color-mix(in srgb, var(--studio-surface-raised) 94%, transparent);
  border-bottom: 1px solid var(--studio-border);
  backdrop-filter: saturate(160%) blur(14px);
}

.academy-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0;
  color: var(--studio-text);
  font: inherit;
  font-weight: 750;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.academy-brand:hover {
  color: var(--studio-primary);
}

.academy-logo {
  display: block;
  width: 28px;
  height: 28px;
}

.academy-shell {
  width: min(1240px, calc(100% - 40px));
  margin: 0 auto;
  padding: 52px 0 88px;
}

.academy-hero {
  max-width: 820px;
  padding: 26px 0 56px;
}

.eyebrow,
.chapter-header p {
  margin: 0 0 12px;
  color: var(--studio-primary);
  font-size: 13px;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.academy-hero h1 {
  margin: 0;
  font-size: clamp(40px, 6vw, 68px);
  line-height: 1.02;
  letter-spacing: -0.04em;
}

.hero-copy {
  max-width: 760px;
  margin: 20px 0 0;
  color: var(--studio-text-muted);
  font-size: 18px;
  line-height: 1.75;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 28px;
}

.secondary-action,
.wiki-links a {
  color: var(--studio-primary);
  font-weight: 650;
  text-decoration: none;
}

.secondary-action:hover,
.wiki-links a:hover {
  text-decoration: underline;
}

.academy-layout {
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr);
  gap: 42px;
  align-items: start;
}

.academy-sidebar {
  position: sticky;
  top: 78px;
  max-height: calc(100vh - 98px);
  overflow-y: auto;
  padding: 16px;
  background: color-mix(in srgb, var(--studio-surface) 92%, transparent);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  box-shadow: var(--studio-shadow-sm);
}

.toc-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 12px;
  border-bottom: 1px solid var(--studio-border);
}

.toc-heading span {
  color: var(--studio-text-muted);
  font-size: 12px;
}

.academy-toc {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 10px;
}

.academy-toc a {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 8px;
  padding: 8px;
  color: var(--studio-text-muted);
  font-size: 13px;
  line-height: 1.35;
  text-decoration: none;
  border-radius: 8px;
}

.academy-toc a span {
  color: color-mix(in srgb, var(--studio-text-muted) 68%, transparent);
  font-variant-numeric: tabular-nums;
}

.academy-toc a:hover,
.academy-toc a.active {
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.academy-reader {
  min-width: 0;
  overflow: hidden;
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  box-shadow: var(--studio-shadow-sm);
}

.academy-chapter {
  padding: 48px clamp(24px, 5vw, 64px);
  scroll-margin-top: 74px;
}

.academy-chapter + .academy-chapter {
  border-top: 1px solid var(--studio-border);
}

.chapter-header {
  margin-bottom: 34px;
}

.chapter-header h2 {
  margin: 0;
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.15;
  letter-spacing: -0.025em;
}

.chapter-header div {
  max-width: 720px;
  margin-top: 14px;
  color: var(--studio-text-muted);
  font-size: 17px;
  line-height: 1.7;
}

.wiki-section + .wiki-section {
  margin-top: 36px;
}

.wiki-section h3 {
  margin: 0 0 14px;
  font-size: 20px;
  line-height: 1.35;
}

.wiki-section p,
.wiki-section li,
.wiki-section td {
  color: var(--studio-text-muted);
  font-size: 15px;
  line-height: 1.75;
}

.wiki-section p {
  margin: 0 0 12px;
}

.wiki-section ul {
  margin: 0;
  padding-left: 22px;
}

.wiki-section li + li {
  margin-top: 8px;
}

.wiki-table-wrap {
  width: 100%;
  overflow-x: auto;
  margin-top: 16px;
  border: 1px solid var(--studio-border);
  border-radius: 10px;
}

.wiki-table-wrap table {
  width: 100%;
  border-collapse: collapse;
}

.wiki-table-wrap th,
.wiki-table-wrap td {
  padding: 12px 14px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--studio-border);
}

.wiki-table-wrap th {
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 700;
  background: var(--studio-surface-raised);
}

.wiki-table-wrap tr:last-child td {
  border-bottom: 0;
}

.wiki-table-wrap th:first-child,
.wiki-table-wrap td:first-child {
  width: 32%;
}

.wiki-note {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  margin-top: 18px;
  padding: 14px 16px;
  color: var(--studio-text-muted);
  line-height: 1.65;
  background: var(--studio-primary-soft);
  border: 1px solid var(--studio-primary-border);
  border-radius: 10px;
}

.wiki-note strong {
  color: var(--studio-primary);
}

.wiki-links {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 18px;
}

.back-to-top {
  display: inline-block;
  margin-top: 38px;
  color: var(--studio-text-muted);
  font-size: 13px;
  text-decoration: none;
}

.back-to-top:hover {
  color: var(--studio-primary);
}

@media (max-width: 900px) {
  .academy-topbar {
    padding: 0 16px;
  }

  .academy-shell {
    width: min(100% - 24px, 760px);
    padding-top: 30px;
  }

  .academy-hero {
    padding-bottom: 34px;
  }
  .academy-hero h1 {
    font-size: 42px;
  }

  .academy-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .academy-sidebar {
    position: static;
    max-height: none;
  }

  .academy-toc {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .academy-reader {
    overflow: visible;
  }
}

@media (max-width: 560px) {
  .academy-brand span {
    display: none;
  }
  .academy-hero h1 {
    font-size: 36px;
  }
  .hero-copy {
    font-size: 16px;
  }

  .hero-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .academy-toc {
    grid-template-columns: 1fr;
  }
  .academy-chapter {
    padding: 36px 20px;
  }
  .wiki-note {
    grid-template-columns: 1fr;
  }
}
</style>
