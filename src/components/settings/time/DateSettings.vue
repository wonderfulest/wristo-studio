<template>
  <div class="settings-section">
    <div class="setting-item">
      <label>字体大小</label>
      <select v-model.number="props.element.fontSize" @change="updateElement({ fontSize: $event.target.value })">
        <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}px</option>
      </select>
    </div>
    <div class="setting-item">
      <label>字体颜色</label>
      <ColorPicker 
        v-model="props.element.fill" 
        @change="updateElement({ fill: $event })" 
      />
    </div>
    <div class="setting-item">
      <label>字体</label>
      <font-picker 
        v-model="props.element.fontFamily" 
        @change="updateElement({ fontFamily: $event })" 
      />
    </div>
    <div class="setting-item">
      <label>位置</label>
      <div class="position-inputs">
        <div>
          <span>X:</span>
          <input 
            type="number" 
            :value="Math.round(props.element.left)" 
            @change="updateElement({ left: Math.round($event.target.value) })" 
          />
        </div>
        <div>
          <span>Y:</span>
          <input 
            type="number" 
            :value="Math.round(props.element.top)" 
            @change="updateElement({ top: Math.round($event.target.value) })" 
          />
        </div>
      </div>
    </div>
    <div class="setting-item">
      <label>对齐方式</label>
      <div class="align-buttons">
        <button 
          v-for="align in originXOptions" 
          :key="align.value" 
          @click="updateElement({ originX: align.value })" 
          :class="{ active: props.element.originX === align.value }" 
          :title="align.label"
        >
          <i :class="align.icon"></i>
        </button>
      </div>
    </div>
    <div class="setting-item">
      <label>日期格式</label>
      <select 
        v-model="props.element.formatter" 
        @change="updateElement({ formatter: $event.target.value })"
      >
        <option 
          v-for="{ label, value, example } in DateFormatOptions" 
          :key="value" 
          :value="value" 
          :title="'例如: ' + example"
        >
          {{ label }} - 例如: {{ example }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useFontStore } from '@/stores/fontStore'
import { useDateStore } from '@/stores/elements/time/dateElement'
import { fontSizes, originXOptions, DateFormatOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/index.vue'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const fontStore = useFontStore()
const dateStore = useDateStore()

// 加载字体列表
onMounted(async () => {
  if (fontStore.fonts.length === 0) {
    await fontStore.fetchFonts()
  }
  // 如果有字体，预加载当前字体
  if (props.element.fontFamily) {
    await fontStore.loadFont(props.element.fontFamily)
  }
})

// 统一的更新方法
const updateElement = (config) => {
  dateStore.updateElement(props.element, config)
}
</script>

<style scoped>
@import '../../../assets/styles/settings.css';

.example-text {
  color: #555;
  margin-left: 1em;
}

.align-buttons .iconify {
  font-size: 18px;
}
</style>
