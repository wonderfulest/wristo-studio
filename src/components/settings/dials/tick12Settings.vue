<template>
  <div class="settings-section">
    <h3>表盘刻度设置</h3>

    <el-form ref="formRef" :model="element" label-position="left" label-width="100px">
      <!-- 刻度样式选择 -->
      <div class="setting-item">
        <label>刻度样式</label>
        <DialPicker
          :selected-url="element.imageUrl" 
          :available-ticks="availableTicks"
          :on-select="(url) => tick12Store.updateSVG(element, { imageUrl: url })"
          :on-upload="(url, fileName) => {
            // 检查是否已存在相同名称的指针
            const existingIndex = availableTicks.findIndex(tick => tick.name === fileName.replace('.svg', ''))
            if (existingIndex !== -1) {
              // 如果已存在，更新URL
              availableTicks[existingIndex].url = url
            } else {
              // 如果不存在，添加到列表
              availableTicks.push({
                name: fileName.replace('.svg', ''),
                url: url
              })
            }
            // 更新画布
            tick12Store.updateSVG(element, { imageUrl: url })
          }"
        />
        <div class="tips">
          <p>小贴士：</p>
          <ul>
            <li>仅支持上传 SVG 格式文件</li>
            <li>刻度颜色应为黑色，背景为白色或透明</li>
            <li>建议使用正方形尺寸的 SVG 文件</li>
          </ul>
        </div>
      </div>
      <!-- 位置设置 -->
      <div class="setting-item">
        <label>位置</label>
        <div class="position-inputs">
          <div class="input-group">
            <label>X</label>
            <input type="number" :value="element.left" @input="(e) => (element.left = Number(e.target.value))" @change="updatePosition" />
          </div>
          <div class="input-group">
            <label>Y</label>
            <input type="number" :value="element.top" @input="(e) => (element.top = Number(e.target.value))" @change="updatePosition" />
          </div>
        </div>
      </div>
      <!-- 尺寸设置 -->
      <div class="setting-item">
        <label>尺寸</label>
        <div class="scale-inputs">
          <div class="scale-input">
            <label>宽度</label>
            <input type="number" :value="element.width" @input="(e) => (element.width = Number(e.target.value))" @change="updateSize" />
          </div>
          <div class="scale-input">
            <label>高度</label>
            <input type="number" :value="element.height" @input="(e) => (element.height = Number(e.target.value))" @change="updateSize" />
          </div>
        </div>
      </div>
      
      <!-- 颜色设置 -->
      <div class="setting-item">
        <label>刻度颜色</label>
        <ColorPicker
          v-model="element.fill"
          @change="
            (val) => {
              tick12Store.updateElement(element, {
                fill: val
              })
            }
          " />
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, defineEmits, defineExpose } from 'vue'
import { useTick12Store } from '@/stores/elements/dials/Tick12Element'
import { ElMessage } from 'element-plus'
import ColorPicker from '@/components/color-picker/index.vue'
import DialPicker from '@/components/dial-picker/index.vue'
import { Ticks12Options } from '@/config/settings'
const emit = defineEmits(['close'])

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const tick12Store = useTick12Store()
const formRef = ref(null)

// 可用刻度资源列表
const availableTicks = ref(Ticks12Options)

// 更新位置
const updatePosition = () => {
  if (!props.element) return
  tick12Store.updateElement(props.element, {
    left: props.element.left,
    top: props.element.top
  })
}

// 更新尺寸
const updateSize = () => {
  if (!props.element) return
  tick12Store.updateElement(props.element, {
    width: props.element.width,
    height: props.element.height
  })
}

// 更新颜色
const updateColor = () => {
  if (!props.element) return
  tick12Store.updateElement(props.element, {
    fill: props.element.fill
  })
}

// 处理选择
const handleSelect = (url) => {
  tick12Store.updateSVG(props.element, { imageUrl: url })
}

// 处理上传
const handleUpload = async ({ file, content }) => {
  try {
    // 生成唯一文件名
    const fileName = `tick-12-${Date.now()}.svg`
    
    // 上传到服务器或保存到本地
    // TODO: 实现文件保存逻辑
    
    // 添加到可用刻度列表
    availableTicks.value.push({
      name: fileName.replace('.svg', ''),
      url: URL.createObjectURL(file)
    })

    // 更新画布
    tick12Store.updateSVG(props.element, { imageUrl: URL.createObjectURL(file) })

    ElMessage.success('上传成功')
  } catch (error) {
    ElMessage.error('上传失败')
    console.error('Upload error:', error)
  }
}

// 添加关闭时的验证方法
const handleClose = async () => {
  try {
    await formRef.value.validate()
    emit('close')
  } catch (error) {
    ElMessage.warning('请先完成必填项设置')
  }
}

// 暴露方法给父组件
defineExpose({
  formRef,
  handleClose
})
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.setting-item {
  margin-bottom: 16px;
}

.position-inputs {
  display: flex;
  gap: 8px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-group label {
  min-width: 20px;
}

.input-group input {
  width: 60px;
}

.scale-inputs {
  display: flex;
  gap: 8px;
}

.scale-input {
  display: flex;
  align-items: center;
  gap: 4px;
}

.scale-input label {
  min-width: 20px;
}

.scale-input input {
  width: 60px;
}

.color-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input input {
  width: 120px;
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.tips {
  margin-top: 8px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.tips p {
  margin: 0 0 4px 0;
  font-weight: 500;
}

.tips ul {
  margin: 0;
  padding-left: 16px;
}

.tips li {
  margin: 2px 0;
  line-height: 1.4;
}
</style>
