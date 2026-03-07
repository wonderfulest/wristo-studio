import type { Canvas, Control } from 'fabric'

export function installFabricControlDebugger(canvas: Canvas) {
  canvas.on('mouse:down', (opt: any) => {
    const e = opt.e

    const pointer = canvas.getPointer(e, false)
    const pointerViewport = canvas.getPointer(e, true)

    const target = canvas.findTarget(e)

    // 分组方便在控制台折叠
    console.group('FABRIC CONTROL DEBUG')

    console.log('pointer(canvas)', pointer)
    console.log('pointer(viewport)', pointerViewport)

    console.log('zoom', canvas.getZoom())
    console.log('viewportTransform', canvas.viewportTransform)

    const rect = canvas.upperCanvasEl.getBoundingClientRect()
    console.log('canvas offset', {
      left: rect.left,
      top: rect.top,
    })

    if (!target) {
      console.log('target', null)
      console.groupEnd()
      return
    }

    console.log('target', target)

    const controls = (target as any).controls as Record<string, Control>

    Object.entries(controls || {}).forEach(([name, control]) => {
      if (!control || typeof control.positionHandler !== 'function') return
      const oCoords = (target as any).oCoords?.[name]
      if (!oCoords) return

      // Fabric v6 positionHandler 签名为 (dim, finalMatrix, fabricObject, extraParam?)
      const vt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
      const pos = (control as any).positionHandler(oCoords, vt, target, undefined)

      console.log(`control ${name}`, {
        center: pos,
        cornerSize: (target as any).cornerSize,
        touchCornerSize: (target as any).touchCornerSize,
      })
    })

    console.groupEnd()
  })
}
