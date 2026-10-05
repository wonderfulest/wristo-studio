<template>
  <dialog ref="dialog" class="social-dialog" aria-labelledby="social-title" @cancel.prevent="emit('close')">
    <div class="dialog-content">
      <header><div><p class="eyebrow">{{ platform }}</p><h2 id="social-title">Share {{ face.name }}</h2></div><button class="close" :aria-label="`Close ${platform} sharing`" @click="emit('close')">×</button></header>
      <section class="sharing-guide" aria-labelledby="sharing-guide-title">
        <h3 id="sharing-guide-title">How to share this image and caption</h3>
        <p>{{ guide.intro }}</p>
        <ol>
          <li>Choose an image below and select <strong>Download image</strong>.</li>
          <li>Edit the text if needed, then select <strong>Copy caption</strong>.</li>
          <li>{{ guide.upload }}</li>
          <li>{{ guide.publish }}</li>
        </ol>
        <a class="compose-link" :href="guide.url" target="_blank" rel="noopener noreferrer">Open {{ platform }} to create a post ↗</a>
        <p class="hint">Nothing is posted automatically. On a phone, save the image to Photos first, then open the {{ platform }} app.</p>
      </section>
      <div class="share-layout">
        <section aria-label="Sharing image">
          <img v-if="selected && !imageFailed" class="poster" :src="selected.url" :alt="selected.alt" @error="imageFailed = true" />
          <p v-else class="empty-image">{{ selected ? 'Image preview unavailable. Try another image.' : 'No sharing image is available for this watch face yet.' }}</p>
          <p v-if="selected && !selected.promotional" class="hint">Using a product image. A promotional poster has not been added yet.</p>
          <div v-if="images.length > 1" class="image-choices" aria-label="Choose a sharing image">
            <button v-for="(image, index) in images" :key="image.url" :aria-label="`Sharing image ${index + 1}`" :aria-pressed="selectedIndex === index" @click="selectedIndex = index; imageFailed = false; status = ''; error = ''"><img :src="image.url" :alt="image.alt" /></button>
          </div>
          <div v-if="selected" class="actions"><button :disabled="downloading" @click="download">{{ downloading ? 'Downloading…' : 'Download image' }}</button><a :href="selected.url" target="_blank" rel="noopener noreferrer">Open original ↗</a></div>
        </section>
        <section aria-label="Sharing caption">
          <label for="social-caption">Your caption</label>
          <textarea id="social-caption" v-model="caption" rows="12" spellcheck="true" />
          <button :disabled="!caption.trim()" @click="copy">Copy caption</button>
          <p class="hint">Review the text before posting. Upload the selected image and paste your edited caption in {{ platform }} yourself.</p>
          <div class="link-share"><h3>Share a link only</h3><p class="hint">This shares a website link, not the image and caption above. {{ platform }} controls the link preview; the image may be missing. For a photo post like the preview above, follow the steps at the top.</p><a class="link-only" :href="linkUrl" target="_blank" rel="noopener noreferrer">Share link only ↗</a></div>
        </section>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p><p v-if="status" role="status">{{ status }}</p>
    </div>
  </dialog>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { FaceDetail } from './catalog'
import { socialCaption, socialImages, faceShareUrl, facebookShareDialogUrl, downloadSocialImage, type SocialPlatform } from './sharing'
const props = defineProps<{ face: FaceDetail; platform: SocialPlatform; referralCode?: string }>()
const guide = computed(() => ({
  Facebook: {
    intro: 'Facebook’s link-sharing window cannot automatically attach this image or fill in your caption. To publish them together, create a photo post:',
    upload: 'Open Facebook and create a post in your profile, Page or group. Choose Photo/video and upload the downloaded image.',
    publish: 'Paste your caption, review the audience, then select Post.',
    url: 'https://www.facebook.com/',
  },
  X: {
    intro: 'A link share does not upload the selected image. To share this image with your edited caption, create a post:',
    upload: 'Open X, create a post and use the media button to attach the downloaded image.',
    publish: 'Paste your caption, shorten it to fit your account’s character limit, then review and select Post.',
    url: 'https://x.com/compose/post',
  },
  Reddit: {
    intro: 'A link submission does not upload this image or include your edited caption. Create an image post in a community that allows it:',
    upload: 'Open Reddit, select a community that allows image posts, choose Images & Video and upload the downloaded image.',
    publish: 'Write a short title. Paste your caption into the body if available, or add it as a comment after posting. Check the community rules and required flair before selecting Post.',
    url: 'https://www.reddit.com/submit',
  },
})[props.platform])
const linkUrl = computed(() => {
  const url = faceShareUrl('https://studio.wristo.io', props.face.appId, props.referralCode, props.platform)
  if (props.platform === 'Facebook') return facebookShareDialogUrl(props.face.appId, props.referralCode)
  if (props.platform === 'X') return `https://twitter.com/intent/tweet?${new URLSearchParams({ url })}`
  return `https://www.reddit.com/submit?${new URLSearchParams({ url, title: props.face.name })}`
})
const emit = defineEmits<{ (event: 'close'): void }>()
const dialog = ref<HTMLDialogElement>()
const caption = ref(socialCaption(props.face, props.referralCode, props.platform))
const images = computed(() => socialImages(props.face))
const selectedIndex = ref(0)
const selected = computed(() => images.value[selectedIndex.value])
const imageFailed = ref(false)
const downloading = ref(false)
const status = ref('')
const error = ref('')
let mounted = true
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => { mounted = false; dialog.value?.close() })
async function copy() {
  error.value = ''; status.value = ''
  try { await navigator.clipboard.writeText(caption.value); if (mounted) status.value = `Caption copied. Paste it into your ${props.platform} post.` }
  catch { if (mounted) error.value = 'Could not copy. Select the caption and copy it manually.' }
}
async function download() {
  if (!selected.value || downloading.value) return
  downloading.value = true; error.value = ''; status.value = ''
  try { await downloadSocialImage(selected.value.url, props.face.appId); if (mounted) status.value = `Image downloaded. Attach it to your ${props.platform} post.` }
  catch { if (mounted) error.value = 'Could not download the image. Use Open original to save it instead.' }
  finally { if (mounted) downloading.value = false }
}
</script>
<style scoped>
.social-dialog { width: min(940px, calc(100vw - 32px)); max-height: calc(100dvh - 40px); padding: 0; border: 1px solid var(--studio-border); border-radius: 18px; background: var(--studio-bg); color: var(--studio-text); box-shadow: 0 24px 100px #0005; }
.social-dialog::backdrop { background: #07111abb; }
.dialog-content { padding: 28px; }
header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
h2 { margin: 0; font-size: 26px; overflow-wrap: anywhere; } h3 { font-size: 17px; }
.eyebrow { font-size: 12px; letter-spacing: 2px; color: var(--studio-primary); margin: 0 0 8px; }
.sharing-guide { margin-top: 20px; padding: 18px 20px; border: 1px solid var(--studio-border-strong); border-radius: 10px; background: var(--studio-surface-soft); }
.sharing-guide h3 { margin: 0 0 10px; }
.sharing-guide p, .sharing-guide li { line-height: 1.55; }
.sharing-guide ol { padding-left: 22px; margin: 12px 0 18px; }
.sharing-guide li + li { margin-top: 6px; }
.link-only { display: inline-flex; min-height: 44px; align-items: center; }
.intro, .hint { color: var(--studio-text-muted); line-height: 1.5; } .hint { font-size: 14px; }
.share-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; } section { min-width: 0; }
.poster { display: block; width: 100%; max-height: 400px; object-fit: contain; background: var(--studio-surface-soft); border-radius: 10px; }
.image-choices { display: flex; gap: 8px; overflow-x: auto; padding: 12px 2px; } .image-choices button { padding: 4px; flex: 0 0 66px; } .image-choices img { width: 56px; height: 56px; object-fit: cover; } .image-choices [aria-pressed='true'] { border-color: var(--studio-primary); }
label { display: block; font-weight: 700; margin-bottom: 10px; }
textarea { box-sizing: border-box; width: 100%; resize: vertical; min-height: 220px; max-height: 50vh; padding: 14px; font: inherit; line-height: 1.5; border: 1px solid var(--studio-border-strong); border-radius: 10px; background: var(--studio-surface-raised); color: var(--studio-text); margin-bottom: 12px; }
button, .compose-link { min-height: 44px; padding: 10px 16px; border: 1px solid var(--studio-border-strong); background: var(--studio-surface-raised); color: var(--studio-text); border-radius: 8px; font: inherit; cursor: pointer; }
.close { font-size: 24px; padding: 4px 14px; } button:disabled { opacity: .6; cursor: wait; }
a { color: var(--studio-primary); } .actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.compose-link { display: inline-block; box-sizing: border-box; text-decoration: none; color: #fff; background: #1877f2; border-color: #1877f2; }
.link-share { margin-top: 24px; padding-top: 8px; border-top: 1px solid var(--studio-border); }
.error { color: var(--studio-danger, #c93838); } .empty-image { padding: 40px 16px; background: var(--studio-surface-soft); border-radius: 10px; }
:focus-visible { outline: 2px solid var(--studio-primary); outline-offset: 3px; }
@media (max-width: 640px) { .share-layout { grid-template-columns: 1fr; } .dialog-content { padding: 20px; } }
</style>
