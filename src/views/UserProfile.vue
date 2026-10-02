<template>
  <div class="profile-page">
    <div class="profile-container">

      <!-- Hero: Avatar + Name + Edit -->
      <div class="profile-hero">
        <div class="avatar-wrapper" :class="{ editing: editMode }" @click="onAvatarDblClick">
          <img
            :src="avatarImageSrc"
            alt="User avatar"
            class="avatar-img"
          />
          <div v-if="editMode" class="avatar-overlay">
            <Icon icon="mdi:camera-outline" width="22" color="#fff" />
          </div>
          <input
            v-if="editMode"
            ref="avatarInputRef"
            type="file"
            accept="image/*"
            hidden
            @change="onAvatarFileChange"
          />
        </div>

        <div class="hero-name">
          {{ userInfo?.nickname || userInfo?.username }}
        </div>
        <div class="hero-email">
          {{ userInfo?.email }}
        </div>
      </div>

      <!-- Section: Personal Info -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">Personal Information</span>
          <button v-if="!editMode" class="edit-trigger" @click="startEdit">
            Edit
          </button>
          <button v-else class="edit-trigger cancel" @click="cancelEdit">
            Cancel
          </button>
        </div>

        <div class="section-card">
          <!-- Username -->
          <div class="row">
            <div class="row-label">Username</div>
            <div class="row-value">
              <span v-if="!editMode">{{ userInfo?.username || '—' }}</span>
              <el-input v-else v-model="form.username" class="apple-input" placeholder="Username" />
            </div>
          </div>

          <div class="row-divider" />

          <!-- Nickname -->
          <div class="row">
            <div class="row-label">Nickname</div>
            <div class="row-value">
              <span v-if="!editMode">{{ userInfo?.nickname || '—' }}</span>
              <el-input v-else v-model="form.nickname" class="apple-input" placeholder="Nickname" />
            </div>
          </div>

          <div class="row-divider" />

          <!-- Email -->
          <div class="row clickable" @click="goChangeEmail">
            <div class="row-label">Email</div>
            <div class="row-value with-chevron">
              <span class="row-value-text">{{ userInfo?.email || '—' }}</span>
              <Icon icon="mdi:chevron-right" width="20" class="chevron" />
            </div>
          </div>

          <!-- Save -->
          <template v-if="editMode">
            <div class="row-divider" />
            <div class="row save-row">
              <button class="save-btn" :disabled="isSaving" @click="handleSave">
                Save Changes
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Section: Security -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">Security</span>
        </div>

        <div class="section-card">
          <!-- Password -->
          <div class="row clickable" @click="goSetPassword">
            <div class="row-label">
              <Icon icon="mdi:lock-outline" width="18" class="row-label-icon" aria-hidden="true" />
              Password
            </div>
            <div class="row-value with-chevron">
              <span
                class="status-pill"
                :class="userInfo?.hasPassword ? 'green' : 'gray'"
              >
                {{ userInfo?.hasPassword ? 'Set' : 'Not Set' }}
              </span>
              <Icon icon="mdi:chevron-right" width="20" class="chevron" />
            </div>
          </div>

          <div class="row-divider" />

          <!-- Google -->
          <div
            class="row clickable"
            @click="userInfo?.googleBound ? handleUnbindGoogle() : handleBindGoogle()"
          >
            <div class="row-label">
              <Icon icon="logos:google-icon" width="18" class="row-label-icon" />
              Google Account
            </div>
            <div class="row-value with-chevron">
              <span
                class="status-pill"
                :class="userInfo?.googleBound ? 'green' : 'gray'"
              >
                {{ userInfo?.googleBound ? 'Connected' : 'Not Connected' }}
              </span>
              <Icon icon="mdi:chevron-right" width="20" class="chevron" />
            </div>
          </div>
          <div class="row-divider" />

          <!-- Apple binding status -->
          <div class="row">
            <div class="row-label">
              <Icon icon="mdi:apple" width="18" class="row-label-icon" aria-hidden="true" />
              Apple Account
            </div>
            <div class="row-value" aria-live="polite">
              <span class="status-pill" :class="appleBound === true ? 'green' : 'gray'">
                {{ appleStatusLoading ? 'Loading...' : appleBound === null ? 'Unavailable' : appleBound ? 'Connected' : 'Not Connected' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Device -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">Device</span>
        </div>

        <div class="section-card">
          <div class="row device-row">
            <div class="row-label">Smartwatch</div>
            <div class="row-value">
              <DeviceDisplay
                :selected-device="userInfo?.device || null"
                :name-max-width="200"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Studio -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">Website</span>
        </div>

        <button class="studio-card" type="button" @click="openWebsite">
          <span class="studio-icon" aria-hidden="true">
            <Icon icon="solar:magic-stick-3-bold-duotone" width="24" />
          </span>
          <span class="studio-copy">
            <strong>Open Wristo Website</strong>
            <span>Discover Garmin watch faces on the Wristo website.</span>
          </span>
          <Icon icon="mdi:chevron-right" width="20" class="chevron" />
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { showErrorOnce } from '@/utils/errorMessage'

import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { updateMyInfo } from '@/api/wristo/auth'
import { uploadImage } from '@/api/image'
import { IMAGE_ASPECT_CODE } from '@/stores/common'
import { useI18n } from '@/i18n'
import DeviceDisplay from '@/components/profile/ProfileDeviceDisplay.vue'
import { getAuthMe, bindGoogle as bindGoogleApi, unbindGoogle as unbindGoogleApi } from '@/api/wristo/auth'

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
const { t } = useI18n()

const DEFAULT_AVATAR_URL = 'https://cdn.wristo.io/brands/wristo-logo/png/wristo-social-profile-1080.png'
const AVATAR_CANVAS_SIZE = 512
const AVATAR_UPLOAD_TYPE = 'image/jpeg'
const AVATAR_START_QUALITY = 0.84
const AVATAR_TARGET_BYTES = 512 * 1024

const editMode = ref(false)
const isSaving = ref(false)
const isRefreshingProfile = ref(false)
const pendingAvatarFile = ref<File | null>(null)
const avatarPreviewUrl = ref('')

const form = ref({
  username: userInfo.value?.username || '',
  nickname: userInfo.value?.nickname || '',
  avatar: userInfo.value?.avatar || '',
  email: userInfo.value?.email || '',
})

const refreshProfileOnOpen = async () => {
  isRefreshingProfile.value = true
  try {
    const response = await userStore.refreshUserInfo()
    if (response.code !== 0 || !response.data) {
      throw new Error('Profile user info response was empty')
    }
  } catch (error) {
    console.error('Failed to refresh user profile on open', error)
    showErrorOnce(error, t('common.loadFailed'))
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
    showErrorOnce(error, t('common.uploadFailed'))
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
    showErrorOnce(error, t('common.saveFailed'))
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


const ssoBaseUrl = new URL(import.meta.env.VITE_WRISTO_STUDIO_SSO_LOGIN_URL || import.meta.env.VITE_WRISTO_SSO_URL || 'https://sso.wristo.io').origin
const openWebsite = () => window.open('https://www.wristo.io/en', '_blank', 'noopener,noreferrer')
const appleBound = ref<boolean | null>(null)
const appleStatusLoading = ref(true)
async function loadAppleStatus() {
  try {
    const { data: auth } = await getAuthMe()
    appleBound.value = typeof auth?.providers?.apple === 'boolean' ? auth?.providers.apple : null
  } catch {
    appleBound.value = null
  } finally {
    appleStatusLoading.value = false
  }
}
const googleClientId = import.meta.env.VITE_WRISTO_GOOGLE_CLIENT_ID || ''
let googleScriptLoaded = false

const loadGoogleScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (googleScriptLoaded || (window as any).google?.accounts) {
      googleScriptLoaded = true
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      googleScriptLoaded = true
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(script)
  })
}

const handleBindGoogle = async () => {
  try {
    if (!googleClientId) {
      ElMessage.error('Google Sign-In is not configured')
      return
    }
    await loadGoogleScript()
    const google = (window as any).google
    if (!google?.accounts?.id) {
      ElMessage.error('Google Sign-In is not available')
      return
    }
    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response: any) => {
        if (response.credential) {
          try {
            await bindGoogleApi(response.credential)
            ElMessage.success('Google account connected!')
            await userStore.refreshUserInfo()
          } catch (e: any) {
            ElMessage.error(e.msg || 'Failed to connect Google account')
          }
        }
      }
    })
    google.accounts.id.prompt()
  } catch (e) {
    ElMessage.error('Failed to initialize Google Sign-In')
  }
}

const handleUnbindGoogle = async () => {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to disconnect your Google account?',
      'Disconnect Google',
      { confirmButtonText: 'Disconnect', cancelButtonText: 'Cancel', type: 'warning' }
    )
    await unbindGoogleApi()
    ElMessage.success('Google account disconnected!')
    await userStore.refreshUserInfo()
  } catch (e: any) {
    if (e === 'cancel' || e?.toString?.().includes('cancel')) return
    ElMessage.error(e.msg || 'Failed to disconnect Google account')
  }
}

const goSetPassword = () => {
  const token = userStore.token
  const email = userInfo.value?.email || ''
  const redirectUri = window.location.href
  const mode = userInfo.value?.hasPassword ? 'change' : 'set'
  const url = `${ssoBaseUrl}/set-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&redirect_uri=${encodeURIComponent(redirectUri)}&mode=${mode}`
  window.location.href = url
}

const goChangeEmail = () => {
  const token = userStore.token
  const email = userInfo.value?.email || ''
  const redirectUri = window.location.href
  const url = `${ssoBaseUrl}/change-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&redirect_uri=${encodeURIComponent(redirectUri)}`
  window.location.href = url
}

onMounted(() => {
  void loadAppleStatus()
  refreshProfileOnOpen()
})

onBeforeUnmount(() => {
  revokeAvatarPreviewUrl()
})
</script>

<style scoped>
/* ===== Page ===== */
.profile-page {
  width: 100%;
  min-height: 100vh;
  background: #f2f2f7;
  display: flex;
  justify-content: center;
  padding: 0 16px 48px;
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

/* ===== Hero ===== */
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
  object-fit: cover;
  display: block;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.avatar-wrapper.editing:hover .avatar-overlay {
  opacity: 1;
}

.hero-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.02em;
  margin-top: 8px;
  text-align: center;
}

.hero-email {
  font-size: 0.9375rem;
  color: #86868b;
  font-weight: 400;
  text-align: center;
}

/* ===== Section ===== */
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
  font-size: 0.8125rem;
  font-weight: 600;
  color: #86868b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.edit-trigger {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #007aff;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
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

/* ===== Card ===== */
.section-card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 0.5px 0 rgba(0, 0, 0, 0.04);
}

.studio-card {
  width: 100%;
  min-height: 86px;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 0;
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(15, 107, 104, 0.08), rgba(245, 158, 11, 0.08)),
    #fff;
  box-shadow: 0 0.5px 0 rgba(0, 0, 0, 0.04);
  cursor: pointer;
  text-align: left;
}

.studio-card:hover {
  background:
    linear-gradient(135deg, rgba(15, 107, 104, 0.12), rgba(245, 158, 11, 0.12)),
    #fff;
}

.studio-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #0f6b68;
  background: rgba(15, 107, 104, 0.1);
}

.studio-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.studio-copy strong {
  color: #1d1d1f;
  font-size: 1rem;
  font-weight: 700;
}

.studio-copy span {
  color: #86868b;
  font-size: 0.9rem;
  line-height: 1.45;
}

/* ===== Row ===== */
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 18px;
  min-height: 48px;
  gap: 12px;
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
  background: #d1d1d6;
  margin-left: 18px;
}

.row-label {
  font-size: 0.9375rem;
  font-weight: 400;
  color: #1d1d1f;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}

.row-label-icon {
  flex-shrink: 0;
}

.row-value {
  font-size: 0.9375rem;
  font-weight: 400;
  color: #86868b;
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
  min-width: 0;
  flex: 1;
}

.row-value.with-chevron {
  gap: 2px;
}

.row-value-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  color: #c7c7cc;
  flex-shrink: 0;
}

/* ===== Status Pill ===== */
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.status-pill.green {
  background: #e8f8ef;
  color: #30a14e;
}

.status-pill.gray {
  background: #f2f2f7;
  color: #86868b;
}

/* ===== Apple Input ===== */
.apple-input {
  width: 100%;
}

.apple-input :deep(.el-input__wrapper) {
  background: #f2f2f7;
  border-radius: 8px;
  box-shadow: none !important;
  padding: 4px 10px;
  transition: background 0.2s ease;
}

.apple-input :deep(.el-input__wrapper.is-focus) {
  background: #e8e8ed;
}

.apple-input :deep(.el-input__inner) {
  font-size: 0.9375rem;
  color: #1d1d1f;
  text-align: right;
}

/* ===== Save Button ===== */
.save-row {
  padding: 12px 18px 14px;
  justify-content: center;
}

.save-btn {
  width: 100%;
  padding: 11px 24px;
  border-radius: 10px;
  border: none;
  background: #0f6b68;
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
  letter-spacing: -0.01em;
}

.save-btn:hover {
  background: #0c5956;
}

.save-btn:active {
  background: #094744;
  transform: scale(0.985);
}

/* ===== Device Row ===== */
.device-row .row-value {
  justify-content: flex-end;
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .profile-page {
    padding: 0 0 32px;
  }

  .profile-container {
    max-width: 100%;
    gap: 24px;
    padding-top: 24px;
    padding-left: 16px;
    padding-right: 16px;
  }

  .avatar-wrapper {
    width: 88px;
    height: 88px;
  }

  .hero-name {
    font-size: 1.5rem;
  }

  .section-card {
    border-radius: 12px;
  }

  .row {
    padding: 12px 16px;
  }

  .row-divider {
    margin-left: 16px;
  }
}
</style>
