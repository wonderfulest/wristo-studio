<template>
  <div class="image-upload">
    <label class="upload-button" :class="{ busy: uploading }">
      {{ uploading ? 'Uploading…' : '＋ Upload images' }}
      <input type="file" accept="image/png,image/jpeg,image/webp" multiple :disabled="uploading" aria-label="Upload images" @change="upload" />
    </label>
    <p class="hint">PNG, JPEG or WebP · Up to 10 MB each · 20 images per app</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="status" role="status">{{ status }}</p>
  </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { contentError, uploadFaceImages, type FaceImages } from './content'
const props = defineProps<{ appId: number }>()
const emit = defineEmits<{ uploaded: [images: FaceImages] }>()
const uploading = ref(false)
const error = ref('')
const status = ref('')
let active = true
onBeforeUnmount(() => { active = false })
async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length || uploading.value) return
  error.value = ''; status.value = ''
  if (files.length > 20 || files.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)) {
    error.value = 'Choose up to 20 PNG, JPEG or WebP images, each no larger than 10 MB.'
    return
  }
  uploading.value = true
  try {
    const images = await uploadFaceImages(props.appId, files)
    if (!active) return
    emit('uploaded', images)
    status.value = 'Images uploaded. Duplicate images are skipped.'
  } catch (cause) {
    if (active) error.value = contentError(cause, 'Could not upload images. Please try again.')
  } finally { if (active) uploading.value = false }
}
</script>
<style scoped>
.image-upload { margin: 12px 0; font-size: 14px; }
.upload-button { position: relative; display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border: 1px dashed var(--studio-border-strong); border-radius: 6px; color: var(--studio-primary); cursor: pointer; }
.upload-button:focus-within { outline: 2px solid var(--studio-primary); outline-offset: 3px; }
.upload-button input { position: absolute; inset: 0; opacity: 0; width: 100%; cursor: pointer; }
.busy { opacity: .6; }
.hint { color: var(--studio-text-muted); margin: 8px 0; }
.error { color: var(--studio-danger, #c93838); }
</style>
