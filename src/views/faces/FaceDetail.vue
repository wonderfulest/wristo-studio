<template>
  <div class="face-detail-page">
    <GlobalHeader />
    <main class="detail-main" :aria-busy="loading">
      <RouterLink to="/faces" class="back-link">← Back to gallery</RouterLink>
      <div v-if="loading" class="detail-state" role="status">Loading watch face…</div>
      <div v-else-if="error" class="detail-state" role="alert">
        <h1>Unable to load this watch face</h1>
        <p>{{ error }}</p>
        <button class="secondary-button" @click="load">Try again</button>
      </div>
      <article v-else-if="face" class="detail-grid">
        <section class="preview-column" aria-label="Watch face preview">
          <div class="preview-stage">
            <span class="preview-label">WRISTO COLLECTION</span>
            <img v-if="selectedImage && !imageFailed" :key="selectedImage" :src="selectedImage" :alt="face.name" @error="imageFailed = true" />
            <span v-else class="preview-placeholder">Preview unavailable</span>
            <span class="preview-caption">{{ face.name }}</span>
          </div>
          <div v-if="images.length > 1" class="thumbnails" aria-label="Choose preview">
            <button v-for="(item, index) in images" :key="item.url" :aria-label="`Preview ${index + 1}`" :aria-pressed="selectedImage === item.url" @click="selectImage(item.url)">
              <img :src="item.url" :alt="item.alt" loading="lazy" />
            </button>
          </div>
          <section class="information-section">
            <h2>Compatible devices <span v-if="face.devices?.length">{{ face.devices.length }}</span></h2>
            <div v-if="face.devices?.length" class="devices">
              <RouterLink v-for="device in face.devices.slice(0, 6)" :key="device.deviceId" :to="{ path: '/faces', query: { device: String(device.id) } }">{{ device.displayName }}</RouterLink>
            </div>
            <p v-else class="muted">Device compatibility has not been listed.</p>
            <details v-if="face.devices && face.devices.length > 6" class="more-devices">
              <summary>Show {{ face.devices.length - 6 }} more devices</summary>
              <div class="devices">
                <RouterLink v-for="device in face.devices.slice(6)" :key="device.deviceId" :to="{ path: '/faces', query: { device: String(device.id) } }">{{ device.displayName }}</RouterLink>
              </div>
            </details>
          </section>
          <dl class="face-stats">
            <div v-if="face.download != null"><dt>Downloads</dt><dd>{{ face.download.toLocaleString() }}</dd></div>
            <div v-if="face.ratingCount"><dt>{{ face.ratingCount }} ratings</dt><dd>★ {{ face.averageRating?.toFixed(1) ?? '—' }}</dd></div>
            <div><dt>Price</dt><dd>{{ face.price === 0 ? 'Free' : face.price == null ? 'See Connect IQ' : `$${face.price.toFixed(2)}` }}</dd></div>
          </dl>
          <div class="primary-actions">
            <RouterLink v-if="face.designId" class="primary-button" :to="{ path: '/design', query: { id: face.designId } }">
              <Icon icon="material-symbols:edit-square-outline" /> Edit in Builder <span aria-hidden="true">↗</span>
            </RouterLink>
            <p v-else class="source-unavailable">This watch face is not available in the builder.</p>
            <a v-if="downloadUrl" class="secondary-button" :href="downloadUrl" target="_blank" rel="noopener noreferrer">
              <Icon icon="material-symbols:download-rounded" /> Download on Connect IQ
            </a>
          </div>
          <div class="share-row">
            <span>SHARE</span>
            <a v-for="item in socialLinks" :key="item.label" :href="item.href" target="_blank" rel="noopener noreferrer" :aria-label="`Share ${face.name} on ${item.label} (opens in a new tab)`">{{ item.label }}</a>
            <button class="share-button" @click="copyLink">Copy link <span aria-hidden="true">↗</span></button>
            <span role="status">{{ shareStatus }}</span>
          </div>
        </section>
        <section class="detail-copy">
          <p class="eyebrow">GARMIN WATCH FACE</p>
          <h1>{{ face.name }}</h1>
          <div v-if="creator" class="creator">
            <span class="creator-avatar">{{ creator.slice(0, 1).toUpperCase() }}</span>
            <span>Designed by <strong>{{ creator }}</strong></span>
          </div>
          <section class="information-section">
            <h2>Description</h2>
            <p class="description">{{ face.description?.trim() || 'No description provided.' }}</p>
            <div v-if="face.tags?.length" class="tags"><span v-for="tag in face.tags" :key="tag.id">{{ tag.name }}</span></div>
          </section>
          <section v-if="dataFields.length" class="information-section supported-data-fields" aria-labelledby="data-fields-heading">
            <h2 id="data-fields-heading">Supported data fields <span>{{ dataFields.length }}</span></h2>
            <ul class="data-field-list">
              <li v-for="field in dataFields" :key="field.symbol">{{ field.label }}</li>
            </ul>
          </section>
          <dl class="metadata">
            <div><dt>App ID</dt><dd>{{ face.appId }}</dd></div>
            <div v-if="formatDate(face.updatedAt || face.createdAt)"><dt>Updated</dt><dd>{{ formatDate(face.updatedAt || face.createdAt) }}</dd></div>
          </dl>
        </section>
      </article>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import '@fontsource/roboto-condensed/latin-700.css'
import '@fontsource/yantramanav/latin-400.css'
import '@fontsource/yantramanav/latin-700.css'
import GlobalHeader from '@/components/layout/GlobalHeader.vue'
import { buildFaceShareLinks, faceShareUrl } from './sharing'
import { faceDownloadUrl, faceImage, loadFaceDetail, type FaceDetail } from './catalog'

import { supportedDataFields } from './dataFields'

const route = useRoute()
const face = ref<FaceDetail | null>(null)
const dataFields = computed(() => supportedDataFields(face.value?.configJson))
const loading = ref(true)
const error = ref('')
const selectedImage = ref('')
const imageFailed = ref(false)
const shareStatus = ref('')
const shareUrl = computed(() => face.value ? faceShareUrl(window.location.origin, face.value.appId) : '')
const socialLinks = computed(() => buildFaceShareLinks(shareUrl.value, face.value?.name || ''))
async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    shareStatus.value = 'Link copied'
  } catch {
    shareStatus.value = 'Could not copy. Copy the address from your browser.'
  }
}
let request = 0
const creator = computed(() => face.value?.user?.nickname || face.value?.user?.username || '')
const downloadUrl = computed(() => face.value ? faceDownloadUrl(face.value) : undefined)
const images = computed(() => {
  if (!face.value) return []
  const cover = faceImage(face.value)
  const items = (face.value.productImages || [])
    .filter(item => item.isActive !== 0)
    .slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map(item => ({ url: item.imageUrl || item.previewUrl || '', alt: item.altText || face.value!.name }))
  if (cover) items.unshift({ url: cover, alt: face.value.name })
  return items.filter((item, index) => item.url && items.findIndex(other => other.url === item.url) === index)
})
const selectImage = (url: string) => {
  selectedImage.value = url
  imageFailed.value = false
}
const formatDate = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
async function load() {
  const current = ++request
  loading.value = true
  error.value = ''
  shareStatus.value = ''
  face.value = null
  try {
    const result = await loadFaceDetail(String(route.params.appId || ''))
    if (current !== request) return
    face.value = result
    selectImage(images.value[0]?.url || '')
  } catch (cause) {
    if (current === request) error.value = cause instanceof Error ? cause.message : 'Please try again.'
  } finally {
    if (current === request) loading.value = false
  }
}
watch(() => route.params.appId, load, { immediate: true })
onBeforeUnmount(() => { request += 1 })
</script>

<style scoped>
.face-detail-page { min-height: 100vh; background: var(--studio-bg); color: var(--studio-text); font-family: 'Yantramanav', sans-serif; }
.detail-main { max-width: 1280px; padding: 48px 40px 80px; margin: auto; }
.back-link { display: inline-block; margin-bottom: 30px; color: var(--studio-text-muted); font-size: 15px; text-decoration: none; }
.back-link:hover { color: var(--studio-primary); }
.detail-grid { display: grid; grid-template-columns: minmax(280px, 360px) minmax(0, 1fr); gap: 28px; align-items: start; }
.preview-column, .detail-copy { min-width: 0; }
.preview-stage { position: relative; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; padding: 36px 16px; background: var(--studio-surface-soft); border: 1px solid var(--studio-border); border-radius: 12px; }
.preview-stage > img { width: 100%; height: 100%; object-fit: contain; }
.preview-label, .preview-caption { position: absolute; color: var(--studio-text-subtle); font-size: 11px; letter-spacing: 1.4px; }
.preview-label { top: 22px; left: 24px; }
.preview-caption { bottom: 20px; left: 24px; right: 24px; text-align: center; letter-spacing: 0; }
.preview-placeholder { color: var(--studio-text-muted); }
.thumbnails { display: flex; gap: 10px; overflow-x: auto; padding: 12px 2px; }
.thumbnails button { width: 68px; height: 68px; padding: 6px; flex-shrink: 0; border: 1px solid var(--studio-border); border-radius: 6px; background: var(--studio-surface-soft); cursor: pointer; }
.thumbnails button[aria-pressed='true'] { border: 2px solid var(--studio-primary); }
.thumbnails img { width: 100%; height: 100%; object-fit: contain; }
.face-stats { display: flex; gap: 24px; flex-wrap: wrap; padding: 16px 0; border-bottom: 1px solid var(--studio-border); margin: 0; }
dt { color: var(--studio-text-muted); font-size: 13px; }
dd { margin: 4px 0 0; font-size: 17px; font-weight: 700; }
.eyebrow { margin: 0 0 12px; color: var(--studio-primary); font-size: 12px; letter-spacing: 2px; font-weight: 700; }
h1 { font-family: 'Roboto Condensed', sans-serif; font-size: clamp(30px, 3vw, 40px); line-height: 1.08; margin: 0; overflow-wrap: anywhere; }
.creator { display: flex; align-items: center; gap: 10px; margin: 20px 0 16px; padding: 16px; border: 1px solid var(--studio-border); border-radius: 12px; background: var(--studio-surface-raised); font-size: 15px; color: var(--studio-text-muted); }
.creator strong { color: var(--studio-text); }
.creator-avatar { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; color: var(--studio-primary); background: var(--studio-primary-soft); font-weight: 700; }
.primary-actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0; }
.primary-button, .secondary-button { display: inline-flex; justify-content: center; align-items: center; gap: 8px; min-height: 46px; padding: 10px 12px; border-radius: 6px; font: inherit; font-size: 15px; font-weight: 700; text-decoration: none; cursor: pointer; }
.primary-button { background: var(--studio-primary); color: #fff; border: 1px solid var(--studio-primary); }
.primary-button:hover { background: var(--studio-primary-hover); }
.secondary-button { border: 1px solid var(--studio-border-strong); color: var(--studio-text); background: var(--studio-surface-raised); }
.secondary-button:hover { background: var(--studio-surface-soft); }
.primary-actions svg { width: 18px; height: 18px; }
.source-unavailable, .muted { color: var(--studio-text-muted); font-size: 15px; }
.information-section { margin-top: 16px; padding: 20px; border: 1px solid var(--studio-border); border-radius: 12px; background: var(--studio-surface-raised); }
.preview-column .information-section { padding: 16px; }
.preview-column h2 { font-size: 14px; }
.share-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; color: var(--studio-text-muted); font-size: 13px; }
.share-row > span:first-child { font-size: 11px; letter-spacing: 1.4px; }
.share-row a { display: inline-flex; align-items: center; min-height: 44px; color: var(--studio-text-muted); text-decoration: none; }
.share-row a:hover { color: var(--studio-primary); text-decoration: underline; }
.share-button { border: 0; background: transparent; color: var(--studio-primary); font: inherit; min-height: 44px; cursor: pointer; padding: 0 4px; }
.primary-actions > a { flex: 1 1 auto; }
.source-unavailable { margin: 0; }
h2 { font-size: 18px; margin: 0 0 14px; }
h2 > span { margin-left: 8px; color: var(--studio-text-subtle); font-size: 14px; font-weight: 400; }
.description { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; font-size: 16px; line-height: 1.7; color: var(--studio-text-muted); }
.devices, .tags { display: flex; flex-wrap: wrap; gap: 6px; }
.devices a, .tags span { max-width: 100%; overflow-wrap: anywhere; padding: 3px 8px; border: 1px solid var(--studio-border); border-radius: 4px; font-size: 13px; color: var(--studio-text-muted); text-decoration: none; }
.devices a:hover { color: var(--studio-primary); border-color: var(--studio-primary); }
.more-devices summary { cursor: pointer; color: var(--studio-primary); font-size: 14px; padding: 12px 0; }
.tags { margin-top: 18px; }
.data-field-list { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; margin: 0; }
.data-field-list li { max-width: 100%; overflow-wrap: anywhere; padding: 6px 10px; border: 1px solid var(--studio-border); border-radius: 6px; color: var(--studio-text-muted); font-size: 15px; }
.metadata { display: flex; gap: 36px; padding: 20px; margin-top: 16px; border: 1px solid var(--studio-border); border-radius: 12px; background: var(--studio-surface-raised); }
.metadata dd { font-size: 14px; font-weight: 400; }
.detail-state { padding: 90px 0; text-align: center; }
.detail-state h1 { font-size: 30px; }
a:focus-visible, button:focus-visible { outline: 2px solid var(--studio-primary); outline-offset: 3px; }
@media (max-width: 900px) { .detail-grid { gap: 32px; } .detail-main { padding: 24px; } .preview-stage { padding: 40px 28px; } }
@media (max-width: 640px) { .detail-grid { grid-template-columns: minmax(0, 1fr); gap: 32px; } .detail-main { padding: 20px 18px 48px; } .back-link { margin-bottom: 20px; } }
</style>
