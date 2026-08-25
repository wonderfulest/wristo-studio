import { Rect } from 'fabric'
import { useCanvasStore } from '@/stores/canvasStore'
import { getLayoutGroupProjection, reflowLayoutGroup } from './studioLayoutController'

export type LayoutGroupSelectionProxy = Rect & {
  id: string
  eleType: 'layoutGroupProxy'
  layoutGroupId: string
  excludeFromExport: true
}

const proxies = new Map<string, LayoutGroupSelectionProxy>()

const proxyPatchForGroup = (groupId: string) => {
  const projection = reflowLayoutGroup(groupId) ?? getLayoutGroupProjection(groupId)
  if (!projection) return null
  return {
    left: projection.left + projection.width / 2,
    top: projection.top + projection.height / 2,
    width: Math.max(1, projection.width),
    height: Math.max(1, projection.height),
  }
}

export function syncLayoutGroupProxyBounds(groupId: string): LayoutGroupSelectionProxy | null {
  const proxy = proxies.get(groupId)
  if (!proxy) return null
  const patch = proxyPatchForGroup(groupId)
  if (!patch) return null
  proxy.set(patch)
  proxy.setCoords?.()
  useCanvasStore().canvas?.requestRenderAll?.()
  return proxy
}

export function ensureLayoutGroupProxy(groupId: string): LayoutGroupSelectionProxy | null {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return null
  const patch = proxyPatchForGroup(groupId)
  if (!patch) return null
  let proxy = proxies.get(groupId)
  if (!proxy) {
    proxy = new Rect({
      id: `layout-group:${groupId}`,
      eleType: 'layoutGroupProxy',
      layoutGroupId: groupId,
      excludeFromExport: true,
      originX: 'center',
      originY: 'center',
      fill: 'rgba(59, 130, 246, 0.04)',
      stroke: '#3b82f6',
      strokeWidth: 1,
      strokeDashArray: [4, 3],
      transparentCorners: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hasControls: false,
      ...patch,
    } as any) as LayoutGroupSelectionProxy
    proxies.set(groupId, proxy)
    canvas.add(proxy)
  } else {
    proxy.set(patch)
    proxy.setCoords?.()
  }
  canvas.requestRenderAll?.()
  return proxy
}

export function selectLayoutGroupProxy(groupId: string): LayoutGroupSelectionProxy | null {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return null
  // Exit a member ActiveSelection before measuring/reflowing the layout.
  // Otherwise Fabric keeps rendering each member's selection border under the proxy.
  canvas.discardActiveObject?.()
  const proxy = ensureLayoutGroupProxy(groupId)
  if (!proxy) return null
  canvas.setActiveObject?.(proxy)
  canvasStore.setActiveLayoutGroupIds([groupId])
  canvas.requestRenderAll?.()
  return proxy
}

export function getLayoutGroupProxy(groupId: string): LayoutGroupSelectionProxy | null {
  return proxies.get(groupId) ?? null
}

export function disposeLayoutGroupProxy(groupId: string): void {
  const canvasStore = useCanvasStore()
  const proxy = proxies.get(groupId)
  if (proxy) canvasStore.canvas?.remove?.(proxy)
  proxies.delete(groupId)
  if (canvasStore.activeLayoutGroupIds.includes(groupId)) canvasStore.clearActiveLayoutGroupIds()
  canvasStore.canvas?.requestRenderAll?.()
}

export function disposeAllLayoutGroupProxies(): void {
  ;[...proxies.keys()].forEach(disposeLayoutGroupProxy)
}

export function isLayoutGroupProxy(value: unknown): value is LayoutGroupSelectionProxy {
  return String((value as any)?.eleType ?? '') === 'layoutGroupProxy'
}
