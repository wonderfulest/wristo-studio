<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item label="Font Size">
        <el-select
          v-model.number="currentModel.fontSize"
          @change="(v: number) => applyUpdate({ fontSize: v })"
        >
          <el-option v-for="size in fontSizes" :key="size" :label="`${size}px`" :value="size" />
        </el-select>
      </el-form-item>

      <el-form-item label="Font Color">
        <ColorPicker
          v-model="currentModel.fill"
          @change="applyUpdate({ fill: $event })"
        />
      </el-form-item>

      <el-form-item label="Font">
        <FontPicker
          v-model="currentModel.fontFamily"
          @change="applyUpdate({ fontFamily: $event })"
        />
      </el-form-item>

      <el-form-item label="Alignment">
        <AlignXButtons
          :options="originXOptions"
          v-model="originXProxy"
        />
      </el-form-item>

      <el-form-item label="Date Format">
        <el-select
          v-model.number="currentModel.formatter"
          @change="(v: number) => applyUpdate({ formatter: v })"
        >
          <el-option
            v-for="{ label, value, example } in DateFormatOptions"
            :key="value"
            :label="label"
            :value="value"
            :title="'e.g.: ' + example"
          >
            {{ label }} - e.g.: {{ example }}
          </el-option>
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useFontStore } from '@/stores/fontStore'
import { fontSizes, originXOptions, DateFormatOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'

const props = defineProps<{
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const fontStore = useFontStore()

const currentModel = computed<any>(() => {
  return props.config ?? {}
})

const originXProxy = computed<string>({
  get() {
    const v = (currentModel.value as any).originX
    return (v as string) || 'center'
  },
  set(v: string) {
    applyUpdate({ originX: v })
  },
})

onMounted(async () => {
  if (fontStore.fonts.length === 0) {
    await fontStore.fetchFonts()
  }
  const family = (currentModel.value as any).fontFamily
  if (family) {
    await fontStore.loadFont(family)
  }
})

const applyUpdate = (patch: Record<string, any>) => {
  props.applyPatch?.(patch)
}
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.settings-section {
  padding: 16px;
}
</style>
