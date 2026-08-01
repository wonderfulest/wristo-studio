<template>
  <el-select
    :model-value="modelValue"
    :placeholder="placeholder"
    clearable
    filterable
    remote
    :remote-method="searchDesigners"
    :loading="loading"
    style="width: 100%"
    @update:model-value="updateValue"
  >
    <el-option
      v-for="user in options"
      :key="user.id"
      :label="formatUserLabel(user)"
      :value="user.id"
    />
  </el-select>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  getAdminRoles,
  searchAdminUsers,
  type AdminUserOption,
} from '@/api/wristo/adminUsers'

defineProps<{
  modelValue?: number
  placeholder: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value?: number): void
}>()

const DESIGNER_ROLE_CODE = 'ROLE_DESIGNER'
const options = ref<AdminUserOption[]>([])
const loading = ref(false)
let designerRoleId: number | undefined
let roleResolved = false
let requestSequence = 0

const resolveDesignerRoleId = async () => {
  if (roleResolved) return designerRoleId

  const response = await getAdminRoles()
  designerRoleId = response.data?.find((role) => role.roleCode === DESIGNER_ROLE_CODE)?.id
  roleResolved = true
  return designerRoleId
}

const isDesigner = (user: AdminUserOption) => {
  if (!Array.isArray(user.roles) || user.roles.length === 0) return true
  return user.roles.some((role) => (
    role.roleCode === DESIGNER_ROLE_CODE || role.id === designerRoleId
  ))
}

const searchDesigners = async (query: string) => {
  const keyword = query.trim()
  const sequence = ++requestSequence
  if (!keyword) {
    options.value = []
    return
  }

  loading.value = true
  try {
    const roleId = await resolveDesignerRoleId()
    const response = await searchAdminUsers(keyword, 20, roleId)
    if (sequence !== requestSequence) return
    options.value = (response.data || [])
      .filter((user) => Number.isFinite(user.id))
      .filter(isDesigner)
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

const formatUserLabel = (user: AdminUserOption) => {
  const email = user.email ? ` - ${user.email}` : ''
  return `${user.username}${email} - (${user.id})`
}

const updateValue = (value?: number) => {
  emit('update:modelValue', value)
}
</script>
