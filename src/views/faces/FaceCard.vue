<template>
          <article class="face-card">
            <RouterLink :to="faceDetailsUrl(face.appId)" class="face-art">
              <img v-if="faceImage(face)" :src="faceImage(face)" :alt="face.name" loading="lazy" @error="hideBrokenImage" />
              <span v-else class="image-placeholder">Preview unavailable</span>
            </RouterLink>
            <div class="face-info">
              <RouterLink :to="faceDetailsUrl(face.appId)" class="face-name">{{ face.name }}</RouterLink>
              <div class="face-meta">
                <span>{{ face.price === 0 ? 'Free' : face.price == null ? 'View pricing' : `$${face.price.toFixed(2)}` }}</span>
                <span v-if="face.download != null">↓ {{ formatDownloadCount(face.download, userStore.isAdminUser || userStore.isMerchantUser) }}</span>
                <span v-if="face.ratingCount">★ {{ (face.averageRating || 0).toFixed(1) }}</span>
                <span v-if="canEditFace" class="face-editable" role="img" aria-label="Editable in Builder" title="Editable in Builder">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="m16 3 5 5-12 12-6 1 1-6L16 3Z" />
                    <path d="m14 5 5 5" />
                  </svg>
                </span>
              </div>
            </div>
          </article>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import '@fontsource/yantramanav/latin-400.css'
import '@fontsource/yantramanav/latin-700.css'
import { formatDownloadCount } from './downloadCount'
import { faceDetailsUrl, faceImage, type PublishedFace } from './catalog'
const props = defineProps<{ face: PublishedFace }>()
const userStore = useUserStore()
const canEditFace = computed(() => !!props.face.designId && (userStore.isAdminUser || (userStore.userInfo?.id != null && props.face.ownerId != null && String(userStore.userInfo.id) === String(props.face.ownerId))))
function hideBrokenImage(event: Event) { (event.target as HTMLImageElement).style.visibility = 'hidden' }
</script>
<style scoped>
.face-card { font-family: 'Yantramanav', sans-serif; color: var(--ink, #252b29); background: var(--studio-surface-raised, #fff); min-width: 0; }
a { color: inherit; text-decoration: none; }
a:focus-visible { outline: 2px solid #608928; outline-offset: 3px; }
.face-card {
  border: 1px solid var(--line, #e4e7e1);
  border-radius: 10px;
  overflow: hidden;
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}
.face-card:hover {
  box-shadow: 0 8px 24px #252b2910;
  transform: translateY(-3px);
}
.face-art {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background: #f4f5f0;
  padding: 12px;
}
.face-art img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.face-info {
  padding: 13px 14px;
}
.face-name {
  display: block;
  font-weight: 700;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.face-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--muted, #707771);
  margin-top: 8px;
}
.face-meta span:first-child {
  margin-right: auto;
}
.face-editable {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--muted, #707771);
}
.image-placeholder {
  font-size: 12px;
  color: var(--muted, #707771);
}

@media (max-width: 520px) { .face-info { padding: 11px; } }
</style>
