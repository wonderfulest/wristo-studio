import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

/** One column count drives both CSS and API pagination (API maximum: 96). */
export function useDesignPagination(viewMode: Ref<'grid' | 'list'>) {
  const container = ref<HTMLElement | null>(null)
  const columns = ref(1)
  const rows = ref(2)
  const listPageSize = ref(12)
  const currentPage = ref(1)
  const ready = ref(false)
  const pageSizes = computed(() => viewMode.value === 'grid'
    ? [2, 3, 4].map(count => count * columns.value)
    : [12, 24, 48, 72, 96])
  const pageSize = computed({
    get: () => viewMode.value === 'grid' ? columns.value * rows.value : listPageSize.value,
    set: (value: number) => {
      if (viewMode.value === 'grid') rows.value = Math.max(2, Math.min(4, Math.round(value / columns.value)))
      else listPageSize.value = value
    },
  })
  watch([pageSize, viewMode], () => { currentPage.value = 1 }, { flush: 'sync' })

  let observer: ResizeObserver | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const measure = () => {
    const width = container.value?.getBoundingClientRect().width ?? 0
    if (width <= 0) return
    const minimum = window.innerWidth <= 768 ? 200 : 210
    columns.value = Math.max(1, Math.min(24, Math.floor((width + 20) / (minimum + 20))))
    ready.value = true
  }
  const scheduleMeasure = () => {
    clearTimeout(timer)
    timer = setTimeout(measure, 160)
  }
  onMounted(() => {
    measure()
    observer = new ResizeObserver(scheduleMeasure)
    if (container.value) observer.observe(container.value)
    window.addEventListener('resize', scheduleMeasure)
  })
  onUnmounted(() => {
    observer?.disconnect()
    clearTimeout(timer)
    window.removeEventListener('resize', scheduleMeasure)
  })
  return { container, columns, currentPage, pageSize, pageSizes, ready }
}
