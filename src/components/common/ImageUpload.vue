<template>
  <div class="image-upload">
    <el-upload
      class="upload"
      :show-file-list="false"
      :http-request="doUpload"
      :before-upload="beforeUpload"
      accept="image/*"
      :disabled="uploading"
    >
      <div
        class="box"
        :class="{ 'is-drag-over': dragOver }"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <div v-if="previewUrl" class="img">
          <el-image :src="previewUrl" fit="cover" style="width: 100%; height: 100%" />
        </div>
        <div v-else class="placeholder">+</div>

        <div v-if="ratioTip" class="ratio-tip" :title="ratioTip">{{ ratioTip }}</div>

        <div v-if="uploading" class="mask">Uploading...</div>
        <el-button
          v-if="previewUrl"
          class="clear"
          type="danger"
          circle
          size="small"
          :disabled="uploading"
          @click.stop="clear"
        >
          ×
        </el-button>
      </div>
    </el-upload>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadImage } from '@/api/image'
import { IMAGE_ASPECT_ENUM_NAME, useEnumStore } from '@/stores/common'

const extractRatio = (it) => {
  const candidates = [it?.props?.ratio, it?.ratio, it?.category, it?.description, it?.name, it?.value]
    .filter((x) => typeof x === 'string')
    .join(' ')
  const m = candidates.match(/(\d+)\s*:\s*(\d+)/)
  if (!m) return ''
  return `${m[1]}:${m[2]}` 
}

const props = defineProps({
  modelValue: {
    type: Number,
    default: undefined,
  },
  maxSizeMB: {
    type: Number,
    default: 10,
  },
  previewUrl: {
    type: String,
    default: '',
  },
  aspectCode: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'uploaded'])

const uploading = ref(false)
const preview = ref('')
const dragOver = ref(false)

const previewUrl = computed(() => preview.value)

const aspectRatioMap = ref({})
const aspectEnumCodes = ref([])

const enumStore = useEnumStore()

const validAspectCodes = computed(() => aspectEnumCodes.value)

const ensureAspectCodeValid = async () => {
  const code = props.aspectCode
  // 如果没有传入 aspectCode，则不做校验，直接通过
  if (!code) return true

  await initAspectRatioMap()
  const ok = validAspectCodes.value.includes(code)
  if (!ok) {
    ElMessage.error(`Invalid aspectCode: ${code}`)
  }
  return ok
}

const initAspectRatioMap = async () => {
  if (Object.keys(aspectRatioMap.value).length > 0) return
  const list = await enumStore.getEnumOptions(IMAGE_ASPECT_ENUM_NAME)
  const map = {}
  const codes = []
  for (const it of list || []) {
    const code = it && it.value
    if (!code || typeof code !== 'string') continue
    codes.push(code)
    const ratio = extractRatio(it)
    map[code] = ratio || '1:1'
  }
  aspectRatioMap.value = map
  aspectEnumCodes.value = codes
}

// 根据当前 aspectCode 对应的理想比例，对图片实际宽高做校验，允许 1% 误差
const ensureImageAspectValid = async (file) => {
  const code = props.aspectCode
  if (!code) return true

  await initAspectRatioMap()
  const ratio = aspectRatioMap.value[code] || '1:1'
  const [w, h] = ratio.split(':').map((x) => Number(x))
  if (!w || !h) return true

  const expected = w / h

  const url = URL.createObjectURL(file)
  try {
    const actual = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        if (!img.naturalWidth || !img.naturalHeight) {
          reject(new Error('Failed to get image dimensions'))
          return
        }
        resolve(img.naturalWidth / img.naturalHeight)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = url
    })

    const diff = Math.abs(actual - expected) / expected
    if (diff > 0.01) {
      const actualRatio = `${Math.round(actual * 100) / 100}:1`
      ElMessage.error(`Image aspect ratio should be close to ${ratio}, current is approximately ${actualRatio}`)
      return false
    }
    return true
  } finally {
    URL.revokeObjectURL(url)
  }
}

const aspectRatioCss = computed(() => {
  const ratio = props.aspectCode ? aspectRatioMap.value[props.aspectCode] : undefined
  const r = ratio || '1:1'
  const [w, h] = r.split(':').map((x) => Number(x))
  if (!w || !h) return '1 / 1'
  return `${w} / ${h}` 
})

const ratioTip = computed(() => {
  if (!props.aspectCode) return ''
  const ratio = aspectRatioMap.value[props.aspectCode] || '1:1'
  return `${ratio}` 
})

onMounted(async () => {
  await initAspectRatioMap()
})

watch(
  () => props.aspectCode,
  async (v) => {
    if (v) {
      await initAspectRatioMap()
    }
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  (v) => {
    if (!v) {
      preview.value = ''
      return
    }
    if (!preview.value && props.previewUrl) {
      preview.value = props.previewUrl
    }
  }
)

watch(
  () => props.previewUrl,
  (u) => {
    if (u) {
      preview.value = u
      return
    }
    if (!props.modelValue) {
      preview.value = ''
    }
  },
  { immediate: true }
)

const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('Only image files are allowed')
    return false
  }
  const max = props.maxSizeMB || 10
  const sizeOk = file.size / 1024 / 1024 <= max
  if (!sizeOk) {
    ElMessage.error(`Image size must not exceed ${max}MB`)
    return false
  }
  return true
}

const uploadRawFile = async (raw) => {
  if (!beforeUpload(raw)) return

  const ok = await ensureAspectCodeValid()
  if (!ok) return

  const aspectOk = await ensureImageAspectValid(raw)
  if (!aspectOk) return

  uploading.value = true
  try {
    const res = await uploadImage(raw, props.aspectCode)
    const img = res && res.data
    if (!img || !img.id) {
      throw new Error('Upload failed')
    }
    emit('update:modelValue', img.id)
    preview.value = img.previewUrl || (img.formats && img.formats.thumbnail && img.formats.thumbnail.url) || img.url || ''
    emit('uploaded', img)
    ElMessage.success('Image uploaded successfully')
  } catch (e) {
    ElMessage.error(e && e.msg ? e.msg : 'Upload failed')
  } finally {
    uploading.value = false
  }
}

const doUpload = async (options) => {
  const raw = options?.file || null
  if (!raw) return

  await uploadRawFile(raw)
}

const onDragEnter = () => {
  if (uploading.value) return
  dragOver.value = true
}
const onDragOver = () => {
  if (uploading.value) return
  dragOver.value = true
}
const onDragLeave = () => {
  dragOver.value = false
}
const onDrop = async (evt) => {
  dragOver.value = false
  if (uploading.value) return
  const file = evt.dataTransfer?.files?.[0]
  if (!file) return
  await uploadRawFile(file)
}

const clear = () => {
  emit('update:modelValue', undefined)
  preview.value = ''
}
</script>

<style scoped>
.image-upload { display: inline-flex; }
.upload { display: inline-flex; }
.box {
  width: auto;
  height: 120px;
  aspect-ratio: v-bind(aspectRatioCss);
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  background: #fafafa;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}
.box.is-drag-over {
  border-color: #19b36b;
  background: rgba(25, 179, 107, 0.08);
}
.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: #c0c4cc;
  user-select: none;
}
.img { width: 100%; height: 100%; }
.mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.ratio-tip {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 12px;
  line-height: 16px;
  z-index: 2;
  pointer-events: none;
}
.clear {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 0;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  text-align: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease-in-out;
}

.box:hover .clear {
  opacity: 1;
}
</style>
