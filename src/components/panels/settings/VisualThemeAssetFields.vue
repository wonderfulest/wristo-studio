<template>
  <section class="asset-fields">
    <h4>{{ t('visualTheme.assets') }}</h4>
    <div class="asset-grid">
      <div v-for="field in fields" :key="field.slot" class="asset-field">
        <div class="asset-field-header">
          <span>{{ t(field.label) }}</span>
          <el-button
            v-if="theme.assets[field.slot]"
            text
            size="small"
            :data-clear-slot="field.slot"
            :aria-label="t('visualTheme.clearAssetAria', { name: t(field.label) })"
            @click="emit('updateAsset', field.slot, null)"
          >
            {{ t('visualTheme.clearAsset') }}
          </el-button>
        </div>
        <AssetPicker
          :selected-url="theme.assets[field.slot]?.imageUrl || ''"
          :selected-asset-id="theme.assets[field.slot]?.assetId ?? undefined"
          :asset-type="field.assetType"
          :on-select="(url, asset) => selectAsset(field.slot, url, asset)"
          :on-upload="(url, asset) => selectAsset(field.slot, url, asset)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import AssetPicker from '@/components/asset-picker/index.vue'
import { useI18n } from '@/i18n'
import type { AnalogAssetType, AnalogAssetVO } from '@/types/api/analog-asset'
import type { VisualTheme, VisualThemeAssetRef, VisualThemeAssetSlot } from '@/types/visualTheme'

const props = defineProps<{ theme: VisualTheme }>()
const emit = defineEmits<{
  updateAsset: [slot: VisualThemeAssetSlot, asset: VisualThemeAssetRef | null]
}>()
const { t } = useI18n()

const fields: Array<{ slot: VisualThemeAssetSlot; label: string; assetType: AnalogAssetType }> = [
  { slot: 'background', label: 'visualTheme.background', assetType: 'image' },
  { slot: 'hourHand', label: 'visualTheme.hourHand', assetType: 'hour' },
  { slot: 'minuteHand', label: 'visualTheme.minuteHand', assetType: 'minute' },
  { slot: 'secondHand', label: 'visualTheme.secondHand', assetType: 'second' },
  { slot: 'centerCap', label: 'visualTheme.centerCap', assetType: 'center_cap' },
]

const selectAsset = (slot: VisualThemeAssetSlot, url: string, asset: AnalogAssetVO) => {
  const originalUrl = asset?.file?.url || asset?.file?.previewUrl || url
  const next: VisualThemeAssetRef = {
    assetId: Number.isInteger(asset?.id) ? asset.id : null,
    imageUrl: originalUrl || null,
  }
  if (slot === 'centerCap' && props.theme.assets.centerCap?.targetSize) {
    next.targetSize = props.theme.assets.centerCap.targetSize
  }
  emit('updateAsset', slot, next)
}
</script>

<style scoped>
.asset-fields {
  display: grid;
  gap: 10px;
}

.asset-fields h4 {
  margin: 0;
  font-size: 13px;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.asset-field {
  display: grid;
  gap: 6px;
  color: var(--studio-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.asset-field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

@media (max-width: 720px) {
  .asset-grid {
    grid-template-columns: 1fr;
  }
}
</style>
