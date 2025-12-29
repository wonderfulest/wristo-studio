<template>
  <div class="settings-section">
    <el-form :model="props.element" label-position="left" label-width="100px">
      <el-form-item label="Font Size">
        <el-select v-model.number="props.element.fontSize" @change="(v) => updateElement({ fontSize: v })">
          <el-option v-for="size in fontSizes" :key="size" :label="`${size}px`" :value="size" />
        </el-select>
      </el-form-item>

      <el-form-item label="Font Color">
        <color-picker 
          v-model="props.element.fill" 
          @change="updateElement({ fill: $event })" 
        />
      </el-form-item>

      <el-form-item label="Font">
        <font-picker 
          v-model="props.element.fontFamily" 
          :type="fontTypeForTime"
          @change="updateElement({ fontFamily: $event })" 
        />
      </el-form-item>

      <el-form-item label="Position">
        <PositionInputs 
          :left="props.element.left"
          :top="props.element.top"
          @update:left="(v)=> props.element.left = v"
          @update:top="(v)=> props.element.top = v"
          @change="(p)=> updateElement({ left: Math.round(p.left), top: Math.round(p.top) })"
        />
      </el-form-item>

      <el-form-item label="Alignment">
        <AlignXButtons 
          :options="originXOptions"
          v-model="props.element.originX"
          @update:modelValue="(val) => updateElement({ originX: val })"
        />
      </el-form-item>

      <el-form-item label="Time Format">
        <el-select 
          v-model.number="props.element.formatter" 
          @change="(v) => updateElement({ formatter: v })"
        >
          <el-option 
            v-for="{ label, value, example } in TimeFormatOptions" 
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

<script setup>
import { onMounted, computed } from 'vue'
import { useFontStore } from '@/stores/fontStore'
import { useTimeStore } from '@/stores/elements/time/timeElement'
import { fontSizes, originXOptions, TimeFormatOptions, TimeFormatConstants } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import AlignXButtons from '@/settings/common/AlignXButtons.vue'
import PositionInputs from '@/settings/common/PositionInputs.vue'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const fontStore = useFontStore()
const timeStore = useTimeStore()

const fontTypeForTime = computed(() => {
  const fmt = props.element.formatter
  const hourOrMinuteFormats = [
    TimeFormatConstants.HH_MM,
    TimeFormatConstants.HH_MM_SS,
    TimeFormatConstants.HH,
    TimeFormatConstants.MM,
    TimeFormatConstants.HH_COLON,
    TimeFormatConstants.COLON_MM,
  ]
  return hourOrMinuteFormats.includes(fmt) ? 'number_font' : 'text_font'
})

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
  timeStore.updateElement(props.element, config)
}
</script>

<style scoped>
@import '@/assets/styles/settings.css';

</style>
