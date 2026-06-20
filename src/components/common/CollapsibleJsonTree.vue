<template>
  <div class="json-node" :class="{ root: level === 0 }">
    <div v-if="isContainer" class="json-row">
      <button class="json-toggle" type="button" @click="collapsed = !collapsed">
        {{ collapsed ? '▸' : '▾' }}
      </button>
      <span v-if="nodeKey !== undefined" class="json-key">"{{ nodeKey }}"</span>
      <span v-if="nodeKey !== undefined" class="json-colon">:</span>
      <span class="json-bracket">{{ openBracket }}</span>
      <span v-if="collapsed" class="json-summary">{{ summary }}</span>
      <span v-if="collapsed" class="json-bracket">{{ closeBracket }}</span>
    </div>

    <template v-if="isContainer && !collapsed">
      <div class="json-children">
        <CollapsibleJsonTree
          v-for="entry in entries"
          :key="entry.key"
          :node-key="entry.label"
          :data="entry.value"
          :level="level + 1"
          :expand-all-token="expandAllToken"
          :collapse-all-token="collapseAllToken"
        />
      </div>
      <div class="json-row json-closing">
        <span class="json-toggle-spacer"></span>
        <span class="json-bracket">{{ closeBracket }}</span>
      </div>
    </template>

    <div v-else-if="!isContainer" class="json-row primitive">
      <span class="json-toggle-spacer"></span>
      <span v-if="nodeKey !== undefined" class="json-key">"{{ nodeKey }}"</span>
      <span v-if="nodeKey !== undefined" class="json-colon">:</span>
      <span :class="['json-value', valueClass]">{{ formattedValue }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

defineOptions({ name: 'CollapsibleJsonTree' })

const props = withDefaults(defineProps<{
  data: unknown
  nodeKey?: string | number
  level?: number
  expandAllToken?: number
  collapseAllToken?: number
}>(), {
  level: 0,
  expandAllToken: 0,
  collapseAllToken: 0,
})

const collapsed = ref(false)

const isArray = computed(() => Array.isArray(props.data))
const isObject = computed(() => {
  return props.data !== null && typeof props.data === 'object' && !Array.isArray(props.data)
})
const isContainer = computed(() => isArray.value || isObject.value)

const entries = computed(() => {
  if (isArray.value) {
    return (props.data as unknown[]).map((value, index) => ({
      key: index,
      label: index,
      value,
    }))
  }
  if (isObject.value) {
    return Object.entries(props.data as Record<string, unknown>).map(([key, value]) => ({
      key,
      label: key,
      value,
    }))
  }
  return []
})

const openBracket = computed(() => isArray.value ? '[' : '{')
const closeBracket = computed(() => isArray.value ? ']' : '}')
const summary = computed(() => {
  const count = entries.value.length
  const label = isArray.value ? 'items' : 'keys'
  return count ? `… ${count} ${label}` : ''
})

const formattedValue = computed(() => {
  const value = props.data
  if (typeof value === 'string') return `"${value}"`
  if (value === null) return 'null'
  return String(value)
})

const valueClass = computed(() => {
  if (props.data === null) return 'is-null'
  if (typeof props.data === 'string') return 'is-string'
  if (typeof props.data === 'number') return 'is-number'
  if (typeof props.data === 'boolean') return 'is-boolean'
  return ''
})

watch(() => props.expandAllToken, () => {
  collapsed.value = false
})

watch(() => props.collapseAllToken, () => {
  if (isContainer.value) collapsed.value = true
})
</script>

<style scoped>
.json-node {
  min-width: max-content;
}

.json-row {
  display: flex;
  align-items: baseline;
  min-height: 22px;
  white-space: nowrap;
}

.json-toggle,
.json-toggle-spacer {
  width: 22px;
  flex: 0 0 22px;
}

.json-toggle {
  height: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--studio-text-subtle);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  line-height: 22px;
}

.json-toggle:hover {
  color: var(--studio-text);
}

.json-key {
  color: #7c3aed;
}

.json-colon {
  margin: 0 5px 0 2px;
  color: var(--studio-text-subtle);
}

.json-bracket {
  color: var(--studio-text);
  font-weight: 700;
}

.json-summary {
  margin: 0 4px;
  color: var(--studio-text-subtle);
  font-style: italic;
}

.json-children {
  margin-left: 22px;
}

.json-value.is-string {
  color: #047857;
}

.json-value.is-number {
  color: #2563eb;
}

.json-value.is-boolean {
  color: #c2410c;
}

.json-value.is-null {
  color: #64748b;
}
</style>
