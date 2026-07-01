<template>
  <section class="bilingual-font-panel">
    <div class="panel-header">
      <div>
        <h4>Bilingual fonts</h4>
        <p>Configure English and Chinese font resources for this watch face.</p>
      </div>
      <el-checkbox v-model="chineseEnabled" @change="syncLocales">Chinese</el-checkbox>
    </div>

    <div class="font-grid">
      <label>Font role</label>
      <el-input v-model="fontRole" size="small" @change="syncRole" />

      <label>English font</label>
      <font-picker
        v-model="englishFontFamily"
        :type="FontTypes.TEXT_FONT"
        @change="updateEnglishFont"
      />

      <label>Chinese font</label>
      <font-picker
        v-model="chineseFontFamily"
        :type="FontTypes.TEXT_FONT_PT"
        date-content-language="zh"
        @change="updateChineseFont"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import { FontTypes } from '@/config/fonts'
import { useDesignStore } from '@/stores/designStore'

const designStore = useDesignStore()

const fontRole = ref('LabelFont')
const chineseEnabled = ref(designStore.supportedLocales.includes('zh-CN'))
const englishFontFamily = ref(designStore.fontRoles.LabelFont?.['en-US']?.fontFamily || '')
const chineseFontFamily = ref(designStore.fontRoles.LabelFont?.['zh-CN']?.fontFamily || '')

function syncLocales() {
  designStore.setSupportedLocales(chineseEnabled.value ? ['en-US', 'zh-CN'] : ['en-US'])
}

function syncRole() {
  if (!fontRole.value.trim()) {
    fontRole.value = 'LabelFont'
  }
  updateEnglishFont()
  updateChineseFont()
}

function updateEnglishFont() {
  designStore.setLocaleFontRole(fontRole.value, 'en-US', {
    textMode: 'bitmapFont',
    fontFamily: englishFontFamily.value || undefined,
  })
}

function updateChineseFont() {
  designStore.setLocaleFontRole(fontRole.value, 'zh-CN', {
    ...(designStore.fontRoles[fontRole.value]?.['zh-CN'] || {}),
    textMode: 'bitmapFont',
    fontFamily: chineseFontFamily.value || undefined,
  })
}

watch(chineseEnabled, syncLocales)
watch(englishFontFamily, updateEnglishFont)
watch(chineseFontFamily, updateChineseFont)
</script>

<style scoped>
.bilingual-font-panel {
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.panel-header h4 {
  margin: 0 0 4px;
  font-size: 14px;
}

.panel-header p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.font-grid {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

</style>
