<template>
  <div class="my-designs">
    <AppBuildVersion />
    <div v-if="userStore.studioMembership" class="design-capacity">
      <span v-if="userStore.isStudioConsumer">{{ t('membership.designCapacity', { used: userStore.studioMembership.designCount, limit: userStore.studioMembership.maxDesigns ?? '∞', unlocked: userStore.studioMembership.unlockedDesignCount ?? 0 }) }}</span>
      <span v-else>{{ userStore.studioMembership.designCount }} / {{ userStore.studioMembership.maxDesigns ?? '∞' }} {{ t('membership.appsUsed') }}</span>
      <RouterLink v-if="!userStore.isStudioConsumer" to="/design-slots">{{ t('membership.addSlots') }}</RouterLink>
    </div>
    <!-- 搜索栏 -->
    <div class="search-bar">
      <div class="filter-fields">
        <!-- 当前设备展示与选择 -->
        <div class="filter-field">
          <span class="filter-label">{{ t('project.device') }}</span>
          <DeviceDisplay ref="deviceDisplayRef" />
        </div>
        <div class="filter-field">
          <span class="filter-label">{{ t('project.searchName') }}</span>
          <el-input
            v-model="searchName"
            :placeholder="t('project.searchName')"
            class="name-filter"
            clearable
            @keyup.enter="handleSearch"
          />
        </div>
        <div class="filter-field">
          <span class="filter-label">{{ t('project.searchAppId') }}</span>
          <el-input
            v-model="searchAppId"
            :placeholder="t('project.searchAppId')"
            class="app-id-filter"
            clearable
            inputmode="numeric"
            @keyup.enter="handleSearch"
          />
        </div>
        <div class="filter-field">
          <span class="filter-label">{{ t('project.status') }}</span>
          <el-select
            v-model="selectedStatus"
            :placeholder="t('project.status')"
            clearable
            class="status-filter"
            @change="handleStatusChange"
          >
            <el-option :label="t('common.all')" value="" />
            <el-option :label="t('status.draft')" value="draft" />
            <el-option :label="t('status.submitted')" value="submitted" />
            <el-option :label="t('status.approved')" value="approved" />
            <el-option :label="t('status.rejected')" value="rejected" />
          </el-select>
        </div>
        <div class="filter-field">
          <span class="filter-label">{{ t('project.launchStatus') }}</span>
          <el-select
            v-model="selectedLaunchStatus"
            :placeholder="t('project.launchStatus')"
            clearable
            class="status-filter"
            @change="handleStatusChange"
          >
            <el-option :label="t('common.all')" value="" />
            <el-option :label="t('project.launched')" value="launched" />
            <el-option :label="t('project.notLaunched')" value="not_launched" />
            <el-option :label="t('project.updateAvailable')" value="update_available" />
          </el-select>
        </div>

        <div class="filter-field">
          <span class="filter-label">{{ t('submitDesign.paymentMethod') }}</span>
          <el-select
            v-model="selectedPaymentMethod"
            :placeholder="t('submitDesign.paymentMethod')"
            clearable
            class="payment-filter"
            @change="handleStatusChange"
          >
            <el-option :label="t('payment.free')" value="free" />
            <el-option label="WPay" value="wpay" />
            <el-option :label="t('payment.garminOfficial')" value="garmin" />
          </el-select>
        </div>
        <el-button type="primary" :disabled="versionInvalid" @click="handleSearch">
          <Icon icon="material-symbols:search" />
          {{ t('common.search') }}
        </el-button>
        <el-button @click="resetSearch">{{ t('common.resetFilters') }}</el-button>
      </div>
      <div v-if="isAdminUser" class="admin-filters">
        <div class="admin-filter-heading">
          <Icon icon="material-symbols:admin-panel-settings-outline-rounded" />
          <span>{{ t('project.adminFilters') }}</span>
        </div>
        <div class="filter-field version-field">
          <div class="version-label"><span class="filter-label">Connect IQ App Build</span><a href="https://dashboard.wristo.io/ops/platform-versions" target="_blank" rel="noopener noreferrer">{{ t('project.manageVersions') }}</a></div>
          <div class="version-inputs">
            <el-select
              v-model="packagedVersionOperator"
              :aria-label="t('project.versionComparison')"
              class="version-operator"
              @change="handleSearch"
            >
              <el-option
                v-for="option in versionOperators"
                :key="option.value"
                :value="option.value"
                :label="option.label"
              />
            </el-select>
            <el-select v-model="packagedVersion" :placeholder="t('project.chooseVersion')" :aria-label="t('project.packagedVersion')" filterable clearable :loading="versionsLoading" @visible-change="handleVersionDropdown" @change="handleSearch">
              <el-option v-for="item in appBuildVersions" :key="item.version" :label="item.version" :value="item.version" />
            </el-select>
          </div>
          <span v-if="versionInvalid" class="filter-error" role="alert">{{ t('project.invalidVersion') }}</span>
        </div>
        <div class="filter-field" v-if="isAdminUser">
          <span class="filter-label">{{ t('project.searchDesigner') }}</span>
          <div class="designer-filter">
            <DesignerSelect
              :model-value="selectedCreatorUserId"
              :placeholder="t('project.searchDesigner')"
              @update:model-value="handleCreatorChange"
            />
          </div>
        </div>
        <div class="filter-field">
          <span class="filter-label">{{ t('project.designScope') }}</span>
      <el-segmented
        v-if="isAdminUser"
        v-model="designScope"
        :options="designScopeOptions"
        class="scope-filter"
        @change="handleDesignScopeChange"
      />
        </div>
      <div class="display-options">
        <el-switch
          v-model="showCreator"
          :active-text="t('project.showCreator')"
          :aria-label="t('project.showCreator')"
        />
      </div>
      </div>
      <div class="filter-preferences">
        <Icon class="sort-icon" icon="material-symbols:sort-rounded" aria-hidden="true" />
      <el-select v-model="sortField" :placeholder="t('project.sortField')" @change="handleSortChange" class="sort-field-filter">
        <el-option :label="t('project.createdTime')" value="created_at" />
        <el-option :label="t('project.updatedTime')" value="updated_at" />
        <el-option v-if="isAdminUser" :label="t('card.storeWeight')" value="store_weight" />
      </el-select>
      <el-select v-model="sortOrder" :disabled="sortField === 'store_weight'" :placeholder="t('project.sortOrder')" @change="handleSortChange" class="sort-order-filter">
        <el-option :label="t('project.ascending')" value="asc" />
        <el-option :label="t('project.descending')" value="desc" />
      </el-select>
    <el-button v-if="isAdminUser" class="batch-mode-toggle" :disabled="batchTransferBusy" @click="toggleBatchMode">{{ t(batchMode ? 'batchActions.exit' : 'batchActions.title') }}</el-button>
    <BatchDesignActions v-if="batchMode && isAdminUser"
      v-model="selectedDesignIds" :designs="designs" :is-admin="isAdminUser"
      :loading="listLoading" :context-key="batchContextKey" :device-id="currentDeviceId"
      @busy="batchTransferBusy = $event" @updated="fetchDesigns(requestParams)"
    />
      <span class="collection-count">{{ t('project.designCount', { count: total }) }}</span>
      <div class="collection-controls">
        <div class="view-switch" role="group" :aria-label="t('project.viewMode')">
          <button
            v-for="mode in viewModes"
            :key="mode"
            type="button"
            :aria-pressed="viewMode === mode"
            :class="{ active: viewMode === mode }"
            @click="viewMode = mode"
          >
            <Icon :icon="mode === 'list' ? 'material-symbols:format-list-bulleted-rounded' : 'material-symbols:grid-view-outline-rounded'" />
            {{ t(mode === 'list' ? 'project.listView' : 'project.gridView') }}
          </button>
        </div>
        <el-button type="primary" @click="confirmGoToNewProject">
          <Icon icon="material-symbols:add-rounded" />
          {{ t('project.newProject') }}
        </el-button>
      </div>
      </div>
    </div>

    <div :ref="el => container = el as HTMLElement | null" class="design-table-scroll" :class="{ 'is-list': viewMode === 'list' }">
    <div class="design-collection" :class="`design-collection--${viewMode}`" :style="{ '--design-grid-columns': columns }">
      <div class="design-item" :class="{ 'is-selectable': batchMode && isAdminUser, 'is-selected': batchMode && selectedDesignIds.includes(design.id) }" v-for="design in designs" :key="design.id">
        <label v-if="isAdminUser && batchMode" class="design-selection" @click.stop>
          <input type="checkbox"
            :aria-label="t('batchTransfer.selectDesign', { name: design.name })"
            :checked="selectedDesignIds.includes(design.id)"
            :disabled="batchTransferBusy || listLoading"
            @change="toggleDesignSelection(design, ($event.target as HTMLInputElement).checked)" />
        </label>
        <DesignCard
          :design="design"
          :view-mode="viewMode"
          summary-only
          :show-package-download="true"
          :is-merchant-user="isMerchantUser"
          :is-admin-user="isAdminUser"
          :can-delete-design="isAdminUser"
          @delete="deleteDesign"
          :show-creator="showCreator"
          :loading-states="emptyLoadingStates"
          :current-user-id="userStore.userInfo?.id ?? null"
          :status-text="getStatusText(design.designStatus)"
          :status-color="getStatusColor(design.designStatus)"
          :last-go-live-text="formatDateNullable(design.product?.lastGoLive)"
          :creator-name="getCreatorName(design)"
          :design-image-url="getDesignImageUrl(design)"
          :has-new-release="false"
          :has-downloadable-package="false"
        />
      </div>
    </div>

    </div>

    <!-- 分页组件 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="pageSizes"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </div>

    <!-- 空列表提示对话框：引导用户前往 New Project 创建第一个应用 -->
    <el-dialog v-model="noDesignDialogVisible" :title="t('project.noProjectsTitle')" width="30%" :modal="false">
      <span>{{ t('project.noProjectsBody') }}</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="noDesignDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="confirmGoToNewProject">{{ t('project.goToNewProject') }}</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import BatchDesignActions from './BatchDesignActions.vue'
import AppBuildVersion from '@/components/layout/AppBuildVersion.vue'
import { showErrorOnce } from '@/utils/errorMessage'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { onboarding } from '@/features/onboarding/progress'
import { Icon } from '@iconify/vue'
import { designApi } from '@/api/wristo/design'
import { useMessageStore } from '@/stores/message'
import dayjs from 'dayjs'
import { useUserStore } from '@/stores/user'
import type { ApiResponse, PageResponse } from '@/types/api/api'
import DeviceDisplay from '@/components/common/DeviceDisplay.vue'
import DesignerSelect from '@/components/users/DesignerSelect.vue'
import type { DesignListItem, DesignStatus, LaunchStatus, DesignPageParams } from '@/types/api/design'
import DesignCard from '@/views/designs/DesignCard.vue'
import { useI18n } from '@/i18n'
import { useDesignPagination } from './useDesignPagination'
import { normalizePositiveAppId, isPackagedVersion, versionOperators, type VersionOperator } from '@/views/designs/designSearch'
import { normalizeDesignSort, toDesignOrderBy, type DesignSortField, type DesignSortOrder } from '@/views/designs/designSort'
const router = useRouter()
const messageStore = useMessageStore()
const userStore = useUserStore()
const currentDeviceId = computed(() => userStore.userInfo?.device?.deviceId || '')
const { t } = useI18n()
const viewModes = ['list', 'grid'] as const
const viewMode = ref<'list' | 'grid'>(readViewMode())

function readViewMode(): 'list' | 'grid' {
  try {
    return window.localStorage.getItem('wristo-studio:design-view-mode') === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

watch(viewMode, (mode) => {
  try {
    window.localStorage.setItem('wristo-studio:design-view-mode', mode)
  } catch {
    // The view remains usable when browser storage is unavailable.
  }
})
const designs = ref<DesignListItem[]>([])
const selectedDesignIds = ref<number[]>([])
const batchMode = ref(false)
const toggleBatchMode = () => {
  if (!isAdminUser.value || batchTransferBusy.value) return
  selectedDesignIds.value = []
  batchMode.value = !batchMode.value
}
const batchTransferBusy = ref(false)
const listLoading = ref(false)
const toggleDesignSelection = (design: DesignListItem, checked: unknown) => {
  if (!isAdminUser.value || !batchMode.value || batchTransferBusy.value || listLoading.value) return
  selectedDesignIds.value = checked
    ? [...new Set([...selectedDesignIds.value, design.id])]
    : selectedDesignIds.value.filter(id => id !== design.id)
}
const { container, columns, currentPage, pageSize, pageSizes, ready } = useDesignPagination(viewMode)
const refreshVersion = ref(0)
const total = ref(0)
const noDesignDialogVisible = ref(false)
const emptyLoadingStates = ref({ submit: new Set<number>(), copy: new Set<number>(), delete: new Set<number>(), favorite: new Set<number>(), prgBuild: new Set<number>(), previewPrg: new Set<number>() })

const deleteDesign = async (design: DesignListItem) => {
  if (!isAdminUser.value || design.product?.lastGoLive || emptyLoadingStates.value.delete.has(design.id)) return
  emptyLoadingStates.value.delete.add(design.id)
  try {
    try {
      await ElMessageBox.confirm(`${design.name} — ${t('project.deleteBody')}`, t('project.confirmDelete'), {
        type: 'warning',
        confirmButtonText: t('project.confirmDeleteButton'),
        cancelButtonText: t('common.cancel'),
      })
    } catch {
      return
    }
    if (!isAdminUser.value) return
    const response = await designApi.deleteDesign(design.designUid)
    if (response.code !== 0) {
      messageStore.error(response.msg || t('project.deleteFailed'))
      return
    }
    messageStore.success(t('project.deleteSuccessful'))
    if (designs.value.length === 1 && currentPage.value > 1) currentPage.value--
    refreshVersion.value++
  } catch (error) {
    showErrorOnce(error, t('project.deleteFailed'))
  } finally {
    emptyLoadingStates.value.delete.delete(design.id)
  }
}

// 搜索相关状态
interface DesignSearchPreference {
  searchName: string
  packagedVersion: string
  packagedVersionOperator: VersionOperator
  searchAppId: string
  selectedCreatorUserId?: number
  selectedStatus: DesignStatus | ''
  selectedPaymentMethod: 'free' | 'wpay' | 'garmin' | ''
  selectedLaunchStatus: LaunchStatus | ''
  sortField: DesignSortField
  sortOrder: DesignSortOrder
}

const DESIGN_SEARCH_STORAGE_KEY = 'wristo-studio:my-designs:search'

const isDesignStatusValue = (value: unknown): value is DesignStatus | '' => {
  return value === '' || value === 'draft' || value === 'submitted' || value === 'approved' || value === 'rejected'
}

const isLaunchStatusValue = (value: unknown): value is LaunchStatus | '' => {
  return value === '' || value === 'launched' || value === 'not_launched' || value === 'update_available'
}

const isDesignSortField = (value: unknown): value is DesignSortField => {
  return value === 'created_at' || value === 'updated_at' || value === 'store_weight'
}

const isDesignSortOrder = (value: unknown): value is DesignSortOrder => {
  return value === 'asc' || value === 'desc'
}

const normalizeCreatorUserId = (value: unknown): number | undefined => {
  const userId = Number(value)
  return Number.isInteger(userId) && userId > 0 ? userId : undefined
}

const defaultDesignSearchPreference = (): DesignSearchPreference => ({
  searchName: '',
  searchAppId: '',
  packagedVersion: '',
  packagedVersionOperator: 'lt',
  selectedCreatorUserId: undefined,
  selectedStatus: '',
  selectedLaunchStatus: '',
  selectedPaymentMethod: '',
  sortField: 'updated_at',
  sortOrder: 'desc'
})

const readDesignSearchPreference = (): DesignSearchPreference => {
  const defaults = defaultDesignSearchPreference()
  if (typeof window === 'undefined') return defaults

  try {
    const raw = window.localStorage.getItem(DESIGN_SEARCH_STORAGE_KEY)
    if (!raw) return defaults

    const parsed = JSON.parse(raw) as Partial<DesignSearchPreference>
    return {
      packagedVersion: typeof parsed.packagedVersion === 'string' && isPackagedVersion(parsed.packagedVersion) ? parsed.packagedVersion : '',
      packagedVersionOperator: versionOperators.some(option => option.value === parsed.packagedVersionOperator) ? parsed.packagedVersionOperator! : 'lt',
      searchName: typeof parsed.searchName === 'string' ? parsed.searchName : defaults.searchName,
      searchAppId: typeof parsed.searchAppId === 'string' ? parsed.searchAppId : defaults.searchAppId,
      selectedPaymentMethod: parsed.selectedPaymentMethod === 'free' || parsed.selectedPaymentMethod === 'wpay' || parsed.selectedPaymentMethod === 'garmin' ? parsed.selectedPaymentMethod : '',
      selectedCreatorUserId: normalizeCreatorUserId(parsed.selectedCreatorUserId),
      selectedStatus: isDesignStatusValue(parsed.selectedStatus) ? parsed.selectedStatus : defaults.selectedStatus,
      selectedLaunchStatus: isLaunchStatusValue(parsed.selectedLaunchStatus) ? parsed.selectedLaunchStatus : defaults.selectedLaunchStatus,
      sortField: isDesignSortField(parsed.sortField) ? parsed.sortField : defaults.sortField,
      sortOrder: isDesignSortOrder(parsed.sortOrder) ? parsed.sortOrder : defaults.sortOrder
    }
  } catch (error) {
    console.warn('[MyDesigns] read design search preference failed:', error)
    return defaults
  }
}

const writeDesignSearchPreference = (preference: DesignSearchPreference) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(DESIGN_SEARCH_STORAGE_KEY, JSON.stringify(preference))
  } catch (error) {
    console.warn('[MyDesigns] write design search preference failed:', error)
  }
}

const guidedList = onboarding.progress.status === 'active' && onboarding.progress.step === 'detail'
const savedDesignSearch = guidedList ? defaultDesignSearchPreference() : readDesignSearchPreference()
const initialSort = normalizeDesignSort(savedDesignSearch.sortField, savedDesignSearch.sortOrder, userStore.isAdminUser)
const initialDesignSearch = { ...savedDesignSearch, sortField: initialSort.field, sortOrder: initialSort.order }
const packagedVersion = ref(initialDesignSearch.packagedVersion)
const packagedVersionOperator = ref<VersionOperator>(initialDesignSearch.packagedVersionOperator)
const versionInvalid = computed(() => !!packagedVersion.value.trim() && !isPackagedVersion(packagedVersion.value))
const searchName = ref(initialDesignSearch.searchName)
const searchAppId = ref(initialDesignSearch.searchAppId)
const selectedCreatorUserId = ref<number | undefined>(initialDesignSearch.selectedCreatorUserId)
const selectedStatus = ref<DesignStatus | ''>(initialDesignSearch.selectedStatus)
const selectedPaymentMethod = ref(initialDesignSearch.selectedPaymentMethod)
const selectedLaunchStatus = ref<LaunchStatus | ''>(initialDesignSearch.selectedLaunchStatus)
const sortField = ref<DesignSortField>(initialDesignSearch.sortField)
const sortOrder = ref<DesignSortOrder>(initialDesignSearch.sortOrder)

// 是否为商家用户（拥有 ROLE_MERCHANT 角色）
const isMerchantUser = computed(() => {
  const roles = userStore.userInfo?.roles || []
  return roles.some((role) => role.roleCode === 'ROLE_MERCHANT')
})

const isAdminUser = computed(() => userStore.isAdminUser)
const appBuildVersions = ref<Array<{ version: string }>>([])
const versionsLoading = ref(false)
const handleVersionDropdown = (visible: boolean) => { if (visible) void loadAppBuildVersions() }
const loadAppBuildVersions = async () => {
  if (!isAdminUser.value || versionsLoading.value) return
  versionsLoading.value = true
  try {
    const response = await designApi.getAppBuildVersions()
    if (response.code !== 0) throw new Error(response.msg || t('project.versionsLoadFailed'))
    appBuildVersions.value = (response.data || []).filter(item => isPackagedVersion(item.version))
  } catch (error) { showErrorOnce(error, t('project.versionsLoadFailed')) }
  finally { versionsLoading.value = false }
}

type DesignScope = 'mine' | 'all'

const DESIGN_SCOPE_STORAGE_KEY = 'wristo-studio:my-designs:scope'

const isDesignScope = (value: string | null): value is DesignScope => value === 'mine' || value === 'all'

const readDesignScopePreference = (): DesignScope | null => {
  if (typeof window === 'undefined') return null

  try {
    const value = window.localStorage.getItem(DESIGN_SCOPE_STORAGE_KEY)
    return isDesignScope(value) ? value : null
  } catch (error) {
    console.warn('[MyDesigns] read design scope preference failed:', error)
    return null
  }
}

const writeDesignScopePreference = (scope: DesignScope) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(DESIGN_SCOPE_STORAGE_KEY, scope)
  } catch (error) {
    console.warn('[MyDesigns] write design scope preference failed:', error)
  }
}

const getPreferredDesignScope = (isAdmin: boolean): DesignScope => {
  if (!isAdmin) return 'mine'
  return readDesignScopePreference() || 'all'
}

const initialDesignScope = guidedList ? 'mine' : getPreferredDesignScope(isAdminUser.value)

// 添加作者显示控制
const showCreator = ref(isAdminUser.value && initialDesignScope === 'all')  // 管理员默认查看全部设计时展示作者
const designScope = ref<DesignScope>(initialDesignScope)
const designScopeOptions = computed(() => [
  { label: t('project.scopeMine'), value: 'mine' },
  { label: t('project.scopeAll'), value: 'all' }
])

// 处理搜索
const handleSearch = () => {
  if (versionInvalid.value) return
  currentPage.value = 1
  refreshVersion.value++
}

const resetSearch = () => {
  searchName.value = ''
  searchAppId.value = ''
  selectedCreatorUserId.value = undefined
  selectedStatus.value = ''
  selectedLaunchStatus.value = ''
  selectedPaymentMethod.value = ''
  packagedVersion.value = ''
  packagedVersionOperator.value = 'lt'
  handleSearch()
}

// 处理排序变化
const handleSortChange = () => {
  const normalized = normalizeDesignSort(sortField.value, sortOrder.value, isAdminUser.value)
  sortField.value = normalized.field
  sortOrder.value = normalized.order
  currentPage.value = 1
  refreshVersion.value++
}

const handleStatusChange = () => {
  currentPage.value = 1
  refreshVersion.value++
}

const handleCreatorChange = (creatorUserId?: number) => {
  selectedCreatorUserId.value = normalizeCreatorUserId(creatorUserId)
  currentPage.value = 1
  refreshVersion.value++
}

const handleDesignScopeChange = () => {
  currentPage.value = 1
  writeDesignScopePreference(designScope.value)
  if (designScope.value === 'all') {
    showCreator.value = true
  }
  refreshVersion.value++
}

watch(isAdminUser, (isAdmin) => {
  if (!isAdmin) {
    batchMode.value = false
    selectedDesignIds.value = []
    selectedCreatorUserId.value = undefined
    packagedVersion.value = ''
    const normalized = normalizeDesignSort(sortField.value, sortOrder.value, false)
    sortField.value = normalized.field
    sortOrder.value = normalized.order
  }
  const nextScope = getPreferredDesignScope(isAdmin)
  if (designScope.value === nextScope) return

  designScope.value = nextScope
  currentPage.value = 1
  if (isAdmin) {
    showCreator.value = true
  }
  refreshVersion.value++
})

watch(
  [packagedVersion, packagedVersionOperator, searchName, searchAppId, selectedCreatorUserId, selectedStatus, selectedLaunchStatus, selectedPaymentMethod, sortField, sortOrder],
  () => {
    writeDesignSearchPreference({
      packagedVersion: packagedVersion.value,
      packagedVersionOperator: packagedVersionOperator.value,
      searchName: searchName.value,
      searchAppId: searchAppId.value,
      selectedCreatorUserId: selectedCreatorUserId.value,
      selectedStatus: selectedStatus.value,
      selectedLaunchStatus: selectedLaunchStatus.value,
      selectedPaymentMethod: selectedPaymentMethod.value,
      sortField: sortField.value,
      sortOrder: sortOrder.value
    })
  }
)

// 获取状态文本
const getStatusText = (status: DesignStatus) => {
  const statusMap = {
    draft: t('status.draft'),
    submitted: t('status.submitted'),
    approved: t('status.approved'),
    rejected: t('status.rejected')
  }
  return statusMap[status as keyof typeof statusMap] || t('status.unknown')
}

// 获取状态颜色
const getStatusColor = (status: DesignStatus) => {
  const statusMap = {
    draft: '#606266',        // 暗色 - 草稿状态
    submitted: '#909399',    // 灰色 - 待审核状态
    approved: '#67C23A',     // 亮色 - 已批准状态
    rejected: '#F56C6C'      // 红色 - 被拒绝状态
  }
  return statusMap[status as keyof typeof statusMap] || '#909399'
}

// 格式化可空日期（用于 Last Publish）
const formatDateNullable = (date: string | number | null | undefined) => {
  if (!date) return t('common.never')
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 获取创作者名称
const getCreatorName = (design: DesignListItem) => {
  return design.user?.username || t('common.unknownUser')
}

// 获取设计图片URL
const getDesignImageUrl = (design: DesignListItem) => {
  return design.cover?.url || ''
}

// Capture filters when Search/sort/filter controls explicitly apply them.
const appliedFilters = ref<Partial<DesignPageParams>>({})
watch(refreshVersion, () => {
  if (versionInvalid.value) return
  appliedFilters.value = {
    packagedVersion: isAdminUser.value ? packagedVersion.value.trim() || undefined : undefined,
    packagedVersionOperator: isAdminUser.value && packagedVersion.value.trim() ? packagedVersionOperator.value : undefined,
    designStatus: selectedStatus.value || undefined,
    launchStatus: selectedLaunchStatus.value || undefined,
    paymentMethod: selectedPaymentMethod.value || undefined,
    name: searchName.value,
    appId: normalizePositiveAppId(searchAppId.value),
    creatorUserId: isAdminUser.value ? selectedCreatorUserId.value : undefined,
    orderBy: toDesignOrderBy(sortField.value, sortOrder.value, isAdminUser.value),
    scope: isAdminUser.value ? designScope.value : 'mine',
  }
}, { immediate: true, flush: 'sync' })
const requestParams = computed<DesignPageParams>(() => ({
  ...appliedFilters.value,
  pageNum: currentPage.value,
  pageSize: pageSize.value,
  device: currentDeviceId.value || undefined,
  summaryOnly: true,
}))
const batchContextKey = computed(() => JSON.stringify([
  requestParams.value, refreshVersion.value, searchName.value, searchAppId.value,
  packagedVersion.value, packagedVersionOperator.value, selectedCreatorUserId.value,
  selectedStatus.value, selectedLaunchStatus.value, selectedPaymentMethod.value,
  sortField.value, sortOrder.value, designScope.value,
]))
let requestVersion = 0
const fetchDesigns = async (params: DesignPageParams) => {
  const version = ++requestVersion
  listLoading.value = true
  try {
    const response: ApiResponse<PageResponse<DesignListItem>> = await designApi.getDesignCards(params)
    if (version !== requestVersion) return

    if (response.code === 0 && response.data) {
      designs.value = response.data.list
      selectedDesignIds.value = selectedDesignIds.value.filter(id => designs.value.some(design => design.id === id))
      total.value = response.data.total

      // 如果在第一页且没有任何设计，则提示用户前往 New Project 创建第一个应用
      if (params.scope === 'mine' && !params.paymentMethod && !params.packagedVersion && !params.name && !params.appId && !params.creatorUserId && !params.designStatus && !params.launchStatus && currentPage.value === 1 && response.data.list.length === 0) {
        noDesignDialogVisible.value = true
      }

    } else {
      console.error('API返回错误:', response)
      messageStore.error(response.msg || t('project.getListFailed'))
    }
  } catch (error: any) {
    if (version !== requestVersion) return
    console.error('[MyDesigns] fetchDesigns error:', error)
    console.error('错误详情:', error.response?.data)
    showErrorOnce(error, t('project.getListFailed'))
  } finally {
    if (version === requestVersion) listLoading.value = false
  }
}

watch([ready, requestParams, refreshVersion], () => {
  if (ready.value) void fetchDesigns(requestParams.value)
}, { flush: 'post' })

watch(currentDeviceId, (deviceId, previousDeviceId) => {
  if (deviceId === previousDeviceId) return
  currentPage.value = 1
  refreshVersion.value++
})

// 引导用户前往 New Project 创建第一个应用
const confirmGoToNewProject = () => {
  noDesignDialogVisible.value = false
  router.push('/design')
}

// 打开画布编辑器
// 处理刷新事件
const handleRefresh = (event: any ) => {
  if (event.detail.route === 'my-designs') {
    currentPage.value = 1
    refreshVersion.value++
  }
}

// 首次挂载时加载数据
onMounted(() => {
  void userStore.refreshUserInfo().catch(() => {})
  refreshVersion.value++
})

onUnmounted(() => {
  requestVersion++
  // 清理事件监听
  window.removeEventListener('refresh-list', handleRefresh)
})

</script>

<style scoped>
.design-capacity { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; color: var(--studio-text-muted); }
.design-capacity a { color: var(--studio-primary); }
.collection-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}
.collection-count { margin-left: auto; white-space: nowrap; color: var(--studio-text-muted); font-size: 13px; }
.view-switch {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--studio-border);
  border-radius: 10px;
  background: var(--studio-surface);
}
.view-switch button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--studio-text-muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.view-switch button.active { background: var(--studio-primary-soft); color: var(--studio-primary); }
.view-switch button:focus-visible { outline: 2px solid var(--studio-primary); outline-offset: 2px; }
.design-collection--grid { display: grid; grid-template-columns: repeat(var(--design-grid-columns, 1), minmax(0, 1fr)); gap: 20px; }
.design-item { min-width: 0; }
.batch-mode-toggle { flex-shrink: 0; }
.filter-preferences :deep(.batch-actions) { padding: 0; }
.design-item.is-selectable { position: relative; }
.design-selection { position: absolute; top: 4px; right: 4px; z-index: 2; width: 40px; height: 40px; display: grid; place-items: center; cursor: pointer; border-radius: 8px; background: var(--studio-surface); }
.design-selection input { width: 20px; height: 20px; margin: 0; cursor: pointer; accent-color: var(--studio-primary); }
.design-selection:has(input:focus-visible) { outline: 2px solid var(--studio-primary); }
.design-selection:has(input:disabled) { cursor: wait; opacity: .5; }
.is-selectable :deep(.card-header) { padding-right: 38px; }
.is-selected :deep(.design-card) { outline: 2px solid var(--studio-primary); outline-offset: -2px; }
.design-table-scroll.is-list { overflow-x: auto; }
.design-table-scroll.is-list > * { min-width: 420px; }
.design-collection--list { border: 1px solid var(--studio-border); border-radius: 14px; overflow: hidden; }
.design-collection--list .design-item + .design-item { border-top: 1px solid var(--studio-border); }
.list-heading {
  display: grid;
  grid-template-columns: var(--design-list-columns);
  gap: 16px;
  padding: 10px 18px;
  border: 1px solid var(--studio-border);
  border-bottom: 0;
  border-radius: 14px 14px 0 0;
  background: var(--studio-surface-soft);
  color: var(--studio-text-subtle);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.list-heading span:first-child { grid-column: 1 / 3; padding-left: 64px; }
.list-heading span:last-child { text-align: right; }


.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  margin-bottom: 40px;
  padding: 18px 0;
  border-top: 1px solid var(--studio-border);
}

/* Header action button tweaks now live in DesignCard.vue */

.search-bar {
  margin-bottom: 12px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  background: var(--studio-surface-raised);
  overflow: hidden;
}

.filter-fields,
.filter-preferences {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 12px;
}

.filter-fields > *,
.filter-preferences > * {
  flex-shrink: 0;
}

.filter-preferences {
  gap: 10px;
  padding: 8px 12px;
  border-top: 1px solid var(--studio-border);
  background: var(--studio-surface-soft);
}

.admin-filters { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 16px; padding: 12px 16px; border-top: 1px solid var(--studio-border); background: var(--studio-primary-soft); }
.admin-filter-heading { display: flex; align-items: center; gap: 6px; align-self: center; color: var(--studio-primary); font-size: 12px; font-weight: 600; }
.admin-filter-heading .iconify { font-size: 18px; }
.admin-filters .display-options { margin-left: 0; padding-left: 0; }
.filter-fields { align-items: flex-end; gap: 14px 12px; padding: 16px; }
.filter-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.filter-label { color: var(--studio-text-muted); font-size: 12px; font-weight: 600; }
.version-field { width: 290px; position: relative; }
.version-label { display: flex; justify-content: space-between; gap: 12px; }
.version-label a { font-size: 12px; color: var(--studio-primary); }
.version-inputs { display: flex; gap: 6px; }
.version-inputs :deep(.el-select__input) { border: 0; outline: 0; box-shadow: none; background: transparent; }
.version-operator { flex: 0 0 82px; }
.filter-error { color: var(--el-color-danger); font-size: 12px; }
.filter-fields > .el-button { margin-left: 0; }
.filter-fields :deep(.el-input),
.filter-fields :deep(.el-select),
.filter-fields :deep(.device-info) { height: 40px; box-sizing: border-box; }
.filter-fields :deep(.el-input__wrapper) { height: 40px; box-sizing: border-box; }
@media screen and (max-width: 600px) {
  .filter-fields > .filter-field { flex: 1 1 140px; }
  .filter-field .name-filter, .filter-field .app-id-filter, .filter-field .designer-filter,
  .filter-field .status-filter, .filter-field .payment-filter { width: 100%; flex-basis: auto; }
  .admin-filters > .version-field { flex: 1 1 100%; width: 100%; }
}
.sort-icon { flex-shrink: 0; font-size: 18px; color: var(--studio-text-muted); }
.name-filter { width: 200px; }
.app-id-filter { width: 144px; }
.designer-filter { width: 180px; }
.payment-filter { width: 160px; }
.status-filter { width: 150px; }
.sort-field-filter { width: 170px; }
.sort-order-filter { width: 150px; }
.scope-filter { min-height: 36px; flex: 0 0 auto; }
.search-bar :deep(.scope-filter .el-segmented__item) {
  min-width: 72px;
  padding: 0 12px;
  font-weight: 600;
}
.display-options {
  display: flex;
  align-items: center;
  margin-left: auto;
  min-height: 36px;
  padding-left: 12px;
  color: var(--studio-text-muted);
}
.display-options :deep(.el-switch__label) { color: var(--studio-text-muted); font-weight: 500; }
.display-options :deep(.el-switch__label.is-active) { color: var(--studio-primary); }
.search-bar :deep(.el-input__wrapper),
.search-bar :deep(.el-select__wrapper) {
  min-height: 40px;
  border-radius: 9px;
  background: var(--studio-surface);
  box-shadow: 0 0 0 1px var(--studio-border) inset;
  transition: box-shadow 0.18s ease;
}
.search-bar :deep(.el-input__wrapper:hover),
.search-bar :deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--studio-primary-border) inset;
}
.search-bar :deep(.el-input__wrapper.is-focus),
.search-bar :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px var(--studio-primary) inset;
}
.filter-preferences :deep(.el-select__wrapper) { min-height: 34px; }
.search-bar :deep(.el-button) { min-height: 40px; padding: 0 18px; border-radius: 9px; }
.search-bar :deep(.el-button .iconify) { margin-right: 6px; }

/* Package rank color is styled within DesignCard.vue */

/* 响应式布局调整 */
@media screen and (max-width: 768px) {

  .pagination-container :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    max-width: 100%;
  }

  .filter-fields, .filter-preferences { padding: 8px 10px; gap: 8px; }
  .sort-icon { display: none; }
  .display-options { padding-left: 0; }

  .el-col {
    padding: 0 10px;
    margin-bottom: 20px;
  }
}

@media screen and (min-width: 769px) and (max-width: 992px) {
  .design-grid {
    margin: 20px -15px 24px;
  }

  .el-col {
    padding: 0 15px;
    margin-bottom: 20px;
  }
}

@media screen and (min-width: 993px) {
  .design-grid {
    margin: 20px -20px 24px;
  }

  .el-col {
    padding: 0 20px;
    margin-bottom: 20px;
  }
}
</style>
