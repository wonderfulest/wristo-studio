<template>
  <div ref="page" class="wiki-page" lang="zh-CN">
    <a class="skip-link" href="#wiki-content" @click.prevent="focusContent">跳到正文</a>
    <div class="wiki-shell">
      <aside class="wiki-sidebar" aria-label="文档目录">
        <div class="sidebar-heading">
          <span class="book-mark" aria-hidden="true">W.</span>
          <div>
            <strong>STUDIO MANUAL</strong>
            <small>使用指南与常见问题 · 中文</small>
          </div>
        </div>
        <label class="search-label" for="wiki-search">搜索文档</label>
        <div class="search-field">
          <input id="wiki-search" v-model="query" type="search" placeholder="搜索 WRT、字体、构建…" autocomplete="off" @keydown.esc="query = ''" />
          <button v-if="query" type="button" aria-label="清空搜索" @click="query = ''">×</button>
        </div>
        <nav class="wiki-toc" aria-label="章节">
          <template v-for="(chapter, index) in wikiChapters" :key="chapter.id">
            <p v-if="groupLabels[chapter.id]" class="toc-group">{{ groupLabels[chapter.id] }}</p>
            <a :href="`/wiki#${chapter.id}`" :aria-current="activeChapterId === chapter.id && !isSearching ? 'location' : undefined" data-test="wiki-toc-link" @click.prevent="openAnchor(chapter.id)">
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              {{ chapter.title }}
            </a>
          </template>
        </nav>
        <div class="sidebar-links">
          <a href="/tokens" target="_blank" rel="noopener noreferrer">Tokens 参考 ↗</a>
          <a href="/prg-installer" target="_blank" rel="noopener noreferrer">Installer 指南 ↗</a>
          <small>这两个工具页面目前需登录</small>
        </div>
      </aside>

      <div id="wiki-content" ref="content" class="wiki-content" tabindex="-1">
        <header class="wiki-header">
          <p class="eyebrow">Wristo Studio / Documentation</p>
          <h1>
            Wiki &amp; FAQ
            <span>从第一块表盘开始。</span>
          </h1>
          <p class="intro">创建、编辑、保存，再装到手表上。按步骤完成你的第一个设计，或直接查找遇到的问题。</p>
          <div class="quick-links">
            <a href="/wiki#getting-started" @click.prevent="openAnchor('getting-started')">
              快速开始
              <span>↗</span>
            </a>
            <a href="/wiki#troubleshooting" @click.prevent="openAnchor('troubleshooting')">
              常见问题
              <span>↗</span>
            </a>
            <a href="/designs" target="_blank" rel="noopener noreferrer">
              打开 My Designs
              <span>↗</span>
            </a>
          </div>
          <p class="reading-note">文档可公开阅读 · 项目操作需登录 · 菜单名称附英文，方便对照界面</p>
        </header>

        <section v-if="isSearching" class="search-results" aria-label="搜索结果">
          <h2>搜索结果</h2>
          <p role="status" aria-live="polite">“{{ query.trim() }}” · {{ results.length }} 条结果</p>
          <ul v-if="results.length">
            <li v-for="result in results" :key="result.id">
              <a :href="`/wiki#${result.id}`" @click.prevent="openAnchor(result.id)">
                <small>{{ result.chapter.title }}</small>
                <h3>{{ result.section.title }}</h3>
                <p>{{ result.text.slice(0, 150) }}{{ result.text.length > 150 ? '…' : '' }}</p>
              </a>
            </li>
          </ul>
          <div v-else class="empty-search">
            <p>没有找到匹配内容。试试“保存”“PRG”或“字体”等更短的关键词。</p>
            <button type="button" @click="query = ''">返回完整文档</button>
          </div>
        </section>

        <article v-else aria-label="Studio 使用手册">
          <section v-for="(chapter, chapterIndex) in wikiChapters" :id="chapter.id" :key="chapter.id" class="wiki-chapter" data-test="wiki-chapter" tabindex="-1">
            <header class="chapter-header">
              <p class="eyebrow">{{ String(chapterIndex + 1).padStart(2, '0') }} / {{ chapter.id === 'troubleshooting' ? 'FAQ' : 'GUIDE' }}</p>
              <h2>{{ chapter.title }}</h2>
              <p>{{ chapter.summary }}</p>
            </header>
            <section
              v-for="(section, sectionIndex) in chapter.sections"
              :id="sectionId(chapter, section, sectionIndex)"
              :key="sectionId(chapter, section, sectionIndex)"
              class="wiki-section"
              tabindex="-1">
              <div class="section-heading">
                <h3>{{ section.title }}</h3>
                <button type="button" class="copy-link" :aria-label="`复制链接：${section.title}`" @click="copyLink(sectionId(chapter, section, sectionIndex))">
                  {{ copiedId === sectionId(chapter, section, sectionIndex) ? '已复制' : '复制链接' }}
                </button>
              </div>
              <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
              <ol v-if="section.steps?.length" class="steps">
                <li v-for="step in section.steps" :key="step">{{ step }}</li>
              </ol>
              <ul v-if="section.items?.length">
                <li v-for="item in section.items" :key="item">{{ item }}</li>
              </ul>
              <div v-if="section.table" class="table-wrap" tabindex="0" role="region" :aria-label="section.title">
                <table>
                  <thead>
                    <tr>
                      <th v-for="column in section.table.columns" :key="column" scope="col">{{ column }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in section.table.rows" :key="rowIndex">
                      <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="section.example" class="example">
                <strong>示例</strong>
                <pre>{{ section.example }}</pre>
              </div>
              <p v-if="section.expected" class="expected">
                <strong>完成后</strong>
                {{ section.expected }}
              </p>
              <aside v-if="section.note" class="wiki-note">
                <strong>提示</strong>
                <p>{{ section.note }}</p>
              </aside>
              <div v-if="section.links?.length" class="reference-links">
                <a
                  v-for="link in section.links"
                  :key="link.href"
                  :href="link.href"
                  :target="opensNewTab(link.href) ? '_blank' : undefined"
                  :rel="opensNewTab(link.href) ? 'noopener noreferrer' : undefined"
                  @click="followReference($event, link.href)">
                  {{ link.label }}
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </section>
          </section>
        </article>
        <footer class="wiki-footer">
          <span>Wristo Studio · Wiki &amp; FAQ</span>
          <a href="/wiki" @click.prevent="backToTop">返回顶部 ↑</a>
        </footer>
      </div>
    </div>
    <p class="copy-status" role="status" aria-live="polite">{{ copyStatus }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { wikiChapters } from './wiki/wikiContent'
import { searchWiki, sectionId, wikiSections } from './wiki/wikiSearch'

const route = useRoute()
const router = useRouter()
const opensNewTab = (href: string) => !href.startsWith('#') && href !== '/wiki' && !href.startsWith('/wiki#')
const page = ref<HTMLElement>()
const content = ref<HTMLElement>()
const query = ref('')
const isSearching = computed(() => Boolean(query.value.trim()))
const results = computed(() => searchWiki(query.value))
const activeChapterId = ref(wikiChapters[0].id)
const copiedId = ref('')
const copyStatus = ref('')
const groupLabels: Record<string, string> = {
  introduction: '开始使用',
  elements: '编辑与设计',
  'save-build-export': '保存与交付',
  troubleshooting: '查找答案'
}
let observer: IntersectionObserver | undefined
let copyTimer: ReturnType<typeof setTimeout> | undefined
let disposed = false
const decodeHash = (hash: string) => {
  try {
    return decodeURIComponent(hash.replace(/^#/, ''))
  } catch {
    return ''
  }
}
const findChapter = (id: string) => wikiChapters.find((chapter) => chapter.id === id) || wikiSections.find((entry) => entry.id === id)?.chapter
const scrollToAnchor = async (id: string) => {
  const chapter = findChapter(id)
  if (!chapter) return
  activeChapterId.value = chapter.id
  await nextTick()
  if (disposed) return
  const target = document.getElementById(id)
  target?.scrollIntoView({ block: 'start' })
  target?.focus({ preventScroll: true })
}
const openAnchor = async (id: string) => {
  query.value = ''
  if (route.hash === `#${id}`) await scrollToAnchor(id)
  else await router.push({ path: '/wiki', hash: `#${id}` })
}
const followReference = (event: MouseEvent, href: string) => {
  if (href.startsWith('/wiki#') && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault()
    void openAnchor(decodeHash(href.slice('/wiki'.length)))
  }
}
const focusContent = () => content.value?.focus()
const backToTop = async () => {
  query.value = ''
  await router.push('/wiki')
  await nextTick()
  page.value?.scrollIntoView({ block: 'start' })
  focusContent()
}
const copyLink = async (id: string) => {
  copyStatus.value = ''
  await nextTick()
  try {
    await navigator.clipboard.writeText(new URL(`/wiki#${id}`, window.location.origin).href)
    if (disposed) return
    copiedId.value = id
    copyStatus.value = '链接已复制'
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copiedId.value = ''
      copyStatus.value = ''
    }, 2500)
  } catch {
    await openAnchor(id)
    copyStatus.value = '未能访问剪贴板，已定位到此处。请复制浏览器地址栏链接。'
  }
}
const observeChapters = async () => {
  observer?.disconnect()
  await nextTick()
  if (disposed || isSearching.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) activeChapterId.value = visible.target.id
    },
    { root: page.value?.closest('.app-content') || null, rootMargin: '-28px 0px -65% 0px', threshold: 0 }
  )
  wikiChapters.forEach((chapter) => {
    const element = document.getElementById(chapter.id)
    if (element) observer?.observe(element)
  })
}
watch(
  () => route.hash,
  async (hash) => {
    query.value = ''
    if (hash) await scrollToAnchor(decodeHash(hash))
    else {
      await nextTick()
      page.value?.scrollIntoView({ block: 'start' })
      activeChapterId.value = wikiChapters[0].id
    }
  }
)
watch(isSearching, async (searching) => {
  await observeChapters()
  if (searching) content.value?.scrollIntoView({ block: 'start' })
})
onMounted(async () => {
  document.title = 'Wiki & FAQ | Wristo Studio'
  await observeChapters()
  if (route.hash) await scrollToAnchor(decodeHash(route.hash))
})
onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  clearTimeout(copyTimer)
})
</script>

<style scoped>
.wiki-page {
  color: var(--studio-text);
  background: var(--studio-bg);
  min-height: 100%;
}
.wiki-shell {
  display: grid;
  grid-template-columns: 264px minmax(0, 800px);
  gap: 64px;
  max-width: 1256px;
  margin: 0 auto;
  padding: 32px 32px 0;
  align-items: start;
}
.wiki-sidebar {
  position: sticky;
  top: 20px;
  max-height: calc(100dvh - 120px);
  overflow-y: auto;
  padding: 0 20px 24px 0;
  border-right: 1px solid var(--studio-border);
  scrollbar-width: thin;
}
.sidebar-heading {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 0 0 28px;
}
.book-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 42px;
  background: var(--studio-text);
  color: var(--studio-bg);
  font-size: 22px;
  font-family: Georgia, serif;
}
.sidebar-heading strong {
  font-size: 12px;
  letter-spacing: 0.1em;
}
.sidebar-heading small {
  display: block;
  margin-top: 5px;
  font-size: 11px;
  color: var(--studio-text-muted);
}
.search-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}
.search-field {
  display: flex;
  align-items: center;
  border: 1px solid var(--studio-border);
  background: var(--studio-surface);
  border-radius: 6px;
}
.search-field:focus-within {
  outline: 2px solid var(--studio-primary);
  outline-offset: 2px;
}
.search-field input {
  font: inherit;
  font-size: 13px;
  min-width: 0;
  width: 100%;
  border: 0;
  padding: 12px;
  background: transparent;
  color: inherit;
  outline: none;
}
.search-field input::-webkit-search-cancel-button {
  display: none;
}
.search-field button {
  border: 0;
  color: var(--studio-text-muted);
  background: transparent;
  font-size: 22px;
  padding: 4px 12px;
  cursor: pointer;
}
.toc-group {
  color: var(--studio-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  margin: 24px 0 8px;
}
.wiki-toc a {
  display: flex;
  gap: 9px;
  align-items: baseline;
  color: var(--studio-text-muted);
  padding: 8px 6px;
  text-decoration: none;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 4px;
}
.wiki-toc a span {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}
.wiki-toc a:hover,
.wiki-toc a[aria-current] {
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
}
.sidebar-links {
  border-top: 1px solid var(--studio-border);
  margin-top: 24px;
  padding-top: 18px;
  display: grid;
  gap: 10px;
  font-size: 12px;
}
.sidebar-links a {
  color: var(--studio-text-muted);
  text-decoration: none;
}
.sidebar-links small {
  color: var(--studio-text-muted);
  font-size: 10px;
}
.wiki-content {
  min-width: 0;
}
.wiki-header {
  padding: 8px 0 32px;
  border-bottom: 1px solid var(--studio-border);
}
.eyebrow {
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--studio-primary);
  margin: 0 0 18px;
}
h1 {
  font-size: clamp(34px, 4vw, 52px);
  letter-spacing: -0.04em;
  font-weight: 650;
  line-height: 1.15;
  margin: 0 0 20px;
}
h1 span {
  display: block;
  font-size: 21px;
  font-weight: 400;
  letter-spacing: 0.03em;
  margin-top: 14px;
}
.intro {
  font-size: 15px;
  line-height: 1.9;
  color: var(--studio-text-muted);
  max-width: 600px;
}
.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
  margin: 24px 0 18px;
}
.quick-links a {
  color: var(--studio-primary);
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
  padding: 8px 0;
  border-bottom: 1px solid var(--studio-border);
}
.quick-links span {
  margin-left: 10px;
}
.reading-note {
  font-size: 11px;
  color: var(--studio-text-muted);
  line-height: 1.8;
  margin: 0;
}
.wiki-chapter {
  padding: 40px 0 12px;
  border-bottom: 1px solid var(--studio-border);
  scroll-margin-top: 24px;
}
.chapter-header .eyebrow {
  margin-bottom: 10px;
}
h2 {
  font-size: 25px;
  font-weight: 650;
  letter-spacing: -0.025em;
  margin: 0 0 12px;
  line-height: 1.4;
}
.chapter-header > p:last-child {
  color: var(--studio-text-muted);
  font-size: 14px;
  line-height: 1.8;
}
.wiki-section {
  margin: 30px 0;
  scroll-margin-top: 24px;
  font-size: 14px;
  line-height: 1.95;
  overflow-wrap: anywhere;
}
.section-heading {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: baseline;
}
h3 {
  font-size: 17px;
  font-weight: 650;
  margin: 0 0 12px;
  line-height: 1.6;
}
.copy-link {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: var(--studio-text-muted);
  padding: 6px 0 6px 8px;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.copy-link:hover {
  color: var(--studio-primary);
}
.wiki-section p {
  margin: 8px 0 12px;
}
.wiki-section ul,
.wiki-section ol {
  padding-left: 22px;
  margin: 12px 0;
}
.wiki-section li {
  padding-left: 5px;
  margin: 8px 0;
}
.steps li::marker {
  color: var(--studio-primary);
  font-weight: 700;
}
.table-wrap {
  overflow-x: auto;
  margin: 18px 0;
  border: 1px solid var(--studio-border);
  border-radius: 5px;
}
table {
  border-collapse: collapse;
  width: 100%;
  text-align: left;
  font-size: 13px;
}
th {
  background: var(--studio-surface-soft);
  font-weight: 600;
}
th,
td {
  padding: 12px 16px;
  vertical-align: top;
  min-width: 130px;
  border-bottom: 1px solid var(--studio-border);
}
tr:last-child td {
  border-bottom: 0;
}
.example {
  padding: 14px 18px;
  background: var(--studio-surface-soft);
  border-radius: 5px;
  margin: 18px 0;
}
.example strong,
.expected strong,
.wiki-note strong {
  display: block;
  font-size: 11px;
  letter-spacing: 0.04em;
  margin-bottom: 5px;
  color: var(--studio-primary);
}
.example pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: ui-monospace, monospace;
  font-size: 13px;
  line-height: 1.8;
  margin: 0;
}
.expected {
  border-left: 2px solid var(--studio-primary);
  padding: 6px 16px;
}
.wiki-note {
  background: var(--studio-surface-soft);
  padding: 14px 18px;
  margin: 18px 0;
}
.wiki-note p {
  margin: 0;
  color: var(--studio-text-muted);
  font-size: 13px;
}
.reference-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.reference-links a {
  color: var(--studio-primary);
  font-size: 13px;
  text-underline-offset: 4px;
}
.search-results {
  padding: 32px 0;
  min-height: 320px;
}
.search-results > p {
  font-size: 13px;
  color: var(--studio-text-muted);
}
.search-results ul {
  list-style: none;
  padding: 0;
}
.search-results li {
  border-bottom: 1px solid var(--studio-border);
}
.search-results li a {
  display: block;
  text-decoration: none;
  color: inherit;
  padding: 22px 0;
}
.search-results li a:hover h3 {
  color: var(--studio-primary);
}
.search-results small {
  color: var(--studio-primary);
  font-size: 11px;
}
.search-results h3 {
  margin: 7px 0;
}
.search-results li p {
  font-size: 13px;
  line-height: 1.8;
  margin: 0;
  color: var(--studio-text-muted);
}
.empty-search {
  padding: 24px 0;
  font-size: 14px;
  line-height: 1.8;
}
.empty-search button {
  font: inherit;
  border: 1px solid var(--studio-border);
  background: var(--studio-surface);
  color: var(--studio-primary);
  border-radius: 5px;
  padding: 8px 14px;
  cursor: pointer;
}
.wiki-footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 32px 0;
  font-size: 12px;
  color: var(--studio-text-muted);
}
.wiki-footer a {
  color: inherit;
  text-decoration: none;
}
.copy-status:not(:empty) {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  max-width: min(500px, 90vw);
  padding: 12px 18px;
  border: 1px solid var(--studio-border);
  border-radius: 6px;
  background: var(--studio-surface-raised);
  box-shadow: var(--studio-shadow-sm);
  font-size: 13px;
  z-index: 10;
}
.skip-link {
  position: absolute;
  left: 12px;
  top: -100px;
  padding: 10px;
  background: var(--studio-surface);
  z-index: 20;
}
.skip-link:focus {
  top: 12px;
}
a:focus-visible,
button:focus-visible,
.table-wrap:focus-visible {
  outline: 2px solid var(--studio-primary);
  outline-offset: 3px;
}
[tabindex='-1']:focus {
  outline: none;
}
@media (max-width: 1100px) {
  .wiki-shell {
    gap: 32px;
    grid-template-columns: 230px minmax(0, 1fr);
    padding: 24px 24px 0;
  }
  .wiki-sidebar {
    max-height: calc(100dvh - 155px);
  }
}
@media (max-width: 760px) {
  .wiki-shell {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 20px 18px 0;
  }
  .wiki-sidebar {
    position: static;
    max-height: none;
    width: 100%;
    padding: 0 0 18px;
    border-right: 0;
    border-bottom: 1px solid var(--studio-border);
    overflow: visible;
  }
  .sidebar-heading {
    margin-bottom: 16px;
  }
  .wiki-toc {
    display: flex;
    overflow-x: auto;
    gap: 8px;
    margin-top: 14px;
    padding: 4px 0;
  }
  .wiki-toc a {
    white-space: nowrap;
    border: 1px solid var(--studio-border);
    padding: 7px 10px;
  }
  .toc-group,
  .sidebar-links {
    display: none;
  }
  .wiki-content {
    width: 100%;
  }
  .wiki-header {
    padding-top: 0;
  }
  h1 {
    font-size: 36px;
  }
  h1 span {
    font-size: 19px;
  }
  h2 {
    font-size: 22px;
  }
  .section-heading {
    align-items: flex-start;
  }
  .copy-link {
    padding-top: 2px;
  }
  .wiki-chapter {
    padding-top: 30px;
  }
}
</style>
