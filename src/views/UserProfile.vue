<template>
  <main class="profile-page" v-loading="isRefreshingProfile" :element-loading-text="t('common.loading')">
    <section class="profile-shell" aria-labelledby="profile-title">
      <div class="profile-hero">
        <div class="profile-identity-card">
          <div class="avatar-wrap">
            <img
              :src="avatarImageSrc"
              class="profile-avatar"
              :class="{ 'avatar-editing': editMode }"
              :alt="t('profile.userAvatar')"
              @dblclick="onAvatarDblClick"
            />
            <button
              v-if="editMode"
              class="avatar-action"
              type="button"
              :aria-label="t('profile.uploadAvatar')"
              @click="onAvatarDblClick"
            >
              <Icon icon="material-symbols:photo-camera-rounded" />
            </button>
            <input
              v-if="editMode"
              ref="avatarInputRef"
              type="file"
              accept="image/*"
              class="sr-only"
              @change="onAvatarFileChange"
            />
          </div>

          <div class="identity-copy">
            <div class="identity-heading">
              <h1 id="profile-title">{{ userInfo?.nickname || userInfo?.username || t('profile.defaultCreator') }}</h1>
              <span
                v-if="isPremiumMember"
                class="premium-badge"
                :title="t('membership.premiumBadge')"
                :aria-label="t('membership.premiumBadge')"
              >
                <Icon icon="material-symbols:workspace-premium-rounded" />
                <span>{{ t('membership.premiumBadge') }}</span>
              </span>
            </div>
            <p>{{ userInfo?.email || t('profile.noEmail') }}</p>
          </div>

          <div class="profile-actions">
            <el-button
              v-if="!editMode"
              type="primary"
              class="primary-action edit-icon-action"
              :aria-label="t('common.edit')"
              :title="t('common.edit')"
              @click="startEdit"
            >
              <Icon icon="material-symbols:edit-rounded" />
            </el-button>
            <template v-else>
              <el-button class="secondary-action" @click="cancelEdit">{{ t('common.cancel') }}</el-button>
              <el-button
                type="primary"
                class="primary-action"
                :loading="isSaving"
                :disabled="isSaving"
                @click="handleSave"
              >
                {{ t('profile.saveChanges') }}
              </el-button>
            </template>
          </div>
        </div>

        <aside class="device-panel" :aria-label="t('profile.currentDevice')">
          <div class="panel-heading">
            <span class="panel-icon"><Icon icon="material-symbols:watch-rounded" /></span>
            <div>
              <span>{{ t('profile.currentDevice') }}</span>
              <strong>{{ userInfo?.device ? t('profile.connected') : t('profile.notConnected') }}</strong>
            </div>
          </div>

          <div v-if="userInfo?.device" class="device-display">
            <div class="device-avatar">
              <img
                v-if="userInfo.device?.imageUrl"
                :src="userInfo.device.imageUrl"
                :alt="userInfo.device.displayName"
              />
              <Icon v-else icon="material-symbols:watch-rounded" />
            </div>
            <div class="device-info">
              <div class="device-name">{{ userInfo.device?.displayName }}</div>
              <div v-if="userInfo.device?.deviceFamily" class="device-family">
                {{ userInfo.device?.deviceFamily }}
              </div>
            </div>
          </div>

          <div v-else class="empty-device">
            <Icon icon="material-symbols:watch-off-rounded" />
            <div>
              <strong>{{ t('profile.noDeviceConnected') }}</strong>
              <span>{{ t('profile.connectDeviceHint') }}</span>
            </div>
          </div>
        </aside>
      </div>

      <section v-if="!userStore.isMerchantUser" class="profile-card membership-panel" :aria-label="t('membership.title')">
        <div class="section-header">
          <span class="section-title-icon" aria-hidden="true">
            <Icon icon="material-symbols:workspace-premium" />
          </span>
          <span class="status-chip membership-chip">
            {{ membershipLabel }}
          </span>
        </div>

        <div class="membership-summary">
          <div>
            <span>{{ t('membership.appsUsed') }}</span>
            <strong>{{ membershipUsageText }}</strong>
          </div>
          <div>
            <span>{{ t('membership.createAccess') }}</span>
            <strong>{{ canCreateDesign ? t('membership.available') : t('membership.limitReached') }}</strong>
          </div>
          <div>
            <span>{{ t('membership.renewOrEndAt') }}</span>
            <strong>{{ membershipEndText }}</strong>
          </div>
          <div>
            <span>{{ t('membership.adFree') }}</span>
            <strong>{{ studioMembership?.adFree ? t('common.yes') : t('common.no') }}</strong>
          </div>
        </div>

        <div class="membership-actions">
          <p>{{ membershipHint }}</p>
          <el-button type="primary" class="primary-action" @click="goPricing">
            <Icon icon="material-symbols:arrow-forward-rounded" />
            {{ t('membership.viewPlans') }}
          </el-button>
          <el-button
            v-if="canCancelSubscription"
            class="secondary-action subscription-cancel-action"
            :loading="billingLoading"
            @click="cancelMembership"
          >
            <Icon icon="material-symbols:event-busy-rounded" />
            {{ t('membership.cancelSubscription') }}
          </el-button>
          <el-button
            v-if="canResumeSubscription"
            type="primary"
            class="primary-action subscription-resume-action"
            :loading="billingLoading"
            @click="resumeMembership"
          >
            <Icon icon="material-symbols:restart-alt-rounded" />
            {{ t('membership.resumeSubscription') }}
          </el-button>
        </div>
      </section>

      <section class="profile-card" :aria-label="t('profile.details')">
        <div class="section-header">
          <span class="section-title-icon" aria-hidden="true">
            <Icon icon="material-symbols:manage-accounts-rounded" />
          </span>
          <span class="status-chip">
            <Icon icon="material-symbols:verified-user-rounded" />
            {{ t('profile.authenticated') }}
          </span>
        </div>

        <div class="profile-form">
          <div class="form-item">
            <span class="form-icon"><Icon icon="material-symbols:person-rounded" /></span>
            <div class="form-content">
              <label for="profile-username">{{ t('profile.userName') }}</label>
              <el-input
                v-if="editMode"
                id="profile-username"
                v-model="form.username"
                :placeholder="t('profile.enterUserName')"
                class="form-input"
              />
              <span v-else>{{ userInfo?.username || '-' }}</span>
            </div>
          </div>

          <div class="form-item">
            <span class="form-icon"><Icon icon="material-symbols:badge-rounded" /></span>
            <div class="form-content">
              <label for="profile-nickname">{{ t('profile.nickname') }}</label>
              <el-input
                v-if="editMode"
                id="profile-nickname"
                v-model="form.nickname"
                :placeholder="t('profile.enterNickname')"
                class="form-input"
              />
              <span v-else>{{ userInfo?.nickname || '-' }}</span>
            </div>
          </div>

          <div class="form-item">
            <span class="form-icon"><Icon icon="material-symbols:mail-rounded" /></span>
            <div class="form-content">
              <label>{{ t('profile.email') }}</label>
              <span>{{ userInfo?.email || '-' }}</span>
            </div>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { updateMyInfo } from '@/api/wristo/auth'
import { uploadImage } from '@/api/image'
import { IMAGE_ASPECT_CODE } from '@/stores/common'
import { useI18n } from '@/i18n'
import { membershipApi } from '@/api/wristo/membership'

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
const { t } = useI18n()
const router = useRouter()

const DEFAULT_AVATAR_URL = 'https://cdn.wristo.io/test/avatar/561aae25-41bd-47ab-974e-7231f5a850e8.png'
const AVATAR_CANVAS_SIZE = 512
const AVATAR_UPLOAD_TYPE = 'image/jpeg'
const AVATAR_START_QUALITY = 0.84
const AVATAR_TARGET_BYTES = 512 * 1024

const editMode = ref(false)
const isSaving = ref(false)
const isRefreshingProfile = ref(false)
const billingLoading = ref(false)
const pendingAvatarFile = ref<File | null>(null)
const avatarPreviewUrl = ref('')

const form = ref({
  username: userInfo.value?.username || '',
  nickname: userInfo.value?.nickname || '',
  avatar: userInfo.value?.avatar || '',
  email: userInfo.value?.email || '',
})

const studioMembership = computed(() => userStore.studioMembership)
const canCreateDesign = computed(() => userStore.canCreateDesign)
const membershipLabel = computed(() => {
  const level = studioMembership.value?.level || 'free'
  return t(`membership.level.${level}`)
})
const membershipUsageText = computed(() => {
  const count = studioMembership.value?.designCount ?? 0
  const max = studioMembership.value?.maxDesigns
  return max == null ? t('membership.unlimitedUsage', { count }) : t('membership.limitedUsage', { count, max })
})
const membershipHint = computed(() => {
  if (isScheduledCancellation.value) {
    return t('membership.cancelScheduledHint', { date: membershipEndText.value })
  }
  return canCreateDesign.value ? t('membership.profileHint') : t('membership.freeCreateLimitReached')
})
const isActiveMembership = computed(() => {
  const status = studioMembership.value?.status
  return status == null || status === '1' || status === '5'
})
const isPremiumMember = computed(() => {
  const membership = studioMembership.value
  if (!membership || membership.level === 'free') {
    return false
  }
  const status = membership.status
  return status == null || status === '1' || status === '5'
})
const isScheduledCancellation = computed(() => {
  return studioMembership.value?.cancelScheduled === true
    || studioMembership.value?.scheduledChangeAction?.toLowerCase() === 'cancel'
})
const canManagePaddleSubscription = computed(() => Boolean(studioMembership.value?.paddleSubId))
const canCancelSubscription = computed(() => {
  return canManagePaddleSubscription.value && isActiveMembership.value && !isScheduledCancellation.value
})
const canResumeSubscription = computed(() => {
  return canManagePaddleSubscription.value && (isScheduledCancellation.value || !isActiveMembership.value)
})
const membershipEndText = computed(() => {
  const value = studioMembership.value?.scheduledChangeEffectiveAt
    || studioMembership.value?.renewAt
    || studioMembership.value?.endTime
  return value ? new Date(value).toLocaleDateString() : t('common.never')
})

const goPricing = () => {
  router.push('/pricing')
}

const cancelMembership = async () => {
  try {
    await ElMessageBox.confirm(t('membership.cancelConfirm'), t('common.tip'), {
      confirmButtonText: t('membership.cancelSubscription'),
      cancelButtonText: t('common.cancel'),
      type: 'warning',
    })
  } catch {
    return
  }
  billingLoading.value = true
  try {
    const response = await membershipApi.cancelCurrent()
    if (userStore.userInfo) {
      userStore.userInfo = { ...userStore.userInfo, studioMembership: response.data }
    }
    ElMessage.success(t('membership.cancelSubmitted'))
  } catch (error) {
    console.error('cancel Studio membership failed', error)
    ElMessage.error(t('membership.cancelFailed'))
  } finally {
    billingLoading.value = false
  }
}

const resumeMembership = async () => {
  try {
    await ElMessageBox.confirm(t('membership.resumeConfirm'), t('common.tip'), {
      confirmButtonText: t('membership.resumeSubscription'),
      cancelButtonText: t('common.cancel'),
      type: 'warning',
    })
  } catch {
    return
  }
  billingLoading.value = true
  try {
    const response = await membershipApi.resumeCurrent()
    if (userStore.userInfo) {
      userStore.userInfo = { ...userStore.userInfo, studioMembership: response.data }
    }
    ElMessage.success(t('membership.resumeSubmitted'))
  } catch (error) {
    console.error('resume Studio membership failed', error)
    ElMessage.error(t('membership.resumeFailed'))
  } finally {
    billingLoading.value = false
  }
}

const refreshProfileOnOpen = async () => {
  isRefreshingProfile.value = true
  try {
    const response = await userStore.refreshUserInfo()
    if (response.code !== 0 || !response.data) {
      throw new Error('Profile user info response was empty')
    }
  } catch (error) {
    console.error('Failed to refresh user profile on open', error)
    ElMessage.error(t('common.loadFailed'))
  } finally {
    isRefreshingProfile.value = false
  }
}

const avatarInputRef = ref<HTMLInputElement | null>(null)
const avatarImageSrc = computed(() => {
  const src = editMode.value ? form.value.avatar : userInfo.value?.avatar
  return src || DEFAULT_AVATAR_URL
})

const revokeAvatarPreviewUrl = () => {
  if (avatarPreviewUrl.value) {
    URL.revokeObjectURL(avatarPreviewUrl.value)
    avatarPreviewUrl.value = ''
  }
}

const resetPendingAvatar = () => {
  pendingAvatarFile.value = null
  revokeAvatarPreviewUrl()
}

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error('Failed to load avatar image'))
  image.src = url
})

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) {
      resolve(blob)
      return
    }
    reject(new Error('Failed to encode avatar image'))
  }, type, quality)
})

const avatarFileName = (name: string) => {
  const baseName = name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '')
  return `${baseName || 'avatar'}.jpg`
}

const compressAvatarFile = async (file: File): Promise<File> => {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const naturalWidth = image.naturalWidth || image.width
    const naturalHeight = image.naturalHeight || image.height
    if (!naturalWidth || !naturalHeight) {
      throw new Error('Invalid avatar image size')
    }

    const sourceSize = Math.min(naturalWidth, naturalHeight)
    const sourceX = Math.floor((naturalWidth - sourceSize) / 2)
    const sourceY = Math.floor((naturalHeight - sourceSize) / 2)
    const targetSize = Math.min(AVATAR_CANVAS_SIZE, sourceSize)
    const canvas = document.createElement('canvas')
    canvas.width = targetSize
    canvas.height = targetSize
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas is not available')
    }

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, targetSize, targetSize)
    ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, targetSize, targetSize)

    let quality = AVATAR_START_QUALITY
    let blob = await canvasToBlob(canvas, AVATAR_UPLOAD_TYPE, quality)
    while (blob.size > AVATAR_TARGET_BYTES && quality > 0.62) {
      quality -= 0.08
      blob = await canvasToBlob(canvas, AVATAR_UPLOAD_TYPE, quality)
    }

    return new File([blob], avatarFileName(file.name), {
      type: AVATAR_UPLOAD_TYPE,
      lastModified: Date.now(),
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const onAvatarDblClick = () => {
  if (editMode.value && avatarInputRef.value) {
    avatarInputRef.value.value = ''
    avatarInputRef.value.click()
  }
}

const onAvatarFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return
  const file = files[0]
  const isImage = file.type.startsWith('image/')
  input.value = ''
  if (!isImage) {
    ElMessage.error(t('profile.uploadImageOnly'))
    return
  }

  try {
    const compressedFile = await compressAvatarFile(file)
    if (!editMode.value) {
      return
    }
    pendingAvatarFile.value = compressedFile
    revokeAvatarPreviewUrl()
    avatarPreviewUrl.value = URL.createObjectURL(compressedFile)
    form.value.avatar = avatarPreviewUrl.value
  } catch (error) {
    console.error('Failed to compress avatar image', error)
    ElMessage.error(t('common.uploadFailed'))
  }
}

const startEdit = () => {
  resetPendingAvatar()
  form.value = {
    username: userInfo.value?.username || '',
    nickname: userInfo.value?.nickname || '',
    avatar: userInfo.value?.avatar || '',
    email: userInfo.value?.email || '',
  }
  editMode.value = true
}

const cancelEdit = () => {
  resetPendingAvatar()
  form.value = {
    username: userInfo.value?.username || '',
    nickname: userInfo.value?.nickname || '',
    avatar: userInfo.value?.avatar || '',
    email: userInfo.value?.email || '',
  }
  editMode.value = false
}

const handleSave = async () => {
  if (!userInfo.value) {
    editMode.value = false
    return
  }

  const username = form.value.username.trim()
  const nickname = form.value.nickname.trim()
  if (!username) {
    ElMessage.error(t('profile.enterUserName'))
    return
  }

  isSaving.value = true
  try {
    let avatarUrl = userInfo.value.avatar || ''
    if (pendingAvatarFile.value) {
      const uploadResponse = await uploadImage(pendingAvatarFile.value, IMAGE_ASPECT_CODE.AVATAR)
      avatarUrl = uploadResponse.data?.url || ''
      if (!avatarUrl) {
        throw new Error('Avatar upload did not return a URL')
      }
    } else if (form.value.avatar && !form.value.avatar.startsWith('blob:') && !form.value.avatar.startsWith('data:')) {
      avatarUrl = form.value.avatar
    }

    await updateMyInfo({
      username,
      nickname,
      avatar: avatarUrl,
    })

    const fallbackUserInfo = {
      ...userInfo.value,
      username,
      nickname,
      avatar: avatarUrl,
      email: form.value.email,
    }

    try {
      await userStore.refreshUserInfo()
    } catch (refreshError) {
      console.warn('Failed to refresh user profile after save', refreshError)
      userStore.setUserInfo(fallbackUserInfo)
    }

    ElMessage.success(t('common.savedSuccessfully'))
    resetPendingAvatar()
    editMode.value = false
  } catch (error) {
    console.error('Failed to update user profile', error)
    ElMessage.error(t('common.saveFailed'))
  } finally {
    isSaving.value = false
  }
}

watch(
  () => userStore.userInfo,
  (val) => {
    if (!editMode.value) {
      resetPendingAvatar()
      form.value = {
        username: val?.username || '',
        nickname: val?.nickname || '',
        avatar: val?.avatar || '',
        email: val?.email || '',
      }
    }
  }
)

onMounted(() => {
  refreshProfileOnOpen()
})

onBeforeUnmount(() => {
  revokeAvatarPreviewUrl()
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--studio-bg);
  color: var(--studio-text);
  padding: 40px 16px 56px;
}

.profile-shell {
  width: min(680px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.profile-hero {
  display: flex;
  flex-direction: column;
  gap: 32px;
  align-items: stretch;
}

.profile-identity-card,
.device-panel,
.profile-card {
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: 14px;
  box-shadow: var(--studio-shadow-sm);
  overflow: hidden;
}

.profile-identity-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding: 0 0 8px;
  background: transparent;
  border: 0;
  box-shadow: none;
  overflow: visible;
}

.avatar-wrap {
  position: relative;
  width: 128px;
  height: 128px;
}

.profile-avatar {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  object-fit: cover;
  border: 0;
  box-shadow: 0 0 0 3px var(--studio-surface), 0 2px 16px rgba(0, 0, 0, 0.12);
  background: var(--studio-surface);
}

.avatar-editing {
  cursor: pointer;
  outline: 3px solid var(--studio-focus-ring);
  outline-offset: 4px;
}

.avatar-action {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: var(--studio-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 22px rgba(15, 107, 104, 0.24);
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease;
}

.avatar-action:hover,
.avatar-action:focus-visible {
  background: var(--studio-primary-hover);
  transform: translateY(-1px);
}

.avatar-action svg {
  width: 22px;
  height: 22px;
}

.identity-copy {
  min-width: 0;
  text-align: center;
}

.identity-heading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  gap: 10px;
  flex-wrap: wrap;
}

.identity-copy h1,
.section-header h2 {
  margin: 0;
  color: var(--studio-text);
  line-height: 1.15;
}

.identity-copy h1 {
  font-size: 1.75rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.premium-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(217, 119, 6, 0.32);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.08));
  color: #9a5f00;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.premium-badge svg {
  width: 16px;
  height: 16px;
  color: var(--studio-warning);
}

:global(:root[data-studio-theme='dark']) .premium-badge {
  border-color: rgba(251, 191, 36, 0.4);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(245, 158, 11, 0.12));
  color: #fde68a;
}

.identity-copy p:last-child {
  margin: 10px 0 0;
  color: var(--studio-text-subtle);
  font-size: 0.9375rem;
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.primary-action,
.secondary-action {
  min-height: 36px;
  border-radius: 8px;
  font-weight: 700;
}

.primary-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--studio-primary);
  border-color: var(--studio-primary);
  padding: 0 14px;
  box-shadow: 0 8px 16px rgba(15, 107, 104, 0.16);
}

.primary-action svg {
  width: 16px;
  height: 16px;
}

.secondary-action svg {
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

.edit-icon-action {
  width: 36px;
  min-width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
}

.edit-icon-action svg {
  width: 18px;
  height: 18px;
}

.profile-card {
  margin-top: 0;
  padding: 0;
}

.membership-panel {
  padding: 0;
}

.membership-panel .section-header {
  margin-bottom: 0;
}

.membership-chip {
  margin-left: auto;
  font-weight: 800;
}

.membership-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 22px 22px 0;
}

.membership-summary > div {
  min-height: 84px;
  padding: 16px;
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  background: var(--studio-surface-soft);
}

.membership-summary span {
  display: block;
  color: var(--studio-text-subtle);
  font-size: 0.82rem;
  font-weight: 800;
}

.membership-summary strong {
  display: block;
  margin-top: 8px;
  color: var(--studio-text);
  font-size: 1.25rem;
}

.membership-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px 22px;
}

.membership-actions p {
  flex: 1 1 180px;
  margin: 0;
  color: var(--studio-text-subtle);
  line-height: 1.5;
}

.membership-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.subscription-cancel-action {
  --el-button-bg-color: transparent;
  --el-button-border-color: var(--studio-border);
  --el-button-text-color: var(--studio-text-subtle);
  --el-button-hover-bg-color: color-mix(in srgb, var(--studio-surface-soft) 58%, transparent);
  --el-button-hover-border-color: var(--studio-border);
  --el-button-hover-text-color: var(--studio-text-muted);
  --el-button-active-bg-color: var(--studio-surface-soft);
  --el-button-active-border-color: var(--studio-border);
  --el-button-active-text-color: var(--studio-text-muted);
  min-height: 34px;
  padding: 0 12px;
  color: var(--studio-text-subtle);
  background: transparent;
  border-color: var(--studio-border);
  box-shadow: none;
}

.subscription-cancel-action svg {
  color: currentColor;
  opacity: 0.68;
}

.subscription-cancel-action:hover,
.subscription-cancel-action:focus {
  color: var(--studio-text-muted);
  background: color-mix(in srgb, var(--studio-surface-soft) 58%, transparent);
  border-color: var(--studio-border);
}

.subscription-resume-action {
  --el-button-bg-color: var(--studio-primary);
  --el-button-border-color: var(--studio-primary);
  --el-button-hover-bg-color: var(--studio-primary-hover);
  --el-button-hover-border-color: var(--studio-primary-hover);
  --el-button-active-bg-color: var(--studio-primary-active);
  --el-button-active-border-color: var(--studio-primary-active);
  min-height: 42px;
  padding: 0 18px;
  background: linear-gradient(135deg, var(--studio-primary), var(--studio-primary-hover));
  border-color: var(--studio-primary);
  box-shadow: 0 12px 24px rgba(15, 107, 104, 0.24);
  transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}

.subscription-resume-action:hover,
.subscription-resume-action:focus {
  background: linear-gradient(135deg, var(--studio-primary-hover), var(--studio-primary));
  border-color: var(--studio-primary-hover);
  box-shadow: 0 16px 30px rgba(15, 107, 104, 0.3);
  transform: translateY(-1px);
}

.subscription-resume-action:active {
  box-shadow: 0 8px 16px rgba(15, 107, 104, 0.22);
  transform: translateY(0);
}

:global(:root[data-studio-theme='dark']) .subscription-cancel-action {
  --el-button-bg-color: rgba(15, 23, 42, 0.18);
  --el-button-border-color: rgba(148, 163, 184, 0.18);
  --el-button-text-color: rgba(148, 163, 184, 0.78);
  --el-button-hover-bg-color: rgba(30, 41, 59, 0.52);
  --el-button-hover-border-color: rgba(148, 163, 184, 0.28);
  --el-button-hover-text-color: var(--studio-text-muted);
  color: rgba(148, 163, 184, 0.78);
  background: rgba(15, 23, 42, 0.18);
  border-color: rgba(148, 163, 184, 0.18);
}

:global(:root[data-studio-theme='dark']) .subscription-resume-action {
  box-shadow: 0 12px 24px rgba(45, 212, 191, 0.18);
}

:global(:root[data-studio-theme='dark']) .subscription-resume-action:hover,
:global(:root[data-studio-theme='dark']) .subscription-resume-action:focus {
  box-shadow: 0 16px 30px rgba(45, 212, 191, 0.24);
}

.device-panel {
  padding: 18px;
}

.panel-heading,
.section-header,
.device-display,
.empty-device {
  display: flex;
  align-items: center;
  gap: 16px;
}

.panel-heading {
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.panel-icon,
.form-icon,
.status-chip {
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.panel-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.panel-icon svg {
  width: 26px;
  height: 26px;
}

.panel-heading span:not(.panel-icon) {
  display: block;
  color: var(--studio-text-subtle);
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
}

.panel-heading strong {
  display: block;
  margin-top: 4px;
  color: var(--studio-text);
  font-size: 1.1rem;
}

.device-display {
  align-items: center;
  padding: 18px;
  border: 0;
  border-radius: 14px;
  background: var(--studio-surface-soft);
}

.device-avatar {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  display: grid;
  place-items: center;
  overflow: hidden;
  flex: 0 0 auto;
}

.device-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.device-avatar svg,
.empty-device > svg {
  width: 34px;
  height: 34px;
  color: var(--studio-primary);
}

.device-info {
  min-width: 0;
}

.device-name {
  color: var(--studio-text);
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.device-family {
  margin-top: 4px;
  color: var(--studio-text-muted);
  font-size: 0.92rem;
}

.empty-device {
  align-items: flex-start;
  padding: 18px;
  border: 0;
  border-radius: 14px;
  background: var(--studio-surface-soft);
}

.empty-device strong,
.empty-device span {
  display: block;
}

.empty-device strong {
  color: var(--studio-text);
  margin-bottom: 4px;
}

.empty-device span {
  color: var(--studio-text-muted);
  line-height: 1.5;
}

.section-header {
  justify-content: space-between;
  align-items: center;
  min-height: 72px;
  margin-bottom: 0;
  padding: 14px 18px 18px;
  background: var(--studio-bg);
  border-bottom: 1px solid var(--studio-border);
}

.section-title-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.section-title-icon svg {
  width: 24px;
  height: 24px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
}

.profile-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  background: var(--studio-surface);
  border: 0;
  border-bottom: 1px solid var(--studio-border);
  border-radius: 0;
  padding: 13px 18px;
}

.form-item:last-child {
  border-bottom: 0;
}

.form-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex: 0 0 auto;
}

.form-icon svg {
  width: 22px;
  height: 22px;
}

.form-content {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-content label {
  color: var(--studio-text-muted);
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
}

.form-content span {
  color: var(--studio-text);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.form-input {
  width: 100%;
}

.form-input :deep(.el-input__wrapper) {
  min-height: 44px;
  border-radius: 8px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

@media (max-width: 980px) {
  .profile-hero,
  .profile-form {
    grid-template-columns: 1fr;
  }

  .profile-identity-card {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .profile-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .profile-page {
    padding: 20px 14px 32px;
  }

  .profile-identity-card,
  .device-panel {
    padding: 20px;
  }

  .profile-identity-card {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .avatar-wrap,
  .profile-avatar {
    width: 116px;
    height: 116px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .membership-summary {
    grid-template-columns: 1fr;
    padding: 20px 20px 0;
  }

  .membership-chip {
    margin-left: 0;
  }

  .membership-actions {
    flex-direction: column;
    align-items: stretch;
    padding: 18px 20px 20px;
  }

  .membership-actions p {
    flex-basis: auto;
  }

  .membership-actions :deep(.el-button) {
    width: 100%;
    justify-content: center;
  }

  .profile-actions,
  .profile-actions :deep(.el-button) {
    width: 100%;
  }

  .profile-actions .edit-icon-action {
    width: 36px;
    min-width: 36px;
  }

  .profile-actions :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}
</style>
