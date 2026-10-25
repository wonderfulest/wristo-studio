<template>
  <div class="face-detail-page">
    <GlobalHeader />
    <main class="detail-main" :aria-busy="loading">
      <div class="breadcrumb"><RouterLink :to="canEdit ? '/designs' : '/faces'" class="back-link">← {{ canEdit ? t('faceDetail.myDesigns') : t('faceDetail.collection') }}</RouterLink><span v-if="face">/</span><span v-if="face">{{ face.name }}</span></div>
      <div v-if="loading" class="detail-state" role="status">{{ t('faceDetail.loadingWatchFace') }}</div>
      <div v-else-if="error" class="detail-state" role="alert">
        <h1>{{ t('faceDetail.unableToLoadThisWatchFace') }}</h1><p>{{ error }}</p><button class="secondary-button" @click="load">{{ t('faceDetail.tryAgain') }}</button>
      </div>
      <article v-else-if="face" class="detail-grid">
        <aside class="preview-column" :aria-label="t('faceDetail.watchFacePreview')">
          <div class="preview-stage">
            <span class="preview-label">{{ t('faceDetail.watchFace') }} {{ face.appId || t('faceDetail.draft') }}</span>
            <img v-if="selectedImage && !imageFailed" :key="selectedImage" :src="selectedImage" :alt="face.name" @error="imageFailed = true" />
            <span v-else class="preview-placeholder">{{ t('faceDetail.previewUnavailable') }}</span>
            <span class="preview-caption">{{ face.name }}</span>
          </div>
          <div v-if="images.length > 1" class="thumbnails" :aria-label="t('faceDetail.choosePreview')">
            <button v-for="(item, index) in images" :key="item.url" :aria-label="t('faceDetail.previewNumber', { count: index + 1 })" :aria-pressed="selectedImage === item.url" @click="selectImage(item.url)"><img :src="item.url" :alt="item.alt" loading="lazy" /></button>
          </div>
          <FaceImageUpload v-if="canEdit && face.appId && !face.designId" :key="`${face.appId}-${userStore.userInfo?.id}`" :app-id="face.appId" @uploaded="onImagesUploaded" />
          <DesignManagement v-if="canEdit && face.designId && informationTarget" :key="`${face.designId}-${userStore.userInfo?.id}`" :design-uid="face.designId" :information-target="informationTarget" :active-section="activeSection" @select-section="selectSection" @updated="refreshManagedFace" />
          <div class="primary-actions">
            <RouterLink v-if="canEdit && face.designId && !informationTarget" class="studio-edit-button" :to="{ path: '/design', query: { id: face.designId } }"><Icon icon="material-symbols:edit-outline" /> {{ t('faceDetail.editInBuilder') }}</RouterLink>
            <button v-else-if="!canEdit && face.designId && face.allowRemix" class="primary-button" :disabled="remixing" @click="remix">{{ remixing ? t('faceDetail.creatingYourCopy') : t('faceDetail.remixInBuilder') }}</button>
            <p v-else-if="!canEdit || !face.designId" class="source-unavailable">{{ t('faceDetail.thisWatchFaceIsNotAvailableInTheBuilder') }}</p>
            <a v-if="downloadUrl" class="secondary-button" :href="downloadUrl" target="_blank" rel="noopener noreferrer">{{ t('faceDetail.viewOnConnectIq') }} <Icon icon="material-symbols:arrow-outward-rounded" /></a>
          </div>
          <p v-if="remixError" class="sharing-error" role="alert">{{ remixError }}</p>
          <p v-if="!canEdit && face.allowRemix" class="muted">{{ t('faceDetail.createYourOwnCopyWithAttributionToTheOriginalDesign') }}</p>
          <div v-if="face.appId" class="share-row">
            <span>{{ t('faceDetail.share') }}</span>
            <button v-for="platform in socialPlatforms" :key="platform" class="share-button" aria-haspopup="dialog" :disabled="shareLoading" @click="openShare(platform)">{{ platform }}</button>
            <button class="share-button" :disabled="shareLoading" @click="copyLink">{{ t('faceDetail.copyLink') }}</button>
            <span role="status">{{ shareStatus }}</span>
            <span v-if="shareProfile?.enabled">{{ t('faceDetail.shareRewards', { credits: shareProfile.creditsPerVisit, limit: shareProfile.userDailyCredits }) }}</span>
          </div>
        </aside>
        <section class="detail-copy">
          <header class="app-heading">
            <div class="eyebrow">{{ t('faceDetail.garminWatchFace') }} <span v-if="face.appId">#{{ face.appId }}</span></div>
            <div class="app-title-row"><h1>{{ face.name }}</h1><button v-if="canEdit && face.designId" type="button" class="edit-app-information studio-edit-button" @click="selectSection('listing')"><Icon icon="material-symbols:edit-outline" /> {{ t('faceDetail.editAppInformation') }}</button></div>
            <div class="byline"><span v-if="creator" class="creator"><span class="creator-avatar">{{ creator.slice(0, 1).toUpperCase() }}</span>{{ t('faceDetail.by') }} <strong>{{ creator }}</strong></span><span v-if="formatDate(face.updatedAt || face.createdAt)">{{ t('faceDetail.updatedDate', { date: formatDate(face.updatedAt || face.createdAt) }) }}</span></div>
            <DesignSharingSettings v-if="canEdit && (face.designId || face.appId)" :key="`${face.designId || face.appId}-${userStore.userInfo?.id}`" class="owner-sharing-settings" compact :design-uid="face.designId || undefined" :app-id="face.appId || undefined" @saved="Object.assign(face, $event)" />
            <dl class="face-stats">
              <div><dt>{{ t('faceDetail.price') }}</dt><dd>{{ face.price === 0 ? t('faceDetail.free') : face.price == null ? '—' : `$${face.price.toFixed(2)}` }}</dd></div>
              <div v-if="face.download != null"><dt>{{ t('faceDetail.downloads') }}</dt><dd>{{ face.download.toLocaleString(locale) }}</dd></div>
              <div v-if="face.devices?.length"><dt>{{ t('faceDetail.compatibleDevices') }}</dt><dd>{{ face.devices.length }}<span>{{ t('faceDetail.models') }}</span></dd></div>
              <div v-if="face.ratingCount"><dt>{{ t('faceDetail.countRatings', { count: face.ratingCount }) }}</dt><dd>★ {{ face.averageRating?.toFixed(1) ?? '—' }}</dd></div>
            </dl>
          </header>
          <div v-if="canEdit && face.designId" class="detail-tabs" role="tablist" :aria-label="t('faceDetail.applicationInformation')">
            <button v-for="(section, index) in detailSections" :id="`detail-tab-${section.id}`" :key="section.id" type="button" role="tab" :aria-selected="activeSection === section.id" :aria-controls="`detail-panel-${section.id}`" :tabindex="activeSection === section.id ? 0 : -1" @click="selectSection(section.id)" @keydown="moveTab($event, index)"><Icon :icon="section.icon" />{{ section.label }}</button>
          </div>
          <section v-show="activeSection === 'overview'" id="detail-panel-overview" class="overview-content" :role="canEdit && face.designId ? 'tabpanel' : undefined" :aria-labelledby="canEdit && face.designId ? 'detail-tab-overview' : undefined">
            <FaceDescription v-if="face.appId" :key="`${face.appId}-${userStore.userInfo?.id}`" class="information-section overview-description" :app-id="face.appId" :description="face.description" :is-owner="canEdit" :external-editor="!!face.designId" @edit="selectSection('listing')" @saved="face.description = $event">
              <div v-if="face.tags?.length" class="tags"><span v-for="tag in (showAllTags ? face.tags : face.tags.slice(0, 6))" :key="tag.id">{{ tag.name }}</span><button v-if="face.tags.length > 6" @click="showAllTags = !showAllTags">{{ showAllTags ? t('faceDetail.showLess') : t('faceDetail.moreTags', { count: face.tags.length - 6 }) }}</button></div>
            </FaceDescription>
            <div class="capability-grid">
              <details class="information-section capability-section">
                <summary><Icon icon="material-symbols:watch-outline-rounded" /><span><strong>{{ t('faceDetail.deviceCompatibility') }}</strong><small>{{ t('faceDetail.countSupportedModels', { count: face.devices?.length || 0 }) }}</small></span><span class="disclosure">+</span></summary>
                <div v-if="face.devices?.length" class="devices"><RouterLink v-for="device in face.devices" :key="device.deviceId" :to="{ path: '/faces', query: { device: String(device.id) } }">{{ device.displayName }}</RouterLink></div>
                <p v-else class="muted">{{ t('faceDetail.deviceCompatibilityHasNotBeenListed') }}</p>
              </details>
              <details v-if="dataFields.length" class="information-section capability-section supported-data-fields">
                <summary><Icon icon="material-symbols:monitoring-rounded" /><span><strong>{{ t('faceDetail.dataFeatures') }}</strong><small>{{ t('faceDetail.countSupportedDataFields', { count: dataFields.length }) }}</small></span><span class="disclosure">+</span></summary>
                <ul class="data-field-list"><li v-for="field in dataFields" :key="field.symbol">{{ field.label }}</li></ul>
              </details>
            </div>
          </section>
          <div v-if="canEdit && face.designId" ref="informationTarget" class="management-information-target">
            <div v-show="activeSection === 'overview'" class="management-summary"></div>
            <section v-show="activeSection !== 'overview'" :id="`detail-panel-${activeSection === 'overview' ? 'listing' : activeSection}`" role="tabpanel" :aria-labelledby="`detail-tab-${activeSection === 'overview' ? 'listing' : activeSection}`">
              <div class="management-publishing"></div>
            </section>
          </div>
        </section>
      </article>
    </main>
    <AppBuildVersion />
    <SocialShareDialog v-if="sharePlatform && face" :key="`${face.appId}-${sharePlatform}`" :face="face" :platform="sharePlatform" :referral-code="shareProfile?.code" @close="sharePlatform = null" />
  </div>
</template>
<script setup lang="ts">
import AppBuildVersion from '@/components/layout/AppBuildVersion.vue'
import { useI18n } from '@/i18n'
const { t, locale } = useI18n()
import { defineAsyncComponent, computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { remixFace } from './permissions'
import DesignSharingSettings from '@/components/dialogs/DesignSharingSettings.vue'
import { Icon } from '@iconify/vue'
import '@fontsource/roboto-condensed/latin-700.css'
import '@fontsource/yantramanav/latin-400.css'
import '@fontsource/yantramanav/latin-700.css'
import GlobalHeader from '@/components/layout/GlobalHeader.vue'
import SocialShareDialog from './SocialShareDialog.vue'
import { loadShareRewardProfile, type ShareRewardProfile } from '@/api/wristo/shareRewards'
import { faceShareUrl, type SocialPlatform } from './sharing'
import { faceDownloadUrl, faceImage, loadFaceDetail, type FaceDetail } from './catalog'

import FaceImageUpload from './FaceImageUpload.vue'
import FaceDescription from './FaceDescription.vue'
import type { FaceImages } from './content'

import type { PublishSection } from '@/components/dialogs/publishSections'
import { designApi } from '@/api/wristo/design'
import { supportedDataFields } from './dataFields'
import { formatFaceDate } from './faceDate'

const DesignManagement = defineAsyncComponent(() => import('@/views/designs/DesignManagement.vue').then(module => module.default))
const activeSection = ref<'overview' | PublishSection>('overview')
const detailSections = computed(() => [
  { id: 'overview', label: t('faceDetail.overview'), icon: 'material-symbols:overview-outline-rounded' },
  { id: 'listing', label: t('faceDetail.storeListing'), icon: 'material-symbols:article-outline-rounded' },
  { id: 'media', label: t('faceDetail.media'), icon: 'material-symbols:photo-library-outline-rounded' },
  { id: 'distribution', label: t('faceDetail.availability'), icon: 'material-symbols:public' },
] as const)
const showAllTags = ref(false)
function selectSection(section: 'overview' | PublishSection) {
  activeSection.value = section
  void router.replace({ query: { ...route.query, section: section === 'overview' ? undefined : section } })
}
function moveTab(event: KeyboardEvent, index: number) {
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? detailSections.value.length - 1 : event.key === 'ArrowRight' ? (index + 1) % detailSections.value.length : event.key === 'ArrowLeft' ? (index + detailSections.value.length - 1) % detailSections.value.length : -1
  if (next < 0) return
  event.preventDefault()
  selectSection(detailSections.value[next].id)
  document.getElementById(`detail-tab-${activeSection.value}`)?.focus()
}
const informationTarget = ref<HTMLElement | null>(null)
const sharePlatform = ref<SocialPlatform | null>(null)
const socialPlatforms: SocialPlatform[] = ['X', 'Facebook', 'Reddit']
const route = useRoute()
const router = useRouter()
function sectionFromRoute(): 'overview' | PublishSection {
  const section = route.query.section
  return section === 'listing' || section === 'media' || section === 'distribution' ? section : 'overview'
}
watch(() => route.query.section, () => { activeSection.value = sectionFromRoute() })
const userStore = useUserStore()
const isOwner = computed(() => userStore.userInfo?.id != null && face.value?.ownerId != null && String(userStore.userInfo.id) === String(face.value.ownerId))
const canEdit = computed(() => isOwner.value || userStore.isAdminUser)
const remixing = ref(false)
const remixError = ref('')
async function remix() {
  if (!face.value?.designId || !face.value.allowRemix || remixing.value) return
  const current = request
  remixing.value = true
  remixError.value = ''
  try {
    const designUid = await remixFace(face.value.designId)
    if (current === request) await router.push({ path: '/design', query: { id: designUid } })
  } catch (cause) {
    if (current === request) remixError.value = cause instanceof Error ? cause.message : t('faceDetail.couldNotCreateACopyPleaseTryAgain')
  } finally { if (current === request) remixing.value = false }
}
const face = ref<FaceDetail | null>(null)
const dataFields = computed(() => supportedDataFields(face.value?.dataFieldCatalog ?? face.value?.configJson, locale.value))
const loading = ref(true)
const error = ref('')
const selectedImage = ref('')
const imageFailed = ref(false)
const shareStatus = ref('')
const shareProfile = ref<ShareRewardProfile>()
const shareLoading = ref(false)
let shareRequest = 0
watch(() => userStore.userInfo?.id, () => { shareRequest++; shareProfile.value = undefined; sharePlatform.value = null; shareLoading.value = false })
async function prepareShare() {
  if (!userStore.isAuthenticated) return
  if (shareProfile.value) return
  const current = ++shareRequest
  shareLoading.value = true
  try {
    const profile = await loadShareRewardProfile()
    if (current !== shareRequest) throw new Error('Account changed. Please try again.')
    shareProfile.value = profile
  } finally { if (current === shareRequest) shareLoading.value = false }
}
async function openShare(platform: SocialPlatform) {
  if (shareLoading.value) return
  try { await prepareShare(); sharePlatform.value = platform; shareStatus.value = '' }
  catch { shareStatus.value = t('faceDetail.couldNotPrepareYourPersonalSharingLinkPleaseTryAgain') }
}
const shareUrl = computed(() => face.value ? faceShareUrl(window.location.origin, face.value.appId, shareProfile.value?.code, 'copy') : '')
async function copyLink() {
  try {
    await prepareShare()
    await navigator.clipboard.writeText(shareUrl.value)
    shareStatus.value = t('faceDetail.linkCopied')
  } catch {
    shareStatus.value = t('faceDetail.couldNotCopyYourPersonalSharingLinkPleaseTryAgain')
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
function onImagesUploaded(updated: FaceImages) {
  if (!face.value || !canEdit.value) return
  const previous = new Set(images.value.map(image => image.url))
  face.value.productImages = updated
  const added = images.value.find(image => !previous.has(image.url))
  if (added) selectImage(added.url)
}
const selectImage = (url: string) => {
  selectedImage.value = url
  imageFailed.value = false
}
const formatDate = (value?: string | null) => formatFaceDate(value, locale.value)

async function loadCurrentFace(): Promise<FaceDetail> {
  if (!route.params.designUid) return loadFaceDetail(String(route.params.appId || ''), userStore.token)
  const response = await designApi.getDesignByUid(String(route.params.designUid))
  if (response.code !== 0 || !response.data) throw new Error(response.msg || t('faceDetail.designNotFound'))
  const design = response.data
  if (!userStore.isAdminUser && design.user?.id !== userStore.userInfo?.id) throw new Error(t('faceDetail.designNotFound'))
  if (design.product?.appId) {
    return loadFaceDetail(String(design.product.appId), userStore.token)
  }
  return { appId: 0, designId: design.designUid, ownerId: design.user?.id, name: design.name, price: null, description: design.description, rawImageUrl: design.cover?.url, configJson: design.configJson, user: design.user }
}
async function refreshManagedFace() {
  const current = request
  try {
    const result = await loadCurrentFace()
    if (current === request) face.value = result
  } catch {
    // A background failure must not unmount the page and discard active edits.
    // Keep the last loaded detail; a later update can refresh it in place.
  }
}
async function load() {
  sharePlatform.value = null
  activeSection.value = sectionFromRoute()
  showAllTags.value = false
  const current = ++request
  loading.value = true
  error.value = ''
  shareStatus.value = ''
  remixError.value = ''
  remixing.value = false
  face.value = null
  try {
    const result = await loadCurrentFace()
    if (current !== request) return
    if (route.params.designUid && result.appId) {
      await router.replace(`/faces/${result.appId}`)
      return
    }
    face.value = result
    selectImage(images.value[0]?.url || '')
  } catch (cause) {
    if (current === request) error.value = cause instanceof Error ? cause.message : t('faceDetail.retryMessage')
  } finally {
    if (current === request) loading.value = false
  }
}
watch([() => route.params.appId, () => route.params.designUid, () => userStore.userInfo?.id], load, { immediate: true })
onBeforeUnmount(() => { request += 1; shareRequest += 1 })
</script>

<style scoped>
.app-title-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.edit-app-information { font-size: 13px; white-space: nowrap; }
.face-detail-page { min-height: 100vh; background: var(--studio-bg); color: var(--studio-text); font-family: 'Yantramanav', sans-serif; }
.detail-main { max-width: 1360px; padding: 26px 40px 80px; margin: auto; }
.breadcrumb { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; color: var(--studio-text-subtle); font-size: 13px; }
.back-link { color: var(--studio-text-muted); text-decoration: none; }
.back-link:hover { color: var(--studio-primary); }
.detail-grid { display: grid; grid-template-columns: minmax(250px, 320px) minmax(0, 1fr); gap: 48px; align-items: start; }
.preview-column { position: sticky; top: 82px; min-width: 0; }
.detail-copy { min-width: 0; }
.preview-stage { position: relative; aspect-ratio: 1; display: grid; place-items: center; padding: 34px 20px; border: 1px solid var(--studio-border); border-radius: 18px; background: var(--studio-surface-soft); }
.preview-stage > img { width: 100%; height: 100%; object-fit: contain; }
.preview-label, .preview-caption { position: absolute; font-size: 10px; letter-spacing: 1.4px; color: var(--studio-text-subtle); }
.preview-label { top: 18px; left: 20px; }.preview-caption { bottom: 16px; letter-spacing: .5px; }
.preview-placeholder { color: var(--studio-text-muted); }
.thumbnails { display: flex; gap: 8px; overflow-x: auto; padding: 12px 2px; }
.thumbnails button { width: 58px; height: 58px; padding: 5px; flex-shrink: 0; border: 1px solid var(--studio-border); border-radius: 9px; background: var(--studio-surface-raised); cursor: pointer; }
.thumbnails button[aria-pressed='true'] { border: 2px solid var(--studio-primary); background: var(--studio-primary-soft); }
.thumbnails img { width: 100%; height: 100%; object-fit: contain; }
.app-heading { padding: 3px 0 24px; }
.eyebrow { display: flex; align-items: center; gap: 12px; color: var(--studio-primary); font-size: 11px; font-weight: 700; letter-spacing: 1.8px; }
.eyebrow span { color: var(--studio-text-subtle); font-weight: 400; letter-spacing: .4px; border-left: 1px solid var(--studio-border-strong); padding-left: 12px; }
h1 { margin: 12px 0; font-size: clamp(32px, 3.6vw, 48px); line-height: 1.05; font-weight: 700; letter-spacing: -1px; overflow-wrap: anywhere; }
.byline { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; color: var(--studio-text-muted); font-size: 13px; }
.creator { display: inline-flex; align-items: center; gap: 6px; }.creator strong { font-weight: 600; color: var(--studio-text); }
.creator-avatar { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--studio-primary-soft); color: var(--studio-primary); font-size: 11px; margin-right: 3px; }
.face-stats { display: flex; gap: 0; margin: 24px 0 0; padding: 18px 0 0; border-top: 1px solid var(--studio-border); }
.face-stats > div { padding: 0 26px; border-left: 1px solid var(--studio-border); }.face-stats > div:first-child { padding-left: 0; border: 0; }
dt { font-size: 12px; color: var(--studio-text-muted); }dd { margin: 4px 0 0; font-size: 22px; line-height: 1.2; font-weight: 700; }dd span { font-size: 12px; font-weight: 400; color: var(--studio-text-muted); }
.detail-tabs { display: flex; gap: 24px; border-bottom: 1px solid var(--studio-border); margin-bottom: 16px; overflow-x: auto; }
.detail-tabs button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; flex-shrink: 0; min-height: 46px; padding: 0 0 13px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--studio-text-muted); font: inherit; font-size: 14px; cursor: pointer; }
.detail-tabs button[aria-selected='true'] { color: var(--studio-primary); border-bottom-color: var(--studio-primary); font-weight: 700; }.detail-tabs svg { width: 17px; height: 17px; }
.information-section { padding: 16px 18px; margin: 0 0 18px; border: 1px solid var(--studio-border); border-radius: 12px; background: var(--studio-surface-raised); }
.overview-description :deep(.md-editor-preview) { font-size: 14px; line-height: 1.7; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }.tags span, .tags button { border: 1px solid var(--studio-border); background: var(--studio-surface-soft); color: var(--studio-text-muted); border-radius: 5px; padding: 3px 8px; font: inherit; font-size: 11px; }.tags button { color: var(--studio-primary); cursor: pointer; background: transparent; }
.capability-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: start; }.capability-section:only-child { grid-column: 1 / -1; }.capability-section { padding: 18px; }.capability-section summary { display: flex; align-items: center; gap: 12px; cursor: pointer; list-style: none; }.capability-section summary::-webkit-details-marker { display: none; }.capability-section summary > svg { color: var(--studio-primary); width: 22px; height: 22px; flex-shrink: 0; }.capability-section strong { display: block; font-size: 14px; font-weight: 600; }.capability-section small { display: block; font-size: 12px; color: var(--studio-text-muted); margin-top: 3px; }.disclosure { margin-left: auto; color: var(--studio-text-subtle); font-size: 20px; }.capability-section[open] .disclosure { transform: rotate(45deg); }
.devices, .data-field-list { display: flex; flex-wrap: wrap; gap: 6px; padding: 16px 0 0; list-style: none; margin: 0; }.devices a, .data-field-list li { padding: 4px 7px; font-size: 11px; color: var(--studio-text-muted); background: var(--studio-surface-soft); border-radius: 4px; text-decoration: none; overflow-wrap: anywhere; }.devices a:hover { color: var(--studio-primary); }
.primary-actions { display: grid; gap: 10px; margin-top: 10px; }.primary-button, .secondary-button { display: inline-flex; justify-content: center; align-items: center; gap: 8px; min-height: 42px; padding: 9px 12px; border-radius: 8px; font: inherit; font-size: 13px; text-decoration: none; cursor: pointer; }.primary-button { background: var(--studio-primary); color: #fff; border: 1px solid var(--studio-primary); font-weight: 700; }.secondary-button { border: 1px solid var(--studio-border); color: var(--studio-text-muted); background: var(--studio-surface-raised); }.secondary-button svg { margin-left: auto; }.secondary-button:hover { color: var(--studio-primary); border-color: var(--studio-primary); }
.share-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 0; margin-top: 6px; color: var(--studio-text-subtle); font-size: 11px; }.share-row > span:first-child { letter-spacing: 1.3px; font-size: 9px; }.share-button { font: inherit; min-height: 32px; border: 0; background: none; padding: 0; color: var(--studio-text-muted); cursor: pointer; }.share-button:hover { color: var(--studio-primary); }
.muted, .source-unavailable { color: var(--studio-text-muted); font-size: 13px; }.sharing-error { color: var(--studio-danger, #c93838); }.owner-sharing-settings { margin-top: 16px; padding: 10px 14px; border-radius: 8px; background: var(--studio-primary-soft); }
button:disabled { opacity: .6; cursor: wait; }a:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--studio-primary); outline-offset: 3px; }
.detail-state { padding: 90px 0; text-align: center; }
@media (max-width: 1050px) { .detail-grid { grid-template-columns: 270px minmax(0, 1fr); gap: 28px; }.detail-main { padding: 24px; }.detail-tabs { gap: 18px; }.capability-grid { grid-template-columns: 1fr; }.face-stats > div { padding: 0 16px; } }
@media (max-width: 720px) { .detail-grid { grid-template-columns: minmax(0, 1fr); gap: 28px; }.preview-column { position: static; }.preview-stage { max-width: 320px; margin: auto; }.thumbnails { justify-content: center; }.detail-main { padding: 20px 18px 48px; }.detail-tabs { gap: 22px; }.detail-tabs button { font-size: 13px; }.app-heading { padding-top: 0; }.face-stats { flex-wrap: wrap; row-gap: 16px; }.face-stats > div { padding: 0 14px; }.byline { gap: 10px; }.information-section { padding: 18px; } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
</style>
