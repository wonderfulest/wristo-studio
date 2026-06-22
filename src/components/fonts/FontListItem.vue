<template>
  <div class="font-main" :class="{ 'font-main-compact': compact }" v-if="isReady">
    <div class="font-header" v-if="label || hasTags || fontId != null">
      <div class="font-title-group">
        <div class="font-name" v-if="label">{{ label }}</div>
        <div class="font-name-actions" v-if="fontId != null">
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
            v-if="!isSystem && canManageFont && fontId != null"
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
      <div class="font-tags" v-if="hasTags">
        <el-tooltip v-if="isSystem" :content="t('font.systemFont')" placement="top">
          <el-tag size="small" type="info" class="system-icon-tag">
            <i class="iconfont icon-system"></i>
          </el-tag>
        </el-tooltip>
        <el-tag v-if="isMonospace" size="small" effect="plain">Mono</el-tag>
        <el-tag
          v-for="tag in visibleStyleTags"
          :key="tag"
          size="small"
          effect="plain"
        >
          {{ formatTag(tag) }}
        </el-tag>
        <!-- <el-tag v-if="isMonospace" size="small">
          <el-icon><Rank /></el-icon>
        </el-tag>
        <el-tag v-if="subfamily" size="small" effect="plain">
          <el-icon><CollectionTag /></el-icon>
        </el-tag> -->
      </div>
      <div class="font-actions" v-if="fontId != null">
        <button
          v-if="!isSystem && canManageFont && isIcon"
          type="button"
          class="font-icon-btn font-icon-btn-edit"
          title="Edit icon font"
          aria-label="Edit icon font"
          @click.stop="onEditIcon"
        >
          <el-icon><Edit /></el-icon>
        </button>
      </div>
    </div>
    <FontPreviewText
      :font-family="fontFamily"
      :type="type"
      :section-name="sectionName"
      :font-url="fontUrl"
      :preview-text="previewText"
    />
  </div>
  <div v-else class="font-main" :class="{ 'font-main-compact': compact }">
    <div class="font-header">
      <div class="font-name">{{ t('font.loading') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElTag, ElMessageBox } from 'element-plus'
import { CollectionTag, Edit, Delete } from '@element-plus/icons-vue'
import FontPreviewText from '@/components/fonts/FontPreviewText.vue'
import { useUserStore } from '@/stores/user'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import { removeMyFont } from '@/api/wristo/fonts'
import { FontTypes } from '@/config/fonts'
import { useFontStore } from '@/stores/fontStore'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  label?: string
  fontFamily: string
  type?: string
  sectionName?: string
  isSystem?: boolean
  isMonospace?: boolean
  subfamily?: string
  fontId?: number
  fontUrl?: string
  styleTags?: string | string[]
  canEditSearchIndex?: boolean
  previewText?: string
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'removed', id: number): void
  (e: 'editSearchIndex', id: number): void
}>()

const isReady = ref(false)

const router = useRouter()
const fontStore = useFontStore()
const userStore = useUserStore()
const membershipGate = useStudioMembershipGate()

const isIcon = computed(() => props.type === FontTypes.ICON_FONT || props.sectionName === 'icon')

const parsedStyleTags = computed(() => {
  const raw = props.styleTags
  const list = Array.isArray(raw) ? raw : String(raw || '').split(/[,，\s]+/)
  return list.map(tag => tag.trim()).filter(Boolean)
})
const visibleStyleTags = computed(() => parsedStyleTags.value.slice(0, 3))
const hasTags = computed(() => props.isSystem || props.isMonospace || !!props.subfamily || visibleStyleTags.value.length > 0)
const canManageFont = computed(() => userStore.canUsePremiumStudioAssets)

const formatTag = (tag: string) => tag
  .split('-')
  .filter(Boolean)
  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ')

const loadFont = async (slug: string | undefined, url?: string) => {
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
  () => [props.fontFamily, props.fontUrl],
  ([newSlug, newUrl]) => {
    loadFont(newSlug, newUrl)
  }
)

const onDelete = async () => {
  if (!canManageFont.value) {
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
          sectionName: props.sectionName,
          previewText: props.previewText,
        }),
      ]),
      type: 'warning',
      showCancelButton: true,
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
    })

    const resp = await removeMyFont(props.fontId)
    if (resp.code === 0 && resp.data) {
      emit('removed', props.fontId)
    }
  } catch (e) {
    // ignore errors here; parent can handle global errors if needed
    console.error('remove font failed', e)
  }
}

const onEditIcon = () => {
  if (!canManageFont.value) {
    membershipGate.requirePremium('font.premiumAssetRequired')
    return
  }
  // Use glyphCode to open the corresponding tab in IconLibrary.
  // For icon fonts, the glyphCode is encoded in the font family name.
  router.push({
    path: '/icon-library',
    query: {
      glyphCode: props.fontFamily,
    },
  })
}

const onEditSearchIndex = () => {
  if (props.fontId == null) return
  emit('editSearchIndex', props.fontId)
}
</script>

<style scoped>
.font-main {
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
  align-items: center;
  min-width: 0;
  gap: 4px;
  flex: 1 1 auto;
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
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 2px;
}

.font-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
  max-width: 42%;
}

.font-tags :deep(.el-tag) {
  height: 18px;
  padding: 0 7px;
  border-radius: 999px;
  font-weight: 650;
  background: var(--studio-surface-soft);
}

.font-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 2px;
}

.font-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--studio-surface-soft);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.42) inset;
  font-size: 15px;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.font-icon-btn-tag,
.font-icon-btn-edit {
  color: var(--studio-primary);
}

.font-icon-btn-delete {
  color: var(--studio-danger);
}

.font-icon-btn-tag:hover,
.font-icon-btn-edit:hover {
  background: var(--studio-primary-soft);
  border-color: var(--studio-primary-border);
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
  transform: translateY(-1px);
}

.font-icon-btn-delete:hover {
  background: rgba(220, 38, 38, 0.1);
  border-color: rgba(220, 38, 38, 0.28);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
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
}

.font-main-compact .font-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--studio-text-subtle);
}

.font-main-compact .font-title-group {
  gap: 3px;
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
