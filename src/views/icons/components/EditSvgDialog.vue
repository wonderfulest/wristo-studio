<template>
  <el-dialog v-model="visibleInner" title="编辑 SVG" width="70%" :close-on-click-modal="false" @closed="onClosed">
    <div class="edit-wrap">
      <div class="editor-side">
        <el-input
          v-model="editSvgContent"
          type="textarea"
          :rows="18"
          placeholder="粘贴或编辑 SVG 内容"
        />
        <div class="edit-actions">
          <el-button @click="autoCropAndCenter" :disabled="!editSvgContent">自动裁剪居中</el-button>
          <el-button @click="processDuotone" :disabled="!editSvgContent">双色（前景黑）</el-button>
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
          <el-button @click="visibleInner = false">取消</el-button>
        </div>
      </div>
      <div class="preview-side">
        <div class="preview-box" v-html="editSvgContent"></div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getIconAssetDetail, cropIconSvg } from '@/api/icon-asset'

interface Props {
  modelValue: boolean
  assetId: number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved'): void
}>()

const visibleInner = ref(false)
const saving = ref(false)
const editSvgContent = ref('')

// 将 SVG 转换为前景/背景分层：
// - 前景层：所有图形填充为黑色（#000），去除描边
// - 背景层：完全透明（无填充、无描边），仅作为占位层
const processDuotone = () => {
  const src = editSvgContent.value?.trim()
  if (!src) return
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(src, 'image/svg+xml')
    const svg = doc.documentElement as unknown as SVGSVGElement
    if (!svg || svg.tagName.toLowerCase() !== 'svg') {
      ElMessage.error('无效的 SVG')
      return
    }

    // 收集合并所有内容节点（保留 defs 原样）
    const defs: Element[] = []
    const contentNodes: Element[] = []
    const shapeTags = new Set(['path','rect','circle','ellipse','polygon','polyline','line','use'])
    const isShapeTag = (tag: string) => shapeTags.has(tag)

    // 复制 defs
    const defsNodes = svg.querySelectorAll('defs')
    defsNodes.forEach(d => defs.push(d.cloneNode(true) as Element))

    // 收集形状（如果已有 duotone，优先从前景层收集，避免重复加深）
    const fgExisting = svg.querySelector('#duotone-fg') as Element | null
    const collectShapes = (el: Element) => {
      const tag = el.tagName.toLowerCase()
      if (isShapeTag(tag)) contentNodes.push(el)
      for (let i = 0; i < el.children.length; i++) collectShapes(el.children[i] as Element)
    }
    if (fgExisting) {
      collectShapes(fgExisting)
    } else {
      collectShapes(svg)
    }

    // 构建新的 SVG 根
    const newDoc = document.implementation.createDocument('http://www.w3.org/2000/svg', 'svg', null)
    const root = newDoc.documentElement as unknown as SVGSVGElement
    // 复制重要属性
    const copyAttrs = ['viewBox', 'width', 'height', 'xmlns', 'xmlns:xlink', 'preserveAspectRatio']
    copyAttrs.forEach((k) => {
      const v = svg.getAttribute(k)
      if (v != null) root.setAttribute(k, v)
    })
    if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    if (!root.getAttribute('xmlns:xlink')) root.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

    // 追加 defs
    defs.forEach(d => root.appendChild(newDoc.importNode(d, true)))

    // 背景层（透明）
    const bg = newDoc.createElementNS('http://www.w3.org/2000/svg', 'g')
    bg.setAttribute('id', 'duotone-bg')
    contentNodes.forEach((node) => {
      const cloned = node.cloneNode(true) as Element
      cloned.setAttribute('fill', 'none')
      cloned.setAttribute('stroke', 'none')
      cloned.removeAttribute('stroke-width')
      bg.appendChild(newDoc.importNode(cloned, true))
    })

    // 前景层（黑色填充）
    const fg = newDoc.createElementNS('http://www.w3.org/2000/svg', 'g')
    fg.setAttribute('id', 'duotone-fg')
    contentNodes.forEach((node) => {
      const cloned = node.cloneNode(true) as Element
      cloned.setAttribute('fill', '#000000')
      cloned.removeAttribute('stroke')
      fg.appendChild(newDoc.importNode(cloned, true))
    })

    root.appendChild(bg)
    root.appendChild(fg)

    const serializer = new XMLSerializer()
    const out = serializer.serializeToString(root)
    editSvgContent.value = out
    ElMessage.success('已转换为双色（前景黑）')
  } catch (e) {
    ElMessage.error('处理失败')
  }
}

watch(() => props.modelValue, v => {
  visibleInner.value = v
})
watch(visibleInner, v => emit('update:modelValue', v))

watch(() => props.assetId, async (id) => {
  if (!visibleInner.value || !id) return
  await loadDetail(id)
})

watch(visibleInner, async (v) => {
  if (v && props.assetId) {
    await loadDetail(props.assetId)
  }
})

async function loadDetail(id: number) {
  editSvgContent.value = ''
  try {
    const resp = await getIconAssetDetail(id, { populate: 'svg_content' })
    const data: any = (resp as any)?.data
    if (data && typeof data.svgContent === 'string') {
      editSvgContent.value = data.svgContent
    }
  } catch (e) {
    ElMessage.error('获取SVG内容失败')
  }
}

function onClosed() {
  editSvgContent.value = ''
}

async function save() {
  if (!props.assetId) return
  saving.value = true
  try {
    await cropIconSvg({ id: props.assetId, svgContent: editSvgContent.value })
    ElMessage.success('保存成功')
    visibleInner.value = false
    emit('saved')
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const autoCropAndCenter = () => {
  const src = editSvgContent.value?.trim()
  if (!src) return
  try {
    const cropped = cropSvgToContentBBox(src)
    if (cropped) {
      editSvgContent.value = cropped
      ElMessage.success('已裁剪并居中')
    } else {
      ElMessage.warning('无法计算边界')
    }
  } catch (e) {
    ElMessage.error('处理失败')
  }
}

function cropSvgToContentBBox(svgText: string): string | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'image/svg+xml')
  const svg = doc.documentElement as unknown as SVGSVGElement
  if (!svg || svg.tagName.toLowerCase() !== 'svg') return null

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '-10000px'
  container.style.opacity = '0'
  container.style.pointerEvents = 'none'
  document.body.appendChild(container)

  const measureSvg = svg.cloneNode(true) as SVGSVGElement
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const children: ChildNode[] = []
  while (measureSvg.firstChild) {
    children.push(measureSvg.firstChild)
    measureSvg.removeChild(measureSvg.firstChild)
  }
  children.forEach((n) => {
    if ((n as Element).nodeType === 1 && (n as Element).nodeName.toLowerCase() === 'defs') {
      measureSvg.appendChild(n)
    } else {
      g.appendChild(n)
    }
  })
  measureSvg.appendChild(g)
  measureSvg.setAttribute('width', '1000')
  measureSvg.setAttribute('height', '1000')
  if (!measureSvg.getAttribute('viewBox')) measureSvg.setAttribute('viewBox', '0 0 1000 1000')
  container.appendChild(measureSvg)

  let bbox: DOMRect
  try {
    bbox = (g as any).getBBox()
  } catch (e) {
    document.body.removeChild(container)
    return null
  }
  document.body.removeChild(container)
  if (!bbox || !isFinite(bbox.width) || !isFinite(bbox.height) || bbox.width <= 0 || bbox.height <= 0) return null

  // Make square viewBox centered at content
  const cx = bbox.x + bbox.width / 2
  const cy = bbox.y + bbox.height / 2
  const side = Math.max(bbox.width, bbox.height)
  const vx = cx - side / 2
  const vy = cy - side / 2
  svg.setAttribute('viewBox', `${vx} ${vy} ${side} ${side}`)
  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')

  const serializer = new XMLSerializer()
  return serializer.serializeToString(svg)
}
</script>

<style scoped>
.edit-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.editor-side { display: flex; flex-direction: column; gap: 12px; }
.preview-side { background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 12px; }
.preview-box { background: #fff; min-height: 340px; display: flex; align-items: center; justify-content: center; }
.edit-actions { display: flex; gap: 8px; }
</style>
