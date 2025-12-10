<template>
  <div class="analog-asset-picker">
    <!-- 上传按钮 -->
    <div class="asset-item upload-item" @click="triggerUpload">
      <el-icon class="upload-icon"><Plus /></el-icon>
      <span>上传素材</span>
      <input 
        ref="uploadInput" 
        type="file" 
        accept=".svg" 
        style="display: none" 
        @change="handleUpload" 
      />
    </div>

    <!-- 素材列表 -->
    <div 
      v-for="asset in assets" 
      :key="asset.id" 
      class="asset-item"
      :class="{
        active: (selectedAssetId != null ? asset.id === selectedAssetId : selectedUrl === getAssetUrl(asset)),
        deleting: deletingId === asset.id
      }"
      @click="handleSelect(asset)"
      @mouseenter="handleMouseEnter(asset)"
      @mouseleave="handleMouseLeave"
    >
      <img v-if="getAssetUrl(asset)" :src="getAssetUrl(asset)" :alt="asset.file?.name" />
      <el-icon
        v-if="!asset.isSystem && !(selectedAssetId != null ? asset.id === selectedAssetId : selectedUrl === getAssetUrl(asset))"
        class="delete-icon"
        @click.stop="handleRemove(asset)"
        :title="'删除素材'"
      >
        <Delete />
      </el-icon>
      <el-icon v-if="asset.isSystem" class="system-badge"><Star /></el-icon>

      <!-- 悬停大图预览（贴在当前项左侧） -->
      <div
        v-if="hoverPreviewUrl && hoverPreviewAsset?.id === asset.id"
        class="asset-large-preview"
      >
        <img :src="hoverPreviewUrl" :alt="hoverPreviewAsset?.file?.name" />
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="asset-item loading-item">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <!-- 加载更多 / 收起 -->
    <div v-if="hasMore && !loading" class="asset-item action-item" @click="loadMore">
      <el-icon class="action-icon"><ArrowDown /></el-icon>
      <span>加载更多</span>
    </div>

    <!-- 刷新按钮 -->
    <div class="asset-item action-item" @click="refresh">
      <el-icon class="action-icon"><Refresh /></el-icon>
      <span>刷新</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, PropType, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowDown, Refresh, Loading, Star, Delete } from '@element-plus/icons-vue'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { AnalogAssetVO, AnalogAssetType } from '@/types/api/analog-asset'

const props = defineProps({
  /** 当前选中的URL */
  selectedUrl: {
    type: String,
    default: ''
  },
  /** 素材类型 */
  assetType: {
    type: String as PropType<AnalogAssetType>,
    required: true
  },
  /** 当前选中的素材ID（优先于selectedUrl） */
  selectedAssetId: {
    type: Number,
    default: null
  },
  /** 选择回调 */
  onSelect: {
    type: Function as PropType<(url: string, asset: AnalogAssetVO) => void>,
    required: true
  },
  /** 上传成功回调 */
  onUpload: {
    type: Function as PropType<(url: string, asset: AnalogAssetVO) => void>,
    required: true
  }
})

const uploadInput = ref<HTMLInputElement | null>(null)
const assets = ref<AnalogAssetVO[]>([])
const loading = ref(false)
const hasMore = ref(true)
const pageNum = ref(1)
const pageSize = 12
const deletingId = ref<number | null>(null)
const hoverPreviewAsset = ref<AnalogAssetVO | null>(null)

const hoverPreviewUrl = computed(() => {
  if (!hoverPreviewAsset.value) return undefined
  return getAssetUrl(hoverPreviewAsset.value)
})

/**
 * 获取素材预览URL（优先使用预览图 PNG），否则回退到原文件URL
 */
const getAssetUrl = (asset: AnalogAssetVO): string | undefined => {
  return asset.file?.previewUrl || asset.file?.url
}

/**
 * 加载素材列表
 */
const loadAssets = async (reset = false) => {
  if (loading.value) return
  
  if (reset) {
    pageNum.value = 1
    assets.value = []
    hasMore.value = true
  }

  loading.value = true
  try {
    const res = await analogAssetApi.page({
      pageNum: pageNum.value,
      pageSize,
      analogAssetType: props.assetType,
      isActive: true,
      orderBy: 'createdAt:desc'
    })
    
    if (res.data) {
      const newAssets = res.data.list || []
      if (reset) {
        assets.value = newAssets
      } else {
        assets.value.push(...newAssets)
      }
      hasMore.value = assets.value.length < res.data.total
    }
  } catch (error) {
    console.error('加载素材失败:', error)
    ElMessage.error('加载素材失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多
 */
const loadMore = () => {
  pageNum.value++
  loadAssets()
}

/**
 * 刷新列表
 */
const refresh = () => {
  loadAssets(true)
}

/**
 * 触发上传
 */
const triggerUpload = () => {
  uploadInput.value?.click()
}

/**
 * 处理上传
 */
const handleUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.name.endsWith('.svg')) {
    ElMessage.warning('请上传 SVG 格式文件')
    return
  }

  loading.value = true
  try {
    const res = await analogAssetApi.upload(file, props.assetType)
    
    if (res.data) {
      // 添加到列表头部
      assets.value.unshift(res.data)
      // 调用回调，直接使用返回的URL
      const url = getAssetUrl(res.data)
      if (url) {
        props.onUpload(url, res.data)
      }
      ElMessage.success('上传成功')
    }
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error('上传失败')
  } finally {
    loading.value = false
    input.value = ''
  }
}

/**
 * 处理选择
 */
const handleSelect = (asset: AnalogAssetVO) => {
  const url = getAssetUrl(asset)
  if (url) {
    props.onSelect(url, asset)
  }
}

/**
 * 悬停预览
 */
const handleMouseEnter = (asset: AnalogAssetVO) => {
  hoverPreviewAsset.value = asset
}

const handleMouseLeave = () => {
  hoverPreviewAsset.value = null
}

/**
 * 删除素材
 */
const handleRemove = async (asset: AnalogAssetVO) => {
  try {
    await ElMessageBox.confirm('确认删除该素材？此操作不可撤销。', '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }

  deletingId.value = asset.id
  try {
    const res = await analogAssetApi.remove(asset.id)
    if (res.data) {
      const idx = assets.value.findIndex(a => a.id === asset.id)
      if (idx !== -1) assets.value.splice(idx, 1)
      ElMessage.success('删除成功')
    } else {
      ElMessage.error('删除失败')
    }
  } catch (e) {
    console.error('删除素材失败:', e)
    ElMessage.error('删除失败')
  } finally {
    deletingId.value = null
  }
}

// 初始化加载
onMounted(() => {
  loadAssets(true)
})

// 暴露刷新方法
defineExpose({
  refresh,
  loadAssets
})
</script>

<style scoped>
.analog-asset-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.asset-item {
  width: 80px;
  height: 80px;
  border: 1px solid #c0c4cc;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
  background-color: #f7f7f7;
}

.asset-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.asset-item.active {
  border-color: #409eff;
  background-color: #ecf5ff;
  border-width: 2px;
}

.asset-item.deleting {
  opacity: 0.6;
  pointer-events: none;
}

.asset-item img {
  width: 60px;
  height: 60px;
  object-fit: contain;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.5));
}

.upload-item {
  border-style: dashed;
  background-color: #fafafa;
}

.upload-item:hover {
  background-color: #ecf5ff;
}

.upload-icon {
  font-size: 24px;
  color: #909399;
  margin-bottom: 4px;
}

.upload-item:hover .upload-icon {
  color: #409eff;
}

.upload-item span,
.action-item span,
.loading-item span {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.action-item {
  border-style: dashed;
  background-color: #fafafa;
}

.action-item:hover {
  background-color: #ecf5ff;
}

.action-icon {
  font-size: 20px;
  color: #909399;
  margin-bottom: 2px;
}

.action-item:hover .action-icon {
  color: #409eff;
}

.action-item:hover span {
  color: #409eff;
}

.loading-item {
  border-style: dashed;
  background-color: #fafafa;
  cursor: default;
}

.asset-large-preview {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translate(-50%, -8px);
  width: 200px;
  height: 200px;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  background-image:
    linear-gradient(45deg, #eee 25%, transparent 25%),
    linear-gradient(-45deg, #eee 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eee 75%),
    linear-gradient(-45deg, transparent 75%, #eee 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.asset-large-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.loading-icon {
  font-size: 20px;
  color: #409eff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.system-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 14px;
  color: #e6a23c;
}

.delete-icon {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 16px;
  color: #f56c6c;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1;
}

.asset-item:hover .delete-icon {
  opacity: 1;
}
</style>
