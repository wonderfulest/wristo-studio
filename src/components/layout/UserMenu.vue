<template>
  <div class="user-menu" v-if="userStore.isAuthenticated">
    <div class="user-avatar" @click.stop="toggleDropdown">
      <div class="avatar-circle" :style="{ backgroundColor: avatarColor }">
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
      <div class="dropdown-item" @click="go('/devices')">
        <Icon icon="material-symbols:extension" />
        Devices
      </div>
      <div class="dropdown-item" @click="go('/fonts')">
        <Icon icon="material-symbols:font-download-outline" />
        Font Preview
      </div>
      <div class="dropdown-item" @click="go('/FAQ')">
        <Icon icon="material-symbols:help-outline" />
        Help Center
      </div>
      <div class="dropdown-item" @click="openSettings">
        <Icon icon="material-symbols:settings-outline" />
        Settings
      </div>
      <div class="dropdown-item" @click="goTickets">
        <Icon icon="material-symbols:confirmation-number-outline" />
        <span>Tickets</span>
        <span v-if="pendingCount > 0" class="menu-badge">{{ pendingCount }}</span>
      </div>
      <div class="dropdown-divider"></div>
      <div class="dropdown-item" @click="handleLogout">
        <Icon icon="material-symbols:logout" />
        Logout
      </div>
    </div>

    <el-dialog
      v-model="ticketsAlertVisible"
      title="Ticket Reminder"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div>
        You have {{ pendingCount }} pending ticket(s) to process.
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelTicketsAlert">Cancel</el-button>
          <el-button type="primary" @click="confirmTicketsAlert">View Tickets</el-button>
        </span>
      </template>
    </el-dialog>

    <WPayTokenDialog ref="wpayDialogRef" />
    <DesignerDefaultConfigDialog ref="designerConfigDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import WPayTokenDialog from '@/components/dialogs/WPayTokenDialog.vue'
import { ticketsApi } from '@/api/wristo/tickets'
import DesignerDefaultConfigDialog from '@/components/dialogs/DesignerDefaultConfigDialog.vue'

const router = useRouter()
const userStore = useUserStore()

const showDropdown = ref(false)
const usernameRef = ref<HTMLElement | null>(null)
const isUsernameTruncated = ref(false)
const wpayDialogRef = ref<InstanceType<typeof WPayTokenDialog> | null>(null)
const designerConfigDialogRef = ref<InstanceType<typeof DesignerDefaultConfigDialog> | null>(null)

const ticketsAlertVisible = ref(false)
const pendingCount = ref<number>(0)
const showAvatarDot = computed(() => pendingCount.value > 0)

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
  router.push('/tickets')
}

const openSettings = () => {
  showDropdown.value = false
  designerConfigDialogRef.value?.show()
}

const cancelTicketsAlert = () => {
  ticketsAlertVisible.value = false
}

const confirmTicketsAlert = () => {
  ticketsAlertVisible.value = false
  showDropdown.value = false
  router.push('/tickets')
}

const fetchPendingTickets = async () => {
  try {
    const assigneeId = userStore.userInfo?.id
    if (!assigneeId) return
    const res = await ticketsApi.count(assigneeId, 'open')
    const cnt = res.data
    if (typeof cnt === 'number' && cnt > 0) {
      pendingCount.value = cnt
      ticketsAlertVisible.value = true
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
  height: 60px;
  display: flex;
  align-items: center;
}

.user-avatar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-avatar:hover {
  background-color: rgba(0, 0, 0, 0.04);
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

.user-avatar:hover .avatar-circle {
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
  color: #333;
  font-weight: 500;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  min-width: 180px;
  padding: 6px;
  z-index: 1000;
  transform-origin: top right;
  animation: dropdown-fade 0.2s ease;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  color: #333;
  font-size: 14px;
  transition: all 0.2s ease;
  border-radius: 6px;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: rgba(33, 150, 243, 0.08);
  color: #2196F3;
}

.dropdown-divider {
  height: 1px;
  background-color: #f0f0f0;
  margin: 6px;
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
