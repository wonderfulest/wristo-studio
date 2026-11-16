<template>
  <section v-if="elements.length" class="dynamic-theme-assets">
    <h4>{{ t('visualTheme.dynamicImages') }}</h4>
    <p>{{ t('visualTheme.dynamicImagesHint') }}</p>
    <div v-for="element in elements" :key="element.id">
      <h5>{{ element.name || element.id }}</h5>
      <div class="frames">
        <div v-for="(item, index) in element.items" :key="item.id">
          <div class="frame-header">
            <span>{{ item.name || `${Number(index) + 1}` }}</span>
            <el-button v-if="theme.dynamicImages?.[element.id]?.[item.id]" text size="small"
              @click="emit('update', String(element.id), String(item.id), null)">
              {{ t('visualTheme.clearAsset') }}
            </el-button>
          </div>
          <AssetPicker asset-type="image"
            :selected-url="theme.dynamicImages?.[element.id]?.[item.id]?.imageUrl || item.imageUrl || ''"
            :selected-asset-id="theme.dynamicImages?.[element.id]?.[item.id]?.assetId ?? undefined"
            :on-select="(url, asset) => select(String(element.id), String(item.id), url, asset)"
            :on-upload="(url, asset) => select(String(element.id), String(item.id), url, asset)" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import AssetPicker from '@/components/asset-picker/index.vue'
import { useI18n } from '@/i18n'
import type { AnalogAssetVO } from '@/types/api/analog-asset'
import type { VisualTheme, VisualThemeAssetRef } from '@/types/visualTheme'
defineProps<{ theme: VisualTheme; elements: Record<string, any>[] }>()
const emit = defineEmits<{ update: [elementId: string, itemId: string, asset: VisualThemeAssetRef | null] }>()
const { t } = useI18n()
function select(elementId: string, itemId: string, url: string, asset: AnalogAssetVO) {
  emit('update', elementId, itemId, {
    assetId: Number.isInteger(asset?.id) ? asset.id : null,
    imageUrl: asset?.file?.url || asset?.file?.previewUrl || url || null,
  })
}
</script>

<style scoped>
.dynamic-theme-assets { display: grid; gap: 10px; }
h4, h5, p { margin: 0; }
p { font-size: 12px; color: var(--studio-text-muted); }
.frames { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 8px; }
.frame-header { display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
</style>
