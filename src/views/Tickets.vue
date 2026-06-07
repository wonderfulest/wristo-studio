<template>
  <div class="page">
    <div class="header">
      <div class="filters">
        <el-select
          v-model="statusesSelected"
          :placeholder="t('ticket.status')"
          clearable
          multiple
          filterable
          style="width: 300px"
        >
          <el-option v-for="s in statuses" :key="s" :label="formatEnumLabel(s)" :value="s" />
        </el-select>
        <el-select
          v-model="prioritiesSelected"
          :placeholder="t('ticket.priority')"
          clearable
          multiple
          filterable
          style="width: 240px"
        >
          <el-option v-for="p in priorities" :key="p" :label="formatEnumLabel(p)" :value="p" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          :start-placeholder="t('ticket.beginAt')"
          :end-placeholder="t('ticket.endAt')"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
        <el-select v-model="orderBy" :placeholder="t('common.sort')" clearable style="width: 180px" @change="onSortChange">
          <el-option :label="t('common.createdDesc')" value="id:desc" />
          <el-option :label="t('common.createdAsc')" value="id:asc" />
        </el-select>
        <el-button type="primary" @click="loadData">{{ t('common.search') }}</el-button>
      </div>
    </div>

    <el-table :data="list" border v-loading="loading" size="small" style="width: 100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column :label="t('ticket.title')" min-width="240">
        <template #default="{ row }">
          <div class="title-cell">
            <div class="title-text">{{ row.title }}</div>
            <div v-if="row.description" class="desc-text">{{ row.description }}</div>
            <div class="tags-wrap" v-if="(row.tags || '').trim().length > 0">
              <el-tag
                v-for="t in parseTags(row.tags)"
                :key="t"
                size="small"
                type="info"
                effect="plain"
                class="tag-item"
              >{{ t }}</el-tag>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="t('ticket.priority')" width="120">
        <template #default="{ row }">
          <el-tag effect="light" size="small">{{ row.priority ? formatEnumLabel(row.priority) : '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('ticket.status')" width="120">
        <template #default="{ row }">
          <el-tag effect="light" size="small">{{ row.status ? formatEnumLabel(row.status) : '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('ticket.product')" min-width="320">
        <template #default="{ row }">
          <div class="product-info">
            <el-image
              v-if="row.product?.garminImageUrl || row.product?.heroImages?.[0]?.url"
              :src="row.product?.garminImageUrl || row.product?.heroImages?.[0]?.url"
              :preview-src-list="[row.product?.garminImageUrl || row.product?.heroImages?.[0]?.url].filter(Boolean) as string[]"
              :z-index="5000"
              :preview-teleported="true"
              fit="cover"
              class="product-thumb"
              style="width: 44px; height: 44px"
            />
            <div class="product-meta">
              <div class="product-name">
                <a
                  v-if="row.product?.garminStoreUrl"
                  :href="row.product?.garminStoreUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >{{ row.product?.name }}</a>
                <span v-else>{{ row.product?.name || '-' }}</span>
                <el-tooltip :content="t('ticket.editProduct')" placement="top">
                  <el-button
                    class="edit-icon-btn"
                    :disabled="!row.product?.designId"
                    link
                    circle
                    size="small"
                    @click="navigateToDesign(row)"
                  >
                    <el-icon><Edit /></el-icon>
                  </el-button>
                </el-tooltip>
              </div>
              <div class="product-details">
                <span>appId: {{ row.product?.appId ?? '-' }}</span>
                <span>{{ t('ticket.designId') }}: {{ row.product?.designId ?? '-' }}</span>
              </div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="dueDate" :label="t('ticket.dueDate')" width="150">
        <template #default="{ row }">{{ row.dueDate || '-' }}</template>
      </el-table-column>
      <el-table-column :label="t('ticket.latestComment')" min-width="260">
        <template #default="{ row }">
          <div class="latest-comment" :title="getLatestComment(row) || '-'">
            {{ getLatestComment(row) || '-' }}
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" :label="t('project.createdTime')" width="150" />
      <el-table-column :label="t('common.actions')" width="140" align="center">
        <template #default="{ row }">
          <el-button type="primary" link @click="openComments(row)">{{ t('ticket.comments') }}</el-button>
          <el-divider direction="vertical" />
          <el-button type="primary" link @click="openProcess(row)">{{ t('ticket.process') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        small
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>
  </div>
  
  <!-- Comments Dialog -->
  <el-dialog v-model="commentsDialogVisible" :title="t('ticket.comments')" width="600px">
    <div v-loading="commentsLoading">
      <div v-if="comments.length === 0" class="empty-comments">{{ t('ticket.noComments') }}</div>
      <div v-else class="comment-list">
        <div v-for="c in comments" :key="c.id" class="comment-item">
          <div class="comment-content">{{ c.content }}</div>
          <div class="comment-meta">{{ t('ticket.by') }} {{ c.user?.username || c.userId }} · {{ c.createdAt }}</div>
        </div>
      </div>
    </div>
    <template #footer>
      <div style="display:flex; flex-direction:column; gap:8px; width:100%;">
        <el-input
          v-model="newComment"
          type="textarea"
          :placeholder="t('ticket.writeComment')"
          :rows="3"
        />
        <div style="text-align:right;">
          <el-button @click="commentsDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" :loading="submittingComment" @click="submitComment">{{ t('common.submit') }}</el-button>
        </div>
      </div>
    </template>
  </el-dialog>

  <el-dialog v-model="processDialogVisible" :title="t('ticket.processTicket')" width="420px">
    <div class="process-row">
      <span class="process-label">{{ t('ticket.status') }}</span>
      <el-select v-model="newStatus" :placeholder="t('ticket.selectStatus')" style="flex:1;">
        <el-option v-for="s in processStatuses" :key="s" :label="formatEnumLabel(s)" :value="s" />
      </el-select>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="processDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="processing" @click="submitProcess">{{ t('common.confirm') }}</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import ticketsApi from '@/api/wristo/tickets'
import type { TicketVO } from '@/types/api/ticket'
import type { TicketComment } from '@/types/api/ticket'
import { useUserStore } from '@/stores/user'
import { Edit } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

const userStore = useUserStore()
const { t } = useI18n()

const list = ref<TicketVO[]>([])
const total = ref<number>(0)
const pageNum = ref<number>(1)
const pageSize = ref<number>(20)
const orderBy = ref<string | undefined>('id:desc')
const status = ref<string>('')
const statusesSelected = ref<string[]>(['open'])
const priority = ref<string>('')
const prioritiesSelected = ref<string[]>([])
const dateRange = ref<[string, string] | ''>('')
const loading = ref<boolean>(false)
const statuses = ref<string[]>([])
const priorities = ref<string[]>([])

const processStatuses = computed<string[]>(() =>
  (statuses.value || []).filter(s => {
    const v = (s || '').toLowerCase()
    return v !== 'closed' && v !== 'close'
  })
)

// Comments dialog state
const commentsDialogVisible = ref<boolean>(false)
const commentsLoading = ref<boolean>(false)
const currentTicketId = ref<number | null>(null)
const comments = ref<TicketComment[]>([])
const newComment = ref<string>('')
const submittingComment = ref<boolean>(false)

// Process dialog state
const processDialogVisible = ref<boolean>(false)
const newStatus = ref<string>('')
const processing = ref<boolean>(false)

async function loadData(): Promise<void> {
  loading.value = true
  try {
    const beginAt = Array.isArray(dateRange.value) ? dateRange.value[0] : undefined
    const endAt = Array.isArray(dateRange.value) ? dateRange.value[1] : undefined
    const resp = await ticketsApi.page({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      orderBy: orderBy.value,
      statuses: (statusesSelected.value && statusesSelected.value.length > 0) ? statusesSelected.value : undefined,
      status: (statusesSelected.value && statusesSelected.value.length > 0) ? undefined : (status.value || undefined),
      priorities: (prioritiesSelected.value && prioritiesSelected.value.length > 0) ? prioritiesSelected.value : undefined,
      priority: (prioritiesSelected.value && prioritiesSelected.value.length > 0) ? undefined : (priority.value || undefined),
      assigneeId: userStore.userInfo?.id ?? undefined,
      beginAt,
      endAt,
    })
    const data = resp.data
    list.value = data?.list ?? []
    total.value = data?.total ?? 0
  } catch (e) {
    ElMessage.error(t('ticket.loadFailed'))
  } finally {
    loading.value = false
  }
}

function onSortChange(): void {
  pageNum.value = 1
  loadData()
}

watch([pageSize], () => {
  pageNum.value = 1
})

onMounted(async () => {
  try {
    const [s, p] = await Promise.all([
      ticketsApi.publicStatuses(),
      ticketsApi.publicPriorities(),
    ])
    statuses.value = s.data ?? []
    priorities.value = p.data ?? []
  } catch (_) {
    // ignore enum load errors, keep UI usable
  }
  await loadData()
})

function navigateToDesign(row: TicketVO): void {
  const designId = row.product?.designId
  if (!designId) return
  const url = `/design?id=${encodeURIComponent(designId)}`
  window.open(url, '_blank')
}

function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return []
  return tags
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)
}

function getLatestComment(row: TicketVO): string | undefined {
  const cs = row.comments
  if (!cs || cs.length === 0) return undefined
  // 取按 createdAt 最大的一条
  const latest = [...cs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).at(-1)
  return latest?.content
}

function formatEnumLabel(v: string): string {
  if (!v) return ''
  // convert snake_case or lower-case to Title Case for display
  return v
    .split(/[_\s-]+/)
    .map(w => (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ')
}

async function openComments(row: TicketVO): Promise<void> {
  currentTicketId.value = row.id
  commentsDialogVisible.value = true
  await loadComments()
}

async function loadComments(): Promise<void> {
  const id = currentTicketId.value
  if (!id) return
  commentsLoading.value = true
  try {
    const resp = await ticketsApi.comments(id)
    comments.value = resp.data ?? []
  } catch (e) {
    ElMessage.error(t('ticket.loadCommentsFailed'))
  } finally {
    commentsLoading.value = false
  }
}

async function submitComment(): Promise<void> {
  const id = currentTicketId.value
  if (!id) return
  const content = newComment.value.trim()
  if (!content) {
    ElMessage.warning(t('ticket.enterComment'))
    return
  }
  submittingComment.value = true
  try {
    const userId = userStore.userInfo?.id
    if (!userId) throw new Error('No user')
    await ticketsApi.comment(id, { userId, content })
    newComment.value = ''
    await loadComments()
    ElMessage.success(t('ticket.commentAdded'))
  } catch (e) {
    ElMessage.error(t('ticket.addCommentFailed'))
  } finally {
    submittingComment.value = false
  }
}

function openProcess(row: TicketVO): void {
  currentTicketId.value = row.id
  newStatus.value = row.status || ''
  processDialogVisible.value = true
}

async function submitProcess(): Promise<void> {
  const id = currentTicketId.value
  if (!id) return
  if (!newStatus.value) {
    ElMessage.warning(t('ticket.statusRequired'))
    return
  }
  processing.value = true
  try {
    const operatorId = userStore.userInfo?.id
    if (!operatorId) throw new Error('No user')
    await ticketsApi.updateStatus(id, { status: newStatus.value, operatorId })
    ElMessage.success(t('ticket.statusUpdated'))
    processDialogVisible.value = false
    // refresh list
    loadData()
  } catch (e) {
    ElMessage.error(t('ticket.updateStatusFailed'))
  } finally {
    processing.value = false
  }
}
</script>

<style scoped>
.page { padding: 24px; color: var(--studio-text); }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.filters { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.pagination { margin-top: 16px; text-align: right; }
.product-info { display: flex; gap: 12px; align-items: center; }
.product-thumb { border-radius: 6px; overflow: hidden; }
.product-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.product-name { font-weight: 600; color: var(--studio-text); }
.product-name { display: inline-flex; align-items: center; gap: 6px; }
.edit-icon-btn :deep(.el-icon) { font-size: 14px; }
.product-name a { color: var(--studio-primary); text-decoration: none; }
.product-name a:hover { text-decoration: underline; }
.product-details { display: flex; gap: 12px; color: var(--studio-text-muted); font-size: 12px; }
.tags-wrap { display: flex; gap: 8px; flex-wrap: wrap; }
.tag-item { margin: 0; }
.title-cell { display: flex; flex-direction: column; gap: 4px; }
.title-text { font-weight: 600; color: var(--studio-text); }
.desc-text { color: var(--studio-text-muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.latest-comment { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--studio-text-muted); }
.empty-comments { color: var(--studio-text-subtle); }
.comment-list { display: flex; flex-direction: column; gap: 12px; }
.comment-item { padding: 8px 0; border-bottom: 1px solid var(--studio-border); }
.comment-content { white-space: pre-wrap; line-height: 1.5; color: var(--studio-text); }
.comment-meta { color: var(--studio-text-subtle); font-size: 12px; margin-top: 4px; }
.process-row { display: flex; gap: 12px; align-items: center; }
.process-label { width: 80px; color: var(--studio-text-muted); }
</style>
