<template>
  <div class="page">
    <div class="header">
      <div class="filters">
        <el-select
          v-model="statusesSelected"
          placeholder="Status"
          clearable
          multiple
          filterable
          style="width: 300px"
        >
          <el-option v-for="s in statuses" :key="s" :label="formatEnumLabel(s)" :value="s" />
        </el-select>
        <el-select
          v-model="prioritiesSelected"
          placeholder="Priority"
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
          start-placeholder="Begin at"
          end-placeholder="End at"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
        <el-select v-model="orderBy" placeholder="Sort" clearable style="width: 180px" @change="onSortChange">
          <el-option label="Created desc" value="id:desc" />
          <el-option label="Created asc" value="id:asc" />
        </el-select>
        <el-button type="primary" @click="loadData">Search</el-button>
      </div>
    </div>

    <el-table :data="list" border v-loading="loading" size="small" style="width: 100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="Title" min-width="240">
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
      <el-table-column label="Priority" width="120">
        <template #default="{ row }">
          <el-tag effect="light" size="small">{{ row.priority ? formatEnumLabel(row.priority) : '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Status" width="120">
        <template #default="{ row }">
          <el-tag effect="light" size="small">{{ row.status ? formatEnumLabel(row.status) : '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Product" min-width="320">
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
                <el-tooltip content="Edit Product" placement="top">
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
                <span>Design ID: {{ row.product?.designId ?? '-' }}</span>
              </div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="dueDate" label="Due Date" width="150">
        <template #default="{ row }">{{ row.dueDate || '-' }}</template>
      </el-table-column>
      <el-table-column label="Latest Comment" min-width="260">
        <template #default="{ row }">
          <div class="latest-comment" :title="getLatestComment(row) || '-'">
            {{ getLatestComment(row) || '-' }}
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="Created At" width="150" />
      <el-table-column label="Actions" width="140" align="center">
        <template #default="{ row }">
          <el-button type="primary" link @click="openComments(row)">Comments</el-button>
          <el-divider direction="vertical" />
          <el-button type="primary" link @click="openProcess(row)">Process</el-button>
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
  <el-dialog v-model="commentsDialogVisible" title="Comments" width="600px">
    <div v-loading="commentsLoading">
      <div v-if="comments.length === 0" style="color:#888;">No comments</div>
      <div v-else class="comment-list" style="display:flex; flex-direction:column; gap:12px;">
        <div v-for="c in comments" :key="c.id" class="comment-item" style="padding:8px 0; border-bottom:1px solid #f0f0f0;">
          <div style="white-space:pre-wrap; line-height:1.5;">{{ c.content }}</div>
          <div style="color:#999; font-size:12px; margin-top:4px;">By {{ c.user?.username || c.userId }} · {{ c.createdAt }}</div>
        </div>
      </div>
    </div>
    <template #footer>
      <div style="display:flex; flex-direction:column; gap:8px; width:100%;">
        <el-input
          v-model="newComment"
          type="textarea"
          placeholder="Write a comment"
          :rows="3"
        />
        <div style="text-align:right;">
          <el-button @click="commentsDialogVisible = false">Cancel</el-button>
          <el-button type="primary" :loading="submittingComment" @click="submitComment">Submit</el-button>
        </div>
      </div>
    </template>
  </el-dialog>

  <el-dialog v-model="processDialogVisible" title="Process Ticket" width="420px">
    <div style="display:flex; gap:12px; align-items:center;">
      <span style="width:80px; color:#666;">Status</span>
      <el-select v-model="newStatus" placeholder="Select status" style="flex:1;">
        <el-option v-for="s in processStatuses" :key="s" :label="formatEnumLabel(s)" :value="s" />
      </el-select>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="processDialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="processing" @click="submitProcess">Confirm</el-button>
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

const userStore = useUserStore()

const list = ref<TicketVO[]>([])
const total = ref<number>(0)
const pageNum = ref<number>(1)
const pageSize = ref<number>(20)
const orderBy = ref<string | undefined>('id:desc')
const status = ref<string>('')
const statusesSelected = ref<string[]>(['open', 'resolved'])
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
    ElMessage.error('Failed to load tickets')
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
    ElMessage.error('Failed to load comments')
  } finally {
    commentsLoading.value = false
  }
}

async function submitComment(): Promise<void> {
  const id = currentTicketId.value
  if (!id) return
  const content = newComment.value.trim()
  if (!content) {
    ElMessage.warning('Please enter comment content')
    return
  }
  submittingComment.value = true
  try {
    const userId = userStore.userInfo?.id
    if (!userId) throw new Error('No user')
    await ticketsApi.comment(id, { userId, content })
    newComment.value = ''
    await loadComments()
    ElMessage.success('Comment added')
  } catch (e) {
    ElMessage.error('Failed to add comment')
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
    ElMessage.warning('Please select status')
    return
  }
  processing.value = true
  try {
    const operatorId = userStore.userInfo?.id
    if (!operatorId) throw new Error('No user')
    await ticketsApi.updateStatus(id, { status: newStatus.value, operatorId })
    ElMessage.success('Status updated')
    processDialogVisible.value = false
    // refresh list
    loadData()
  } catch (e) {
    ElMessage.error('Failed to update status')
  } finally {
    processing.value = false
  }
}
</script>

<style scoped>
.page { padding: 24px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.filters { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.pagination { margin-top: 16px; text-align: right; }
.product-info { display: flex; gap: 12px; align-items: center; }
.product-thumb { border-radius: 6px; overflow: hidden; }
.product-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.product-name { font-weight: 600; color: #333; }
.product-name { display: inline-flex; align-items: center; gap: 6px; }
.edit-icon-btn :deep(.el-icon) { font-size: 14px; }
.product-name a { color: #409EFF; text-decoration: none; }
.product-name a:hover { text-decoration: underline; }
.product-details { display: flex; gap: 12px; color: #666; font-size: 12px; }
.tags-wrap { display: flex; gap: 8px; flex-wrap: wrap; }
.tag-item { margin: 0; }
.title-cell { display: flex; flex-direction: column; gap: 4px; }
.title-text { font-weight: 600; color: #333; }
.desc-text { color: #666; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.latest-comment { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #666; }
</style>
