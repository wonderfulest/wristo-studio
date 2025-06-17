<template>
  <div class="settings-section">
    <div class="setting-item">
      <label>更换图片</label>
      <el-upload class="avatar-uploader" action="#" :show-file-list="false" :before-upload="beforeUpload" :http-request="handleCustomUpload" :drag="true" @drop.prevent>
        <img v-if="imageUrl" :src="imageUrl" class="avatar" />
        <el-icon v-else class="avatar-uploader-icon">
          <Plus />
        </el-icon>
      </el-upload>
    </div>

    <div class="setting-item">
      <label>位置</label>
      <div class="position-inputs">
        <div>
          <span>X:</span>
          <input type="number" v-model.number="positionX" @change="updatePosition" />
        </div>
        <div>
          <span>Y:</span>
          <input type="number" v-model.number="positionY" @change="updatePosition" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useBaseStore } from '@/stores/baseStore'
import { FabricImage } from 'fabric'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const baseStore = useBaseStore()

// 响应式状态
const imageUrl = ref('')
const positionX = ref(Math.round(props.element?.left || 0))
const positionY = ref(Math.round(props.element?.top || 0))

// 图片上传前的验证
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

// 自定义上传处理
const handleCustomUpload = async (options) => {
  const file = options.file
  const localUrl = URL.createObjectURL(file)
  imageUrl.value = localUrl

  if (props.element && baseStore.canvas) {
    // Create a temporary image to get original dimensions
    const img = new Image()
    img.src = localUrl
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      // Get canvas dimensions
      const canvasSize = baseStore.WATCH_SIZE

      // Calculate scale to fit canvas
      const scale = Math.min(canvasSize / img.width, canvasSize / img.height)

      props.element.set({
        scaleX: scale,
        scaleY: scale
      })

      props.element.setSrc(localUrl, () => {
        // Move image to second-to-last layer (above background circle)
        baseStore.canvas.moveTo(props.element, 1)

        // Render canvas
        baseStore.canvas.renderAll()
      })
    }
  }
}

// 更新位置
const updatePosition = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set({
    left: positionX.value,
    top: positionY.value
  })
  baseStore.canvas.renderAll()
}

// 监听画布上的对象变化
watch(
  () => props.element?.left,
  (newLeft) => {
    if (newLeft !== undefined) {
      positionX.value = Math.round(newLeft)
    }
  }
)

watch(
  () => props.element?.top,
  (newTop) => {
    if (newTop !== undefined) {
      positionY.value = Math.round(newTop)
    }
  }
)
</script>

<style scoped>
@import '../../assets/styles/settings.css';

.avatar-uploader {
  text-align: center;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.avatar-uploader:hover {
  border-color: var(--el-color-primary);
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  text-align: center;
  line-height: 100px;
}

.avatar {
  width: 100px;
  height: 100px;
  display: block;
  object-fit: cover;
}

.avatar-uploader :deep(.el-upload-dragger) {
  width: 100px;
  height: 100px;
  padding: 0;
}

.avatar-uploader :deep(.el-upload-dragger.is-dragover) {
  background-color: rgba(var(--el-color-primary-rgb), 0.1);
  border-color: var(--el-color-primary);
}
</style>
