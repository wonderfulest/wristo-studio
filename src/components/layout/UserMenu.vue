<template>
  <div class="user-menu" v-if="userStore.isAuthenticated">
    <div v-if="showMerchantEntrypoints && pendingCount > 0" class="ticket-reminder">
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

    <button type="button" class="user-avatar-container" :aria-label="t('nav.accountMenu')" @click.stop="toggleDropdown">
      <img :src="userAvatar" class="user-avatar" alt="user avatar" />
      <span v-if="showAvatarDot" class="avatar-dot" />
      <span class="user-trigger-copy">
        <span>{{ userDisplayName }}</span>
        <small>{{ accountStatusLabel }}</small>
      </span>
      <span v-if="isPremiumMember" class="premium-badge">{{ t('membership.premiumBadge') }}</span>
      <Icon icon="material-symbols:keyboard-arrow-down-rounded" class="user-trigger-arrow" />
    </button>

    <div class="dropdown-menu" v-if="showDropdown">
      <div class="user-dropdown-profile">
        <img :src="userAvatar" class="user-dropdown-avatar" alt="user avatar" />
        <div class="user-dropdown-identity">
          <strong>{{ userDisplayName }}</strong>
          <span>{{ userEmail }}</span>
        </div>
        <span class="user-dropdown-status" :class="{ premium: isPremiumMember }">
          {{ accountStatusLabel }}
        </span>
      </div>

      <div class="user-dropdown-section">
        <span class="user-dropdown-section-title">{{ t('nav.accountSection') }}</span>
        <button type="button" class="dropdown-item" @click="go('/profile')">
          <span class="user-dropdown-icon"><Icon icon="material-symbols:account-circle" /></span>
          <span class="user-dropdown-copy">
            <strong>{{ t('nav.userProfile') }}</strong>
            <small>{{ t('nav.userInfoDesc') }}</small>
          </span>
          <Icon icon="solar:arrow-right-up-line-duotone" class="dropdown-trailing-icon" />
        </button>
        <button v-if="!userStore.isMerchantUser" type="button" class="dropdown-item" @click="openMembership">
          <span class="user-dropdown-icon accent"><Icon icon="material-symbols:workspace-premium" /></span>
          <span class="user-dropdown-copy">
            <strong>{{ t('nav.membership') }}</strong>
            <small>{{ t('nav.membershipDesc') }}</small>
          </span>
          <Icon icon="solar:arrow-right-up-line-duotone" class="dropdown-trailing-icon" />
        </button>
      </div>

      <div v-if="showMerchantEntrypoints" class="user-dropdown-section">
        <span class="user-dropdown-section-title">{{ t('nav.creatorSection') }}</span>
        <button type="button" class="dropdown-item" @click="go('/devices')">
          <span class="user-dropdown-icon"><Icon icon="material-symbols:extension" /></span>
          <span class="user-dropdown-copy">
            <strong>{{ t('nav.devices') }}</strong>
            <small>{{ t('nav.devicesDesc') }}</small>
          </span>
          <Icon icon="solar:arrow-right-up-line-duotone" class="dropdown-trailing-icon" />
        </button>
        <button type="button" class="dropdown-item" @click="go('/fonts')">
          <span class="user-dropdown-icon"><Icon icon="material-symbols:font-download-outline" /></span>
          <span class="user-dropdown-copy">
            <strong>{{ t('nav.fontPreview') }}</strong>
            <small>{{ t('nav.fontPreviewDesc') }}</small>
          </span>
          <Icon icon="solar:arrow-right-up-line-duotone" class="dropdown-trailing-icon" />
        </button>
        <button type="button" class="dropdown-item" @click="go('/FAQ')">
          <span class="user-dropdown-icon"><Icon icon="material-symbols:help-outline" /></span>
          <span class="user-dropdown-copy">
            <strong>{{ t('nav.helpCenter') }}</strong>
            <small>{{ t('nav.helpCenterDesc') }}</small>
          </span>
          <Icon icon="solar:arrow-right-up-line-duotone" class="dropdown-trailing-icon" />
        </button>
      </div>

      <div v-if="showMerchantEntrypoints" class="user-dropdown-section">
        <span class="user-dropdown-section-title">{{ t('nav.toolsSection') }}</span>
        <button type="button" class="dropdown-item" @click="openSettings">
          <span class="user-dropdown-icon"><Icon icon="material-symbols:settings-outline" /></span>
          <span class="user-dropdown-copy">
            <strong>{{ t('nav.settings') }}</strong>
            <small>{{ t('nav.settingsDesc') }}</small>
          </span>
        </button>
        <button type="button" class="dropdown-item" @click="goTickets">
          <span class="user-dropdown-icon"><Icon icon="material-symbols:confirmation-number-outline" /></span>
          <span class="user-dropdown-copy">
            <strong>{{ t('nav.tickets') }}</strong>
            <small>{{ pendingCount > 0 ? t('nav.ticketsDescWithCount', { count: pendingCount }) : t('nav.ticketsDesc') }}</small>
          </span>
          <span v-if="pendingCount > 0" class="menu-badge">{{ pendingCount }}</span>
        </button>
      </div>

      <button type="button" class="dropdown-item dropdown-logout" @click="handleLogout">
        <span class="user-dropdown-icon danger"><Icon icon="material-symbols:logout" /></span>
        <span class="user-dropdown-copy">
          <strong>{{ t('nav.logout') }}</strong>
          <small>{{ t('nav.logoutDesc') }}</small>
        </span>
      </button>
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
import { cancelPendingSsoRedirect, clearLocalAuthState } from '@/utils/ssoRedirect'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const showDropdown = ref(false)
const designerConfigDialogRef = ref<InstanceType<typeof DesignerDefaultConfigDialog> | null>(null)

const ticketNudgeVisible = ref(false)
const pendingCount = ref<number>(0)
const showMerchantEntrypoints = computed(() => userStore.isMerchantUser)
const showAvatarDot = computed(() => showMerchantEntrypoints.value && pendingCount.value > 0)
const userAvatar = computed(() => userStore.userInfo?.avatar || 'https://cdn.wristo.io/test/avatar/561aae25-41bd-47ab-974e-7231f5a850e8.png')
const userDisplayName = computed(() => userStore.userInfo?.nickname || userStore.userInfo?.username || t('common.unknownUser'))
const userEmail = computed(() => userStore.userInfo?.email || t('profile.noEmail'))
const isPremiumMember = computed(() => {
  if (userStore.isMerchantUser || userStore.isAdminUser) return true
  const membership = userStore.studioMembership
  if (!membership || membership.level === 'free') return false
  return membership.status == null || membership.status === '1' || membership.status === '5'
})
const accountStatusLabel = computed(() => {
  if (userStore.isMerchantUser) return t('nav.merchant')
  if (userStore.isAdminUser) return t('nav.admin')
  return isPremiumMember.value ? t('membership.premiumBadge') : t('nav.account')
})

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const handleLogout = async () => {
  cancelPendingSsoRedirect()
  await userStore.logout()
  clearLocalAuthState()
  showDropdown.value = false
  router.replace('/auth/signed-out')
}

const go = (path: string) => {
  showDropdown.value = false
  router.push(path)
}

const openMembership = () => {
  showDropdown.value = false
  router.push('/pricing')
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
    if (!showMerchantEntrypoints.value) {
      pendingCount.value = 0
      ticketNudgeVisible.value = false
      return
    }
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

.user-avatar-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 4px 11px 4px 5px;
  border: 1px solid rgba(15, 107, 104, 0.12);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.9));
  color: var(--studio-text);
  box-shadow:
    0 10px 24px rgba(17, 24, 39, 0.08),
    0 1px 0 rgba(255, 255, 255, 0.9) inset;
  cursor: pointer;
  font: inherit;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
  touch-action: manipulation;
}

.user-avatar-container:hover,
.user-avatar-container:focus-visible {
  border-color: rgba(15, 107, 104, 0.28);
  background: var(--studio-primary-soft);
  box-shadow:
    0 14px 30px rgba(15, 107, 104, 0.12),
    0 1px 0 rgba(255, 255, 255, 0.95) inset;
  transform: translateY(-1px);
}

.user-avatar-container:focus-visible {
  outline: 3px solid rgba(15, 107, 104, 0.22);
  outline-offset: 3px;
}

.user-avatar-container:active {
  transform: translateY(0) scale(0.98);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(15, 107, 104, 0.12);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.user-avatar-container:hover .user-avatar {
  box-shadow: 0 0 0 2px rgba(15, 107, 104, 0.22);
  transform: scale(1.03);
}

.avatar-dot {
  position: absolute;
  top: 5px;
  left: 34px;
  width: 14px;
  height: 14px;
  background-color: #ff4d4f;
  border-radius: 50%;
  border: 2px solid #fff;
}

.user-trigger-copy {
  min-width: 0;
  max-width: 116px;
  display: grid;
  gap: 1px;
  text-align: left;
}

.user-trigger-copy span,
.user-trigger-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-trigger-copy span {
  color: var(--studio-text);
  font-size: 0.85rem;
  font-weight: 800;
  line-height: 1.2;
}

.user-trigger-copy small {
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 750;
  line-height: 1.2;
}

.user-trigger-arrow {
  width: 18px;
  height: 18px;
  color: #64748b;
  transition: transform 0.18s ease, color 0.18s ease;
}

.user-avatar-container:hover .user-trigger-arrow {
  color: var(--studio-primary);
  transform: translateY(1px);
}

.premium-badge {
  position: absolute;
  bottom: -7px;
  left: 24px;
  z-index: 1;
  padding: 2px 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  color: #111827;
  background: linear-gradient(135deg, #fde68a, #f59e0b);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 10px;
  font-weight: 700;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 1000;
  width: 344px;
  padding: 10px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 20px;
  background: #fff;
  box-shadow:
    0 28px 70px rgba(15, 23, 42, 0.18),
    0 1px 0 rgba(255, 255, 255, 0.86) inset;
  transform-origin: top right;
  animation: dropdown-fade 0.2s ease;
}

.user-dropdown-profile {
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  padding: 10px;
  margin-bottom: 8px;
  border: 1px solid rgba(15, 107, 104, 0.10);
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(15, 107, 104, 0.09), rgba(245, 179, 68, 0.10)),
    #fff;
}

.user-dropdown-avatar {
  width: 50px;
  height: 50px;
  border-radius: 15px;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
}

.user-dropdown-identity,
.user-dropdown-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.user-dropdown-identity strong,
.user-dropdown-identity span,
.user-dropdown-copy strong,
.user-dropdown-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-dropdown-identity strong {
  color: var(--studio-text);
  font-size: 0.98rem;
  font-weight: 900;
  line-height: 1.25;
}

.user-dropdown-identity span {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 650;
}

.user-dropdown-status {
  align-self: start;
  padding: 4px 8px;
  border-radius: 999px;
  color: #475569;
  background: rgba(15, 23, 42, 0.06);
  font-size: 0.68rem;
  font-weight: 900;
}

.user-dropdown-status.premium {
  color: #111827;
  background: linear-gradient(135deg, #fde68a, #f59e0b);
}

.user-dropdown-section {
  display: grid;
  gap: 4px;
  padding: 7px 0;
  border-top: 1px solid rgba(15, 23, 42, 0.07);
}

.user-dropdown-section-title {
  padding: 0 8px 2px;
  color: var(--studio-primary);
  font-size: 0.7rem;
  font-weight: 900;
  line-height: 1.2;
  text-transform: uppercase;
}

.dropdown-item {
  width: 100%;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 8px;
  border: 0;
  border-radius: 14px;
  color: var(--studio-text);
  background: transparent;
  cursor: pointer;
  font: inherit;
  line-height: 1.2;
  text-align: left;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.dropdown-item:hover,
.dropdown-item:focus {
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
  transform: translateY(-1px);
}

.user-dropdown-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: var(--studio-primary);
  background: rgba(15, 107, 104, 0.09);
}

.user-dropdown-icon.accent {
  color: #92400e;
  background: rgba(245, 179, 68, 0.16);
}

.user-dropdown-icon.danger {
  color: #b91c1c;
  background: rgba(220, 38, 38, 0.10);
}

.user-dropdown-icon svg {
  width: 18px;
  height: 18px;
}

.user-dropdown-copy strong {
  color: inherit;
  font-size: 0.9rem;
  font-weight: 850;
}

.user-dropdown-copy small {
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 650;
}

.dropdown-item:hover .user-dropdown-copy small,
.dropdown-item:focus .user-dropdown-copy small {
  color: #0f766e;
}

.dropdown-trailing-icon {
  width: 18px;
  height: 18px;
  color: currentColor;
  opacity: 0.72;
}

.dropdown-logout {
  margin-top: 6px;
  border-top: 1px solid rgba(15, 23, 42, 0.07);
  color: #b91c1c;
}

.dropdown-logout:hover,
.dropdown-logout:focus {
  color: #991b1b;
  background: rgba(220, 38, 38, 0.08);
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

  .user-avatar-container {
    width: 44px;
    height: 44px;
    min-height: 44px;
    justify-content: center;
    padding: 0;
  }

  .user-avatar {
    width: 36px;
    height: 36px;
  }

  .user-trigger-copy,
  .user-trigger-arrow,
  .premium-badge {
    display: none;
  }

  .avatar-dot {
    top: 4px;
    left: 28px;
  }

  .dropdown-menu {
    right: 0;
    width: min(344px, calc(100vw - 24px));
  }
}

:global(html[data-studio-theme='dark']) .ticket-nudge,
:global(html[data-studio-theme='dark']) .dropdown-menu {
  background-color: var(--studio-surface-raised);
  border-color: var(--studio-border);
  box-shadow: var(--studio-shadow-md);
}

:global(html[data-studio-theme='dark']) .ticket-nudge-copy strong,
:global(html[data-studio-theme='dark']) .dropdown-item {
  color: var(--studio-text);
}

:global(html[data-studio-theme='dark']) .user-avatar-container {
  background: var(--studio-surface-raised);
  border-color: var(--studio-border);
  box-shadow: var(--studio-shadow-sm);
}

:global(html[data-studio-theme='dark']) .user-dropdown-profile {
  background:
    linear-gradient(135deg, rgba(15, 107, 104, 0.18), rgba(245, 179, 68, 0.12)),
    var(--studio-surface);
  border-color: var(--studio-border);
}

:global(html[data-studio-theme='dark']) .ticket-nudge-copy span {
  color: var(--studio-text-muted);
}

:global(html[data-studio-theme='dark']) .ticket-nudge-close {
  color: var(--studio-text-muted);
}

:global(html[data-studio-theme='dark']) .ticket-nudge-close:hover,
:global(html[data-studio-theme='dark']) .dropdown-item:hover {
  background-color: var(--studio-primary-soft);
  color: var(--studio-primary);
}

:global(html[data-studio-theme='dark']) .user-avatar,
:global(html[data-studio-theme='dark']) .user-dropdown-avatar,
:global(html[data-studio-theme='dark']) .avatar-dot {
  border-color: var(--studio-surface-raised);
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
