<template>
  <div class="font-main" :class="{ 'font-main-compact': compact }" v-if="isReady">
    <el-tooltip v-if="isSystem" :content="t('font.systemFont')" placement="top">
      <div class="font-corner-badge font-system-badge" :aria-label="t('font.systemFont')">
        <i class="iconfont icon-system"></i>
      </div>
    </el-tooltip>
    <el-tooltip v-if="isRecent" :content="t('font.recent')" placement="top">
      <div class="font-corner-badge font-recent-badge" :style="recentBadgeStyle" :aria-label="t('font.recent')">
        <el-icon><Clock /></el-icon>
      </div>
    </el-tooltip>
    <div class="font-header" v-if="label || fontSlug || hasTags || fontId != null" :style="headerStyle">
      <div class="font-title-group">
        <div class="font-identity">
          <div class="font-name" v-if="label" :title="fontSlug || undefined">{{ label }}</div>
        </div>
        <div class="font-name-actions" :style="actionsStyle" v-if="fontId != null">
          <button
            v-if="canQuickEdit"
            type="button"
            class="font-icon-btn font-icon-btn-edit"
            :title="t('common.edit')"
            :aria-label="t('common.edit')"
            @click.stop="onQuickEdit"
          >
            <el-icon><Edit /></el-icon>
          </button>
          <button
            v-if="fontId != null"
            type="button"
            class="font-icon-btn font-icon-btn-favorite"
            :class="{ favorited: isFavorite }"
            :title="isFavorite ? t('font.removeFavorite') : t('font.addFavorite')"
            :aria-label="isFavorite ? t('font.removeFavorite') : t('font.addFavorite')"
            :disabled="favoriteUpdating"
            @click.stop="onToggleFavorite"
          >
            <el-icon>
              <StarFilled v-if="isFavorite" />
              <Star v-else />
            </el-icon>
          </button>
          <button
            v-if="fontId != null && canEditSearchIndex"
            type="button"
            class="font-icon-btn font-icon-btn-tag"
            title="编辑搜索标签"
            aria-label="编辑搜索标签"
            @click.stop="onEditSearchIndex"
          >
            <el-icon><CollectionTag /></el-icon>
          </button>
          <button
            v-if="!isSystem && canDeleteFont && fontId != null"
            type="button"
            class="font-icon-btn font-icon-btn-delete"
            :title="t('font.deleteFont')"
            :aria-label="t('font.deleteFont')"
            @click.stop="onDelete"
          >
            <el-icon><Delete /></el-icon>
          </button>
        </div>
      </div>
      <div class="font-tags" v-if="hasTags" :style="tagsStyle">
        <el-tag v-if="isMonospace" size="small" effect="plain">Mono</el-tag>
        <template v-for="tag in visibleStyleTags" :key="tag">
          <el-tooltip v-if="effectIconFor(tag)" :content="formatTag(tag)" placement="top">
            <span
              class="font-effect-icon"
              :class="`font-effect-icon-${normalizeTag(tag)}`"
              :aria-label="formatTag(tag)"
            >{{ effectIconFor(tag) }}</span>
          </el-tooltip>
          <el-tag v-else size="small" effect="plain">
            {{ formatTag(tag) }}
          </el-tag>
        </template>
        <!-- <el-tag v-if="isMonospace" size="small">
          <el-icon><Rank /></el-icon>
        </el-tag>
        <el-tag v-if="subfamily" size="small" effect="plain">
          <el-icon><CollectionTag /></el-icon>
        </el-tag> -->
      </div>
    </div>
    <FontPreviewText
      :font-family="fontFamily"
      :type="type"
      :language="language"
      :section-name="sectionName"
      :font-url="fontUrl"
      :preview-text="previewText"
      :preview-text-style="previewTextStyle"
      :bitmap-preview-descriptor-url="bitmapPreviewDescriptorUrl"
      :bitmap-preview-atlas-url="bitmapPreviewAtlasUrl"
    />
  </div>
  <div v-else class="font-main" :class="{ 'font-main-compact': compact }">
    <div class="font-header">
      <div class="font-name">{{ t('font.loading') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch, type CSSProperties } from 'vue'
import { useRouter } from 'vue-router'
import { ElTag, ElMessageBox, ElMessage } from 'element-plus'
import { CollectionTag, Edit, Delete, Clock, Star, StarFilled } from '@element-plus/icons-vue'
import FontPreviewText from '@/components/fonts/FontPreviewText.vue'
import { useUserStore } from '@/stores/user'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import { favoriteFont, removeAdminFont, removeMyFont, unfavoriteFont } from '@/api/wristo/fonts'
import { useFontStore } from '@/stores/fontStore'
import { useI18n } from '@/i18n'
import { canQuickEditFont, resolveFontQuickEditLocation } from './fontQuickEdit'

const { t } = useI18n()

const props = defineProps<{
  label?: string
  fontFamily: string
  fontSlug?: string
  type?: string
  language?: string
  sectionName?: string
  isSystem?: boolean
  isMonospace?: boolean
  subfamily?: string
  fontId?: number
  fontUrl?: string
  styleTags?: string | string[]
  canEditSearchIndex?: boolean
  previewText?: string
  previewTextStyle?: CSSProperties
  isRecent?: boolean
  compact?: boolean
  favoriteWeight?: number | null
  ownerUserId?: number
  bitmapPreviewDescriptorUrl?: string | null
  bitmapPreviewAtlasUrl?: string | null
}>()

const emit = defineEmits<{
  (e: 'removed', id: number): void
  (e: 'editSearchIndex', id: number): void
  (e: 'favoriteChanged', id: number, favoriteWeight: number | null | undefined): void
}>()

const isReady = ref(false)
const favoriteUpdating = ref(false)
const localFavoriteWeight = ref<number | null | undefined>(props.favoriteWeight)

const router = useRouter()
const fontStore = useFontStore()
const userStore = useUserStore()
const membershipGate = useStudioMembershipGate()

const parsedStyleTags = computed(() => {
  const raw = props.styleTags
  const list = Array.isArray(raw) ? raw : String(raw || '').split(/[,，\s]+/)
  return list
    .map(tag => tag.trim())
    .filter(tag => tag && tag.toLowerCase() !== 'regular')
})
const visibleStyleTags = computed(() => parsedStyleTags.value.slice(0, 3))
const hasTags = computed(() => props.isMonospace || !!props.subfamily || visibleStyleTags.value.length > 0)
const canQuickEdit = computed(() => canQuickEditFont({
  ownerUserId: props.ownerUserId,
  currentUserId: userStore.userInfo?.id,
  currentUserIsAdmin: userStore.isAdminUser,
  isSystem: !!props.isSystem,
  type: props.type || '',
}))
const canDeleteFont = computed(() => {
  if (userStore.isAdminUser) return true
  const currentUserId = userStore.userInfo?.id
  return currentUserId != null && props.ownerUserId === currentUserId
})
const cornerBadgeCount = computed(() => (props.isSystem ? 1 : 0) + (props.isRecent ? 1 : 0))
const cornerBadgeWidth = computed(() => cornerBadgeCount.value * 28)
const actionButtonCount = computed(() => {
  if (props.fontId == null) return 0
  return [
    canQuickEdit.value,
    true,
    props.canEditSearchIndex,
    !props.isSystem && canDeleteFont.value,
  ].filter(Boolean).length
})
const actionWidth = computed(() => {
  if (!actionButtonCount.value) return 0
  const size = props.compact ? 26 : 22
  const gap = 4
  return actionButtonCount.value * size + Math.max(0, actionButtonCount.value - 1) * gap + 4
})
const isFavorite = computed(() => localFavoriteWeight.value != null)
const recentBadgeStyle = computed(() => ({
  right: props.isSystem ? '34px' : '6px',
}))
const actionsStyle = computed(() => ({
  right: `${6 + cornerBadgeWidth.value}px`,
}))
const tagsStyle = computed(() => ({
  right: `${10 + cornerBadgeWidth.value + actionWidth.value}px`,
}))
const headerStyle = computed(() => {
  const tagSpace = hasTags.value ? 150 : 0
  const padding = actionWidth.value + cornerBadgeWidth.value + tagSpace
  return padding > 0 ? { paddingRight: `${padding}px` } : {}
})

const formatTag = (tag: string) => tag
  .split('-')
  .filter(Boolean)
  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ')

const normalizeTag = (tag: string) => tag.trim().toLowerCase()
const effectIcons: Record<string, string> = {
  bold: 'B',
  italic: 'I',
  outline: 'O',
}
const effectIconFor = (tag: string) => effectIcons[normalizeTag(tag)] || ''

const loadFont = async (slug: string | undefined, url?: string) => {
  if (props.bitmapPreviewDescriptorUrl && props.bitmapPreviewAtlasUrl) {
    isReady.value = true
    return
  }
  if (!slug) {
    isReady.value = true
    return
  }

  isReady.value = false
  try {
    await fontStore.loadFont(slug, url)
  } catch (e) {
    console.error('fontStore.loadFont failed', e)
  } finally {
    isReady.value = true
  }
}

onMounted(() => {
  loadFont(props.fontFamily, props.fontUrl)
})

watch(
  () => [props.fontFamily, props.fontUrl, props.bitmapPreviewDescriptorUrl, props.bitmapPreviewAtlasUrl],
  ([newSlug, newUrl]) => {
    loadFont(newSlug || undefined, newUrl || undefined)
  }
)

watch(
  () => props.favoriteWeight,
  (value) => {
    localFavoriteWeight.value = value
  }
)

const onDelete = async () => {
  if (!canDeleteFont.value) {
    membershipGate.requirePremium('font.premiumAssetRequired')
    return
  }
  if (props.fontId == null) return
  try {
    await ElMessageBox({
      title: t('font.deleteFont'),
      message: h('div', null, [
        h('p', null, t('font.deleteFontConfirm')),
        h(FontPreviewText, {
          fontFamily: props.fontFamily,
          type: props.type,
          language: props.language,
          sectionName: props.sectionName,
          previewText: props.previewText,
          bitmapPreviewDescriptorUrl: props.bitmapPreviewDescriptorUrl,
          bitmapPreviewAtlasUrl: props.bitmapPreviewAtlasUrl,
        }),
      ]),
      type: 'warning',
      showCancelButton: true,
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
    })
  } catch {
    return
  }

  try {
    const resp = userStore.isAdminUser
      ? await removeAdminFont(props.fontId)
      : await removeMyFont(props.fontId)
    if (resp.code === 0 && resp.data) {
      emit('removed', props.fontId)
      ElMessage.success(t('common.deleteSuccess'))
    } else {
      ElMessage.error(resp.msg || t('common.deleteFailed'))
    }
  } catch (e) {
    // ignore errors here; parent can handle global errors if needed
    console.error('remove font failed', e)
    ElMessage.error(t('common.deleteFailed'))
  }
}

const onQuickEdit = () => {
  if (!canQuickEdit.value || props.fontId == null) return
  const location = resolveFontQuickEditLocation({
    id: props.fontId,
    type: props.type || '',
    slug: props.fontSlug || props.fontFamily,
  })
  if (location) void router.push(location)
}

const onEditSearchIndex = () => {
  if (props.fontId == null) return
  emit('editSearchIndex', props.fontId)
}

const onToggleFavorite = async () => {
  if (props.fontId == null || favoriteUpdating.value) return
  favoriteUpdating.value = true
  try {
    const res = isFavorite.value
      ? await unfavoriteFont(props.fontId)
      : await favoriteFont(props.fontId)
    const nextWeight = res.data?.favoriteWeight
    localFavoriteWeight.value = nextWeight
    emit('favoriteChanged', props.fontId, nextWeight)
  } catch (e) {
    console.warn('toggle font favorite failed', e)
    ElMessage.error(t('font.favoriteFailed'))
  } finally {
    favoriteUpdating.value = false
  }
}
</script>

<style scoped>
.font-main {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 82px;
  padding: 2px 4px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.58)),
    var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  box-shadow: var(--studio-shadow-sm);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.font-corner-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--studio-text-muted);
  box-shadow: none;
  opacity: 0.64;
  cursor: default;
  pointer-events: auto;
}

.font-corner-badge :deep(.el-icon),
.font-corner-badge .iconfont {
  font-size: 14px;
}

.font-system-badge {
  right: 6px;
}

:root[data-studio-theme='dark'] .font-main {
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.78), rgba(15, 23, 42, 0.42)),
    var(--studio-surface);
}

.font-main:hover {
  border-color: var(--studio-primary-border);
  box-shadow: var(--studio-shadow-md);
  transform: translateY(-1px);
}

.font-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px;
  min-height: 22px;
}

.font-title-group {
  display: inline-flex;
  align-items: flex-start;
  min-width: 0;
  gap: 8px;
  flex: 1 1 auto;
}

.font-identity {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.font-name {
  min-width: 0;
  max-width: 100%;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--studio-text-subtle);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.font-name-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.font-tags {
  position: absolute;
  top: 8px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
  align-items: center;
  max-width: min(42%, 150px);
}

.font-tags :deep(.el-tag) {
  height: 18px;
  padding: 0 7px;
  border-radius: 999px;
  font-weight: 650;
  background: var(--studio-surface-soft);
}

.font-effect-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 18px;
  border: 0;
  color: var(--studio-primary);
  background: transparent;
  font-family: var(--studio-font-ui);
  font-size: 13px;
  line-height: 18px;
  cursor: default;
}

.font-effect-icon-bold {
  font-weight: 800;
}

.font-effect-icon-italic {
  font-family: serif;
  font-style: italic;
  font-weight: 700;
}

.font-effect-icon-outline {
  color: transparent;
  font-weight: 800;
  -webkit-text-stroke: 1px var(--studio-primary);
}

.font-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--studio-border);
  border-radius: 6px;
  background: transparent;
  box-shadow: none;
  font-size: 13px;
  opacity: 0.72;
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease, opacity 160ms ease, transform 160ms ease;
}

.font-icon-btn-tag,
.font-icon-btn-edit,
.font-icon-btn-favorite {
  color: var(--studio-primary);
}

.font-icon-btn-favorite.favorited {
  color: #f5a524;
  opacity: 1;
}

.font-icon-btn-delete {
  color: var(--studio-danger);
}

.font-icon-btn-tag:hover,
.font-icon-btn-edit:hover,
.font-icon-btn-favorite:hover {
  background: transparent;
  border-color: var(--studio-primary-border);
  box-shadow: none;
  opacity: 1;
  transform: translateY(-1px);
}

.font-icon-btn-delete:hover {
  background: transparent;
  border-color: rgba(220, 38, 38, 0.28);
  box-shadow: none;
  opacity: 1;
  transform: translateY(-1px);
}

.font-icon-btn:active {
  transform: translateY(0);
}

.font-main :deep(.preview-text) {
  display: block;
  min-height: 42px;
  padding: 3px 0;
  overflow: visible;
  color: var(--studio-text);
  font-size: clamp(26px, 3.4vw, 36px);
  line-height: normal;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.font-main :deep(.preview-text-icon) {
  white-space: normal;
  word-break: break-all;
  font-size: 30px;
}

.font-main-compact {
  gap: 1px;
  min-height: 62px;
  padding: 2px 4px;
  border-radius: 7px;
  box-shadow: none;
}

.font-main-compact .font-header {
  min-height: 20px;
  padding-right: 50px;
}

.font-main-compact .font-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--studio-text-subtle);
}

.font-main-compact .font-title-group {
  gap: 7px;
}

.font-main-compact .font-tags :deep(.el-tag) {
  height: 18px;
  padding: 0 6px;
}

.font-main-compact .font-icon-btn {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  font-size: 13px;
}

.font-main-compact :deep(.preview-text) {
  min-height: 32px;
  padding: 2px 0;
  font-size: 25px;
  line-height: normal;
}

@media (prefers-reduced-motion: reduce) {
  .font-main,
  .font-icon-btn {
    transition: none;
  }

  .font-main:hover,
  .font-icon-btn:hover {
    transform: none;
  }
}

@media (max-width: 520px) {
  .font-main {
    min-height: 78px;
    padding: 2px 4px;
  }

  .font-main-compact {
    min-height: 60px;
  }

  .font-header {
    flex-wrap: wrap;
  }

  .font-tags {
    max-width: 100%;
    justify-content: flex-start;
  }
}
</style>
