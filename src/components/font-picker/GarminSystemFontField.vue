<template>
  <div class="garmin-system-font-field">
    <el-select
      :model-value="selectedValue"
      filterable
      placeholder="Select font source"
      @update:model-value="handleSelection"
    >
      <el-option label="Asset font" value="asset" />
      <el-option-group label="Garmin system fonts">
        <el-option
          v-for="font in fonts"
          :key="font.symbol"
          :label="`${font.symbol} · ${font.face} (${font.size}px)`"
          :value="font.symbol"
        />
      </el-option-group>
    </el-select>
    <span v-if="isSystemFont" class="system-font-note">
      Size and family follow the selected device and preview language.
    </span>
    <span v-else-if="fonts.length === 0" class="system-font-note warning">
      System font data is unavailable for the selected device.
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useDesignStore } from '@/stores/designStore'
import { listGarminSystemFonts } from '@/utils/garminSystemFonts'
import { buildGarminFontSelectionPatch } from './garminSystemFontField'

const props = defineProps<{
  fontSource?: 'asset' | 'system'
  systemFont?: string
}>()

const emit = defineEmits<{
  (event: 'change', patch: { fontSource: 'asset' | 'system'; systemFont?: string }): void
}>()

const userStore = useUserStore()
const designStore = useDesignStore()
const selectedValue = computed(() => props.fontSource === 'system' && props.systemFont
  ? props.systemFont
  : 'asset')
const isSystemFont = computed(() => selectedValue.value !== 'asset')
const fonts = computed(() => {
  const device = userStore.userInfo?.device
  return listGarminSystemFonts({
    deviceId: device?.deviceId || '',
    hardwarePartNumber: device?.hardwarePartNumber,
    partNumber: device?.partNumber,
    locale: designStore.defaultLocale,
  })
})

const handleSelection = (value: string) => emit('change', buildGarminFontSelectionPatch(value))
</script>

<style scoped>
.garmin-system-font-field { display: grid; gap: 6px; width: 100%; }
.system-font-note { color: var(--studio-text-subtle); font-size: 11px; line-height: 1.35; }
.system-font-note.warning { color: var(--studio-warning, #b7791f); }
</style>
