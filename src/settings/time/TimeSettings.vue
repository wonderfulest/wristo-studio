<template>
  <div class="settings-section">
    <el-form :model="props.element" label-position="left" label-width="100px">
      <el-form-item label="Font Type">
        <el-radio-group v-model="fontRenderType">
          <el-radio label="truetype">truetype font</el-radio>
          <el-radio label="bitmap">bitmap font</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="Font">
        <template v-if="fontRenderType === 'truetype'">
          <font-picker 
            v-model="safeFontFamily" 
            :type="FontTypes.TEXT_FONT"
            @change="updateElement({ fontFamily: $event })" 
          />
        </template>
        <template v-else>
          <BitmapFontPicker
            v-model="props.element.bitmapFontId"
            @change="updateElement({ fontRenderType: 'bitmap', bitmapFontId: $event })"
          />
        </template>
      </el-form-item>
      <el-form-item label="Font Size">
        <el-select v-model.number="props.element.fontSize" @change="(v) => updateElement({ fontSize: v })">
          <el-option v-for="size in fontSizes" :key="size" :label="`${size}px`" :value="size" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="fontRenderType === 'bitmap'" label="Font Gap">
        <el-input-number
          v-model.number="props.element.fontGap"
          :min="0"
          :max="100"
          @change="(v) => updateElement({ fontGap: v })"
        />
      </el-form-item>
      <el-form-item label="Alignment">
        <AlignXButtons 
          :options="originXOptions"
          v-model="props.element.originX"
          @update:modelValue="(val) => updateElement({ originX: val })"
        />
      </el-form-item>
      <el-form-item label="Font Color">
        <color-picker 
          v-model="props.element.fill" 
          @change="updateElement({ fill: $event })" 
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
import BitmapFontPicker from '@/components/font-picker/BitmapFontPicker.vue'
import AlignXButtons from '@/settings/common/AlignXButtons.vue'
import PositionInputs from '@/settings/common/PositionInputs.vue'
import { FontTypes } from '@/constants/fonts'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const fontStore = useFontStore()
const timeStore = useTimeStore()

// 字体渲染类型：truetype / bitmap，优先使用元素上已有配置，默认 truetype
const fontRenderType = computed({
  get() {
    const v = props.element.fontRenderType
    return v === 'bitmap' ? 'bitmap' : 'truetype'
  },
  set(v) {
    props.element.fontRenderType = v
    // 从 bitmap 切回 truetype 时，如果没有字体，给一个默认字体，并同步到画布
    if (v === 'truetype') {
      if (!props.element.fontFamily) {
        props.element.fontFamily = 'roboto-condensed-regular'
      }
      updateElement({ fontRenderType: 'truetype', fontFamily: props.element.fontFamily })
    } else {
      // 切到 bitmap 时，同步 fontRenderType，bitmapFontId 通过 BitmapFontPicker 再更新
      updateElement({ fontRenderType: 'bitmap' })
    }
  }
})

// truetype 下使用的安全字体 family，避免传入 undefined
const safeFontFamily = computed({
  get() {
    return props.element.fontFamily || 'roboto-condensed-regular'
  },
  set(v) {
    props.element.fontFamily = v
  }
})

// 加载字体列表
onMounted(async () => {
  if (fontStore.fonts.length === 0) {
    await fontStore.fetchFonts()
  }
  // 如果有字体，预加载当前字体
  if (safeFontFamily.value) {
    await fontStore.loadFont(safeFontFamily.value)
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
