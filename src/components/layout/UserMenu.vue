<template>
  <div class="user-menu" v-if="userStore.isAuthenticated">
    <div v-if="pendingCount > 0" class="ticket-reminder">
      <button class="ticket-reminder-button" type="button" @click.stop="goTickets">
        <Icon icon="material-symbols:confirmation-number-outline" />
        <span class="ticket-reminder-label">{{ t('nav.tickets') }}</span>
        <span class="ticket-reminder-count">{{ pendingCount }}</span>
      </button>

      <div v-if="ticketNudgeVisible" class="ticket-nudge" role="status">
        <div class="ticket-nudge-copy">
          <strong>{{ t('dialog.ticketReminder') }}</strong>
          <span>{{ t('dialog.ticketReminderBody', { count: pendingCount }) }}</span>
        </div>
        <div class="ticket-nudge-actions">
          <button class="ticket-nudge-link" type="button" @click.stop="goTickets">
            {{ t('dialog.viewTickets') }}
          </button>
          <button
            class="ticket-nudge-close"
            type="button"
            :aria-label="t('common.cancel')"
            @click.stop="ticketNudgeVisible = false"
          >
            <Icon icon="material-symbols:close" />
          </button>
        </div>
      </div>
    </div>

    <div class="user-avatar" @click.stop="toggleDropdown">
      <img v-if="userAvatar" :src="userAvatar" class="avatar-image" alt="user avatar" />
      <div v-else class="avatar-circle" :style="{ backgroundColor: avatarColor }">
        {{ userInitials }}
      </div>
      <span v-if="showAvatarDot" class="avatar-dot" />
      <el-tooltip 
        :content="userStore.userInfo?.username"
        :disabled="!isUsernameTruncated"
        placement="bottom"
      >
        <span class="username" ref="usernameRef">
          {{ truncatedUsername }}
        </span>
      </el-tooltip>
    </div>

    <div class="dropdown-menu" v-if="showDropdown">
      <div class="dropdown-item" @click="go('/profile')">
        <Icon icon="material-symbols:account-circle" />
        {{ t('nav.userProfile') }}
      </div>
      <div class="dropdown-item" @click="go('/devices')">
        <Icon icon="material-symbols:extension" />
        {{ t('nav.devices') }}
      </div>
      <div class="dropdown-item" @click="go('/fonts')">
        <Icon icon="material-symbols:font-download-outline" />
        {{ t('nav.fontPreview') }}
      </div>
      <div class="dropdown-item" @click="go('/FAQ')">
        <Icon icon="material-symbols:help-outline" />
        {{ t('nav.helpCenter') }}
      </div>
      <div class="dropdown-item" @click="openSettings">
        <Icon icon="material-symbols:settings-outline" />
        {{ t('nav.settings') }}
      </div>
      <div class="dropdown-item" @click="goTickets">
        <Icon icon="material-symbols:confirmation-number-outline" />
        <span>{{ t('nav.tickets') }}</span>
        <span v-if="pendingCount > 0" class="menu-badge">{{ pendingCount }}</span>
      </div>
      <div class="dropdown-divider"></div>
      <div class="dropdown-item" @click="handleLogout">
        <Icon icon="material-symbols:logout" />
        {{ t('nav.logout') }}
      </div>
    </div>

    <DesignerDefaultConfigDialog ref="designerConfigDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ticketsApi } from '@/api/wristo/tickets'
import DesignerDefaultConfigDialog from '@/components/dialogs/DesignerDefaultConfigDialog.vue'
import { useI18n } from '@/i18n'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const showDropdown = ref(false)
const usernameRef = ref<HTMLElement | null>(null)
const isUsernameTruncated = ref(false)
const designerConfigDialogRef = ref<InstanceType<typeof DesignerDefaultConfigDialog> | null>(null)

const ticketNudgeVisible = ref(false)
const pendingCount = ref<number>(0)
const showAvatarDot = computed(() => pendingCount.value > 0)
const userAvatar = computed(() => userStore.userInfo?.avatar || 'https://cdn.wristo.io/test/avatar/561aae25-41bd-47ab-974e-7231f5a850e8.png')

const userInitials = computed(() => {
  const username = userStore.userInfo?.username || ''
  const initials = username
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
  return initials || username.charAt(0).toUpperCase()
})

const avatarColor = computed(() => {
  const colors = [
    '#f56a00', '#7265e6', '#ffbf00', '#00a2ae',
    '#712fd1', '#f74584', '#13c2c2', '#6f42c1'
  ]
  const username = userStore.userInfo?.username || ''
  const index = Array.from(username).reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
})

const truncatedUsername = computed(() => {
  const username = userStore.userInfo?.username || ''
  const maxLength = 12
  if (username.length <= maxLength) return username
  return `${username.slice(0, maxLength)}...`
})

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const handleLogout = () => {
  userStore.logout()
  const ssoBaseUrl = import.meta.env.VITE_SSO_LOGIN_URL as string
  const redirectUri = import.meta.env.VITE_SSO_REDIRECT_URI as string
  window.location.href = `${ssoBaseUrl}?client=studio&redirect_uri=${encodeURIComponent(redirectUri)}`
}

const go = (path: string) => {
  showDropdown.value = false
  router.push(path)
}

const goTickets = () => {
  showDropdown.value = false
  ticketNudgeVisible.value = false
  router.push('/tickets')
}

const openSettings = () => {
  showDropdown.value = false
  designerConfigDialogRef.value?.show()
}

const fetchPendingTickets = async () => {
  try {
    const assigneeId = userStore.userInfo?.id
    if (!assigneeId) return
    const res = await ticketsApi.count(assigneeId, 'open')
    const cnt = res.data
    if (typeof cnt === 'number' && cnt > 0) {
      pendingCount.value = cnt
      ticketNudgeVisible.value = true
    }
  } catch (_e) {
    // silent
  }
}

onMounted(() => {
  const checkTruncation = () => {
    if (!usernameRef.value) return
    const el = usernameRef.value
    isUsernameTruncated.value = el.scrollWidth > el.clientWidth
  }
  checkTruncation()
  window.addEventListener('resize', checkTruncation)
  const closeDropdown = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.user-menu')) {
      showDropdown.value = false
      ticketNudgeVisible.value = false
    }
  }
  window.addEventListener('click', closeDropdown)

  fetchPendingTickets()

  onUnmounted(() => {
    window.removeEventListener('resize', checkTruncation)
    window.removeEventListener('click', closeDropdown)
  })
})
</script>

<style scoped>
.user-menu {
  position: relative;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ticket-reminder {
  position: relative;
  display: flex;
  align-items: center;
}

.ticket-reminder-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 10px;
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
  border: 1px solid var(--studio-primary-border);
  border-radius: var(--studio-radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.ticket-reminder-button:hover {
  background: var(--studio-primary-soft-hover);
  border-color: #7fc4b8;
}

.ticket-reminder-button svg {
  width: 18px;
  height: 18px;
}

.ticket-reminder-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  color: #fff;
  background: #ff4d4f;
  border-radius: 999px;
  font-size: 12px;
  line-height: 20px;
}

.ticket-nudge {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 1001;
  width: min(360px, calc(100vw - 24px));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  color: var(--studio-text);
  background: #fff;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  box-shadow: var(--studio-shadow-lg);
}

.ticket-nudge-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
  font-size: 13px;
  line-height: 1.35;
}

.ticket-nudge-copy strong {
  font-size: 14px;
  line-height: 1.2;
}

.ticket-nudge-copy span {
  color: var(--studio-text-muted);
}

.ticket-nudge-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.ticket-nudge-link,
.ticket-nudge-close {
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.ticket-nudge-link {
  min-height: 32px;
  padding: 0 10px;
  color: #fff;
  background: var(--studio-primary);
  border-radius: var(--studio-radius-md);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.ticket-nudge-link:hover {
  background: var(--studio-primary-hover);
}

.ticket-nudge-close {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--studio-text-muted);
  border-radius: var(--studio-radius-md);
}

.ticket-nudge-close:hover {
  color: var(--studio-text);
  background: var(--studio-surface-soft);
}

.ticket-nudge-close svg {
  width: 18px;
  height: 18px;
}

.user-avatar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: var(--studio-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-avatar:hover {
  background-color: var(--studio-surface-soft);
  border-color: var(--studio-border);
}

.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  user-select: none;
  transition: transform 0.2s ease;
}

.avatar-image {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  transition: transform 0.2s ease;
}

.user-avatar:hover .avatar-circle,
.user-avatar:hover .avatar-image {
  transform: scale(1.05);
}

.avatar-dot {
  position: absolute;
  top: 6px;
  left: 38px;
  width: 14px;
  height: 14px;
  background-color: #ff4d4f;
  border-radius: 50%;
  border: 2px solid #fff;
}

.username {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: var(--studio-text);
  font-weight: 650;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background-color: white;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  box-shadow: var(--studio-shadow-md);
  min-width: 180px;
  padding: 8px;
  z-index: 1000;
  transform-origin: top right;
  animation: dropdown-fade 0.2s ease;
}

@media (max-width: 720px) {
  .user-menu {
    flex: 0 0 auto;
    height: 48px;
    gap: 4px;
  }

  .ticket-reminder-button {
    width: 44px;
    height: 44px;
    min-height: 44px;
    padding: 0;
    gap: 0;
    position: relative;
  }

  .ticket-reminder-label {
    display: none;
  }

  .ticket-reminder-count {
    position: absolute;
    top: 2px;
    right: 2px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    font-size: 11px;
    line-height: 18px;
  }

  .ticket-nudge {
    right: -52px;
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .ticket-nudge-actions {
    width: 100%;
    justify-content: space-between;
  }

  .user-avatar {
    width: 44px;
    height: 44px;
    justify-content: center;
    padding: 0;
  }

  .username {
    display: none;
  }

  .avatar-dot {
    top: 4px;
    left: 28px;
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 9px 12px;
  color: var(--studio-text-muted);
  font-size: 14px;
  font-weight: 650;
  transition: all 0.2s ease;
  border-radius: var(--studio-radius-md);
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: var(--studio-primary-soft);
  color: var(--studio-primary);
}

.dropdown-divider {
  height: 1px;
  background-color: var(--studio-border);
  margin: 8px 6px;
}

.menu-badge {
  margin-left: auto;
  background-color: #ff4d4f;
  color: #fff;
  border-radius: 10px;
  padding: 0 6px;
  font-size: 12px;
  line-height: 18px;
  height: 18px;
  min-width: 18px;
  text-align: center;
}

@keyframes dropdown-fade {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
