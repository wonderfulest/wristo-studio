<template>
  <main class="profile-page" v-loading="isRefreshingProfile" :element-loading-text="t('common.loading')">
    <section class="profile-container" aria-labelledby="profile-title">
      <div class="profile-hero">
        <div class="avatar-wrapper" :class="{ editing: editMode }" @click="onAvatarDblClick">
          <img :src="avatarImageSrc" class="avatar-img" :alt="t('profile.userAvatar')" />
          <div v-if="editMode" class="avatar-overlay">
            <Icon icon="material-symbols:photo-camera-rounded" />
          </div>
          <input
            v-if="editMode"
            ref="avatarInputRef"
            type="file"
            accept="image/*"
            class="sr-only"
            @change="onAvatarFileChange"
          />
        </div>

        <div class="hero-name" id="profile-title">
          {{ userInfo?.nickname || userInfo?.username || t('profile.defaultCreator') }}
        </div>
        <div class="hero-email">{{ userInfo?.email || t('profile.noEmail') }}</div>
        <span v-if="isPremiumMember" class="premium-badge">
          <Icon icon="material-symbols:workspace-premium-rounded" />
          {{ t('membership.premiumBadge') }}
        </span>
      </div>

      <section class="section" :aria-label="t('profile.information')">
        <div class="section-header">
          <span class="section-title">{{ t('profile.information') }}</span>
          <button v-if="!editMode" class="edit-trigger" type="button" @click="startEdit">
            {{ t('common.edit') }}
          </button>
          <button v-else class="edit-trigger cancel" type="button" @click="cancelEdit">
            {{ t('common.cancel') }}
          </button>
        </div>

        <div class="section-card">
          <div class="row">
            <div class="row-label">{{ t('profile.userName') }}</div>
            <div class="row-value">
              <span v-if="!editMode">{{ userInfo?.username || '-' }}</span>
              <el-input
                v-else
                id="profile-username"
                v-model="form.username"
                class="apple-input"
                :placeholder="t('profile.enterUserName')"
              />
            </div>
          </div>

          <div class="row-divider" />

          <div class="row">
            <div class="row-label">{{ t('profile.nickname') }}</div>
            <div class="row-value">
              <span v-if="!editMode">{{ userInfo?.nickname || '-' }}</span>
              <el-input
                v-else
                id="profile-nickname"
                v-model="form.nickname"
                class="apple-input"
                :placeholder="t('profile.enterNickname')"
              />
            </div>
          </div>

          <div class="row-divider" />

          <div class="row">
            <div class="row-label">{{ t('profile.email') }}</div>
            <div class="row-value with-chevron">
              <span class="row-value-text">{{ userInfo?.email || '-' }}</span>
            </div>
          </div>

          <template v-if="editMode">
            <div class="row-divider" />
            <div class="row save-row">
              <button class="save-btn" type="button" :disabled="isSaving" @click="handleSave">
                <span v-if="isSaving">{{ t('common.saving') }}</span>
                <span v-else>{{ t('profile.saveChanges') }}</span>
              </button>
            </div>
          </template>
        </div>
      </section>

      <section v-if="!userStore.isMerchantUser" class="section" :aria-label="t('membership.title')">
        <div class="section-header">
          <span class="section-title">{{ t('membership.title') }}</span>
          <span class="section-badge">{{ membershipLabel }}</span>
        </div>

        <div class="section-card">
          <div class="row">
            <div class="row-label">{{ t('membership.appsUsed') }}</div>
            <div class="row-value">{{ membershipUsageText }}</div>
          </div>
          <div class="row-divider" />
          <div class="row">
            <div class="row-label">{{ t('membership.createAccess') }}</div>
            <div class="row-value">
              <span class="status-pill" :class="canCreateDesign ? 'green' : 'gray'">
                {{ canCreateDesign ? t('membership.available') : t('membership.limitReached') }}
              </span>
            </div>
          </div>
          <div class="row-divider" />
          <div class="row">
            <div class="row-label">{{ t('membership.renewOrEndAt') }}</div>
            <div class="row-value">{{ membershipEndText }}</div>
          </div>
          <div class="row-divider" />
          <button class="row clickable action-row" type="button" @click="goPricing">
            <span class="row-label">{{ t('membership.viewPlans') }}</span>
            <span class="row-value with-chevron">
              <span class="row-value-text">{{ membershipHint }}</span>
              <Icon icon="mdi:chevron-right" class="chevron" />
            </span>
          </button>
          <template v-if="canCancelSubscription || canResumeSubscription">
            <div class="row-divider" />
            <button
              v-if="canCancelSubscription"
              class="row clickable action-row subdued"
              type="button"
              :disabled="billingLoading"
              @click="cancelMembership"
            >
              <span class="row-label">{{ t('membership.cancelSubscription') }}</span>
              <Icon icon="mdi:chevron-right" class="chevron" />
            </button>
            <button
              v-if="canResumeSubscription"
              class="row clickable action-row"
              type="button"
              :disabled="billingLoading"
              @click="resumeMembership"
            >
              <span class="row-label">{{ t('membership.resumeSubscription') }}</span>
              <Icon icon="mdi:chevron-right" class="chevron" />
            </button>
          </template>
        </div>
      </section>

      <section class="section" :aria-label="t('profile.currentDevice')">
        <div class="section-header">
          <span class="section-title">{{ t('profile.currentDevice') }}</span>
        </div>

        <div class="section-card">
          <div class="row device-row">
            <div class="row-label">{{ t('profile.currentDevice') }}</div>
            <div class="row-value">
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
              <span v-else class="empty-device">{{ t('profile.noDeviceConnected') }}</span>
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
  const max = studioMembership.value?.maxDesigns
  if (canCreateDesign.value) return t('membership.profileHint')
  return max == null ? t('membership.freeCreateLimitReached') : t('membership.createLimitReached', { max })
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
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 0 16px 48px;
  color: #1d1d1f;
  background: #f2f2f7;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.profile-container {
  width: 100%;
  max-width: 580px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding-top: 40px;
}

.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
}

.avatar-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  background: #fff;
  box-shadow:
    0 0 0 3px #fff,
    0 2px 16px rgba(0, 0, 0, 0.08);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.avatar-wrapper.editing {
  cursor: pointer;
  box-shadow:
    0 0 0 3px #007aff,
    0 4px 20px rgba(0, 122, 255, 0.18);
}

.avatar-wrapper.editing:hover {
  transform: scale(1.04);
}

.avatar-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.avatar-overlay svg {
  width: 24px;
  height: 24px;
}

.avatar-wrapper.editing:hover .avatar-overlay {
  opacity: 1;
}

.hero-name {
  margin-top: 8px;
  color: #1d1d1f;
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  overflow-wrap: anywhere;
}

.hero-email {
  color: #86868b;
  font-size: 0.9375rem;
  font-weight: 400;
  text-align: center;
  overflow-wrap: anywhere;
}

.premium-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 26px;
  margin-top: 8px;
  padding: 0 10px;
  border: 1px solid rgba(217, 119, 6, 0.24);
  border-radius: 999px;
  color: #8a5a00;
  background: linear-gradient(135deg, #fde68a, #f59e0b);
  font-size: 0.75rem;
  font-weight: 800;
}

.premium-badge svg {
  width: 16px;
  height: 16px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.section-title {
  color: #86868b;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.section-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  color: #475569;
  background: rgba(15, 23, 42, 0.06);
  font-size: 0.72rem;
  font-weight: 800;
}

.edit-trigger {
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  color: #007aff;
  background: none;
  cursor: pointer;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  transition: background 0.15s ease;
}

.edit-trigger:hover {
  background: rgba(0, 122, 255, 0.08);
}

.edit-trigger.cancel {
  color: #86868b;
}

.edit-trigger.cancel:hover {
  background: rgba(0, 0, 0, 0.04);
}

.section-card {
  overflow: hidden;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 0.5px 0 rgba(0, 0, 0, 0.04);
}

.row {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 18px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  transition: background 0.15s ease;
}

.row.clickable {
  cursor: pointer;
}

.row.clickable:hover {
  background: rgba(0, 0, 0, 0.025);
}

.row.clickable:active {
  background: rgba(0, 0, 0, 0.05);
}

.row-divider {
  height: 0.5px;
  margin-left: 18px;
  background: #d1d1d6;
}

.row-label {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  color: #1d1d1f;
  font-size: 0.9375rem;
  font-weight: 400;
  white-space: nowrap;
}

.row-value {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  color: #86868b;
  font-size: 0.9375rem;
  font-weight: 400;
  text-align: right;
}

.row-value.with-chevron {
  gap: 2px;
}

.row-value-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  color: #c7c7cc;
}

.apple-input {
  width: 100%;
  max-width: 280px;
}

.apple-input :deep(.el-input__wrapper) {
  min-height: 36px;
  border-radius: 10px;
  background: #f5f5f7;
  box-shadow: none;
}

.apple-input :deep(.el-input__inner) {
  text-align: right;
}

.save-row {
  justify-content: center;
  padding: 16px 18px;
}

.save-btn {
  width: 100%;
  min-height: 46px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: #007aff;
  cursor: pointer;
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  transition: background 0.18s ease, transform 0.18s ease;
}

.save-btn:hover {
  background: #006fe6;
}

.save-btn:active {
  transform: scale(0.99);
}

.save-btn:disabled,
.action-row:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
}

.status-pill.green {
  color: #1d7f3a;
  background: rgba(52, 199, 89, 0.12);
}

.status-pill.gray {
  color: #6e6e73;
  background: rgba(142, 142, 147, 0.14);
}

.action-row {
  display: flex;
  align-items: center;
}

.action-row.subdued .row-label {
  color: #86868b;
}

.device-row {
  min-height: 68px;
}

.device-display {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.device-avatar {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  background: #f5f5f7;
}

.device-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.device-avatar svg {
  width: 24px;
  height: 24px;
  color: #0f6b68;
}

.device-info {
  min-width: 0;
  text-align: right;
}

.device-name {
  color: #1d1d1f;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-family {
  margin-top: 2px;
  color: #86868b;
  font-size: 0.8rem;
  line-height: 1.3;
}

.empty-device {
  color: #86868b;
  overflow-wrap: anywhere;
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

:global(:root[data-studio-theme='dark']) .profile-page {
  color: var(--studio-text);
  background: #0f172a;
}

:global(:root[data-studio-theme='dark']) .section-card {
  background: var(--studio-surface-raised);
  box-shadow: 0 0 0 1px var(--studio-border);
}

:global(:root[data-studio-theme='dark']) .hero-name,
:global(:root[data-studio-theme='dark']) .row-label,
:global(:root[data-studio-theme='dark']) .device-name {
  color: var(--studio-text);
}

:global(:root[data-studio-theme='dark']) .hero-email,
:global(:root[data-studio-theme='dark']) .section-title,
:global(:root[data-studio-theme='dark']) .row-value,
:global(:root[data-studio-theme='dark']) .device-family,
:global(:root[data-studio-theme='dark']) .empty-device {
  color: var(--studio-text-muted);
}

:global(:root[data-studio-theme='dark']) .row-divider {
  background: var(--studio-border);
}

:global(:root[data-studio-theme='dark']) .apple-input :deep(.el-input__wrapper),
:global(:root[data-studio-theme='dark']) .device-avatar {
  background: var(--studio-surface-soft);
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

@media (max-width: 640px) {
  .profile-page {
    padding: 0 14px 32px;
  }

  .profile-container {
    gap: 26px;
    padding-top: 28px;
  }

  .row {
    align-items: flex-start;
  }

  .row:not(.device-row) {
    flex-direction: column;
    gap: 8px;
  }

  .row-value {
    width: 100%;
    justify-content: flex-start;
    text-align: left;
  }

  .apple-input {
    max-width: none;
  }

  .apple-input :deep(.el-input__inner) {
    text-align: left;
  }

  .action-row {
    flex-direction: row !important;
    align-items: center;
  }

  .device-row {
    flex-direction: column;
    gap: 12px;
  }

  .device-display {
    justify-content: flex-start;
  }

  .device-info {
    text-align: left;
  }
}
</style>
