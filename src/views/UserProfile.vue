<template>
  <main class="profile-page">
    <section class="profile-shell" aria-labelledby="profile-title">
      <div class="profile-hero">
        <div class="profile-identity-card">
          <div class="avatar-wrap">
            <img
              :src="editMode ? form.avatar : (userInfo?.avatar || 'https://cdn.wristo.io/test/avatar/561aae25-41bd-47ab-974e-7231f5a850e8.png')"
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
            <p class="eyebrow">{{ t('profile.studioAccount') }}</p>
            <h1 id="profile-title">{{ userInfo?.nickname || userInfo?.username || t('profile.defaultCreator') }}</h1>
            <p>{{ userInfo?.email || t('profile.noEmail') }}</p>
          </div>

          <div class="profile-actions">
            <el-button v-if="!editMode" type="primary" class="primary-action" @click="startEdit">
              <Icon icon="material-symbols:edit-rounded" />
              {{ t('profile.editProfile') }}
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

      <section class="profile-card" :aria-label="t('profile.details')">
        <div class="section-header">
          <div>
            <p class="eyebrow">{{ t('profile.details') }}</p>
            <h2>{{ t('profile.information') }}</h2>
          </div>
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
import { ref, watch, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { updateMyInfo } from '@/api/wristo/auth'
import { useI18n } from '@/i18n'

const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
const { t } = useI18n()

const editMode = ref(false)
const isSaving = ref(false)

const form = ref({
  username: userInfo.value?.username || '',
  nickname: userInfo.value?.nickname || '',
  avatar: userInfo.value?.avatar || '',
  email: userInfo.value?.email || '',
})

const avatarInputRef = ref<HTMLInputElement | null>(null)

const onAvatarDblClick = () => {
  if (editMode.value && avatarInputRef.value) {
    avatarInputRef.value.value = ''
    avatarInputRef.value.click()
  }
}

const onAvatarFileChange = async (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (!files || files.length === 0) return
  const file = files[0]
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error(t('profile.uploadImageOnly'))
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    form.value.avatar = reader.result as string
  }
  reader.readAsDataURL(file)
}

const startEdit = () => {
  form.value = {
    username: userInfo.value?.username || '',
    nickname: userInfo.value?.nickname || '',
    avatar: userInfo.value?.avatar || '',
    email: userInfo.value?.email || '',
  }
  editMode.value = true
}

const cancelEdit = () => {
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

  isSaving.value = true
  try {
    await updateMyInfo({
      username: form.value.username,
      nickname: form.value.nickname,
      avatar: form.value.avatar,
    })

    userStore.setUserInfo({
      ...userInfo.value,
      username: form.value.username,
      nickname: form.value.nickname,
      avatar: form.value.avatar,
      email: form.value.email,
    })

    ElMessage.success(t('common.savedSuccessfully'))
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
      form.value = {
        username: val?.username || '',
        nickname: val?.nickname || '',
        avatar: val?.avatar || '',
        email: val?.email || '',
      }
    }
  }
)
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
  width: 100px;
  height: 100px;
}

.profile-avatar {
  width: 100px;
  height: 100px;
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
  right: 4px;
  bottom: 4px;
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

.eyebrow {
  margin: 0 0 8px;
  color: var(--studio-text-subtle);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
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
  min-height: 44px;
  border-radius: 8px;
  font-weight: 700;
}

.primary-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--studio-primary);
  border-color: var(--studio-primary);
  box-shadow: 0 10px 20px rgba(15, 107, 104, 0.18);
}

.profile-card {
  margin-top: 0;
  padding: 0;
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
  align-items: flex-start;
  margin-bottom: 0;
  padding: 0 4px 8px;
  background: var(--studio-bg);
}

.section-header h2 {
  color: var(--studio-text-subtle);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
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
  .device-panel,
  .profile-card {
    padding: 20px;
  }

  .profile-identity-card {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .avatar-wrap,
  .profile-avatar {
    width: 104px;
    height: 104px;
  }

  .section-header {
    flex-direction: column;
    gap: 12px;
  }

  .profile-actions,
  .profile-actions :deep(.el-button) {
    width: 100%;
  }

  .profile-actions :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}
</style>
