<template>
  <el-dialog 
    v-model="dialogVisible" 
    title="编辑设计" 
    width="60%" 
    :top="'5vh'"
    class="edit-design-dialog"
  >
    <el-form :model="form" label-width="120px" class="edit-form">
      <el-form-item label="名称">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.designStatus">
          <el-option label="草稿" value="draft" />
          <el-option label="已提交" value="submitted" />
        </el-select>
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="form.description" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item label="配置" class="config-form-item">
        <div class="json-editor">
          <div class="json-toolbar">
            <el-button-group>
              <el-button size="small" @click="copyConfig">
                <el-icon><DocumentCopy /></el-icon>
                复制
              </el-button>
              <el-button 
                size="small" 
                type="primary" 
                @click="toggleEditMode"
              >
                <el-icon><Edit /></el-icon>
                {{ isEditing ? '预览' : '编辑' }}
              </el-button>
            </el-button-group>
          </div>
          <div class="json-content">
            <!-- JSON 预览模式 -->
            <vue-json-pretty
              v-if="!isEditing"
              :data="form.configJson"
              :deep="3"
              :showLength="true" 
              :showLineNumber="true"
              :showDoubleQuotes="true"
              :highlightMouseoverNode="true"
              :selectOnClickNode="true"
              :collapsedOnClickBrackets="true"
              style="min-width: 100%;"
            />
            <!-- JSON 编辑模式 -->
            <el-input
              v-else
              v-model="jsonEditText"
              type="textarea"
              :rows="20"
              :status="jsonEditStatus"
              @input="validateJson"
              style="font-family: monospace; font-size: 14px;"
            />
          </div>
          <!-- JSON 验证错误提示 -->
          <div v-if="jsonEditError" class="json-error">
            {{ jsonEditError }}
          </div>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleConfirm"
          :disabled="!!jsonEditError"
        >
          保存
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
// 移除旧的API导入，使用新的designApi
import { designApi } from '@/api/wristo/design'
import { useBaseStore } from '@/stores/baseStore'
import { useMessageStore } from '@/stores/message'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { DocumentCopy, Edit } from '@element-plus/icons-vue'
import emitter from '@/utils/eventBus'
const designId = ref(null)
const dialogVisible = ref(false)
const route = useRoute()
const form = reactive({
  id: null,
  name: '',
  designStatus: '',
  description: '',
  configJson: {},
  configJsonString: ''
})

const baseStore = useBaseStore()
const messageStore = useMessageStore()
const userStore = useUserStore()
const user = computed(() => userStore.userInfo)

const emit = defineEmits(['success', 'cancel'])

const isEditing = ref(false)
const jsonEditText = ref('')
const jsonEditError = ref('')
const jsonEditStatus = ref('')

// 加载设计数据
const loadDesign = async (designUid) => {
  try {
    const response = await designApi.getDesignByUid(designUid)
    if (response.code === 0 && response.data) {
      const designData = response.data
      
      // 先设置基本信息
      Object.assign(form, {
        id: designData.id,
        name: designData.name,
        designStatus: designData.designStatus,
        description: designData.description,
        configJson: designData.configJson,
        configJsonString: JSON.stringify(designData.configJson, null, 2)
      })

      // 获取最新配置
      const config = baseStore.generateConfig()
      if (config) {
        form.configJson = config
        form.configJsonString = JSON.stringify(config, null, 2)
      }

      // 初始化编辑文本
      jsonEditText.value = JSON.stringify(form.configJson, null, 2)
    } else {
      ElMessage.error(response.msg || '加载设计失败')
      handleCancel()
    }
  } catch (error) {
    console.error('加载设计失败:', error)
    ElMessage.error('加载设计失败')
    handleCancel()
  }
}

// 切换编辑模式
const toggleEditMode = () => {
  if (!isEditing.value) {
    // 切换到编辑模式
    jsonEditText.value = JSON.stringify(form.configJson, null, 2)
    isEditing.value = true
  } else {
    // 切换到预览模式前验证 JSON
    try {
      const parsed = JSON.parse(jsonEditText.value)
      form.configJson = parsed
      isEditing.value = false
      jsonEditError.value = ''
      jsonEditStatus.value = ''
    } catch (error) {
      ElMessage.error('JSON 格式无效，请修正后再切换到预览模式')
    }
  }
}

// 验证 JSON
const validateJson = (value) => {
  try {
    JSON.parse(value)
    jsonEditError.value = ''
    jsonEditStatus.value = 'success'
  } catch (error) {
    jsonEditError.value = `JSON 格式错误: ${error.message}`
    jsonEditStatus.value = 'error'
  }
}

// 修改保存逻辑
const handleConfirm = async () => {
  try {
    // 获取正确的配置 JSON
    const configJson = isEditing.value 
      ? JSON.parse(jsonEditText.value)  // 如果在编辑模式，使用编辑框的内容
      : form.configJson                 // 如果在预览模式，使用 form 中的配置

    const data = {
      uid: designId.value,
      name: form.name,
      designStatus: form.designStatus,
      description: form.description,
      configJson: configJson,
      userId: user.value.id
    }

    const res = await designApi.updateDesign(data)
    
    if (res.code === 0 && res.data) {
      emit('success', res.data)
      dialogVisible.value = false
    } else {
      messageStore.error(res.msg || '更新设计失败')
    }

  } catch (error) {
    console.error('更新设计失败:', error)
    messageStore.error(error.message || '更新设计失败')
  }
}

const handleCancel = () => {
  emit('cancel')
  dialogVisible.value = false
}

// 复制配置到剪贴板
const copyConfig = () => {
  const configStr = JSON.stringify(form.configJson, null, 2)
  navigator.clipboard
    .writeText(configStr)
    .then(() => {
      messageStore.success('配置已复制到剪贴板')
    })
    .catch(() => {
      messageStore.error('复制失败')
    })
}

// 定义 show 方法
const show = async (designUid) => {
  // 重置状态
  isEditing.value = false
  jsonEditText.value = ''
  jsonEditError.value = ''
  jsonEditStatus.value = ''
  
  designId.value = designUid
  await loadDesign(designUid)
  dialogVisible.value = true
}

// 添加事件监听
const handleOpenViewProperties = () => {
  const designUid = route.query.id
  if (designUid) {
    show(designUid)
  }
}

onMounted(() => {
  emitter.on('open-view-properties', handleOpenViewProperties)
})

onUnmounted(() => {
  emitter.off('open-view-properties', handleOpenViewProperties)
})

// 暴露方法给父组件
defineExpose({
  show
})
</script>

<style scoped>
/* 对话框样式 */
:deep(.edit-design-dialog .el-dialog) {
  margin-top: 5vh !important;
  margin-bottom: 5vh !important;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

:deep(.edit-design-dialog .el-dialog__body) {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

/* 表单样式 */
.edit-form {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}

/* 配置表单项样式 */
.config-form-item {
  width: 100%;
}

:deep(.config-form-item .el-form-item__content) {
  flex: 1;
  overflow-x: hidden; /* 防止水平溢出 */
  min-width: 0; /* 允许内容收缩 */
}

/* JSON 编辑器样式 */
.json-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 300px;
  max-height: calc(90vh - 400px);
  width: 100%; /* 设置宽度为100% */
  min-width: 0; /* 允许内容收缩 */
}

.json-content {
  padding: 16px;
  background-color: var(--el-bg-color);
  flex: 1;
  overflow: auto; /* 同时允许水平和垂直滚动 */
  min-height: 200px;
  width: 100%;
}

/* JSON 预览模式的样式 */
:deep(.vjs-tree) {
  width: 100%;
  overflow-x: auto; /* 允许水平滚动 */
  white-space: pre-wrap; /* 允许文本换行 */
  word-break: break-all; /* 允许在任意字符间断行 */
}

/* JSON 编辑模式的样式 */
:deep(.el-textarea__inner) {
  font-family: monospace;
  font-size: 14px;
  line-height: 1.6;
  width: 100%;
  resize: none; /* 禁用手动调整大小 */
}

/* 移除之前的 min-width: 800px 设置 */
:deep(.json-editor), 
:deep(.json-content),
:deep(.el-textarea__inner) {
  min-width: unset;
}

.json-toolbar {
  padding: 8px;
  background-color: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.json-error {
  padding: 8px 16px;
  color: var(--el-color-danger);
  font-size: 14px;
  border-top: 1px solid var(--el-border-color);
  background-color: var(--el-color-danger-light-9);
  flex-shrink: 0;
}
</style> 