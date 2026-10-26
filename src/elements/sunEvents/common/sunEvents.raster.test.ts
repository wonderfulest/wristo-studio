import { afterEach, expect, it, vi } from 'vitest'
import { buildCurveSunEventObjects } from './sunEvents.renderer'
import { curveSunEventsSchema } from '../curveSunEvents/curveSunEvents.schema'
afterEach(() => { vi.unstubAllGlobals() })
it('rasterizes the complete viewBox-only SVG without source cropping', async () => {
 let crossOriginAtLoad: string | undefined
 const drawImage = vi.fn()
 const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), classList: { add() {} } }
 vi.stubGlobal('document', { createElement: () => canvas })
 vi.stubGlobal('Image', class {
  naturalWidth = 300; naturalHeight = 150; width = 300; height = 150
  crossOrigin?: string
  onload?: () => void
  set src(_url: string) { crossOriginAtLoad = this.crossOrigin; queueMicrotask(() => this.onload?.()) }
 })
 const objects = await buildCurveSunEventObjects({ ...curveSunEventsSchema.defaultConfig, id:'svg', eleType:'curveSunEvents', indicator:{ ...curveSunEventsSchema.defaultConfig.indicator, imageSvg:'https://cdn.test/sun.svg',width:60,height:60 } } as any)
 expect(crossOriginAtLoad).toBe('anonymous')
 expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 120, 120)
 expect(objects.at(-1)?.getScaledWidth()).toBe(60)
 expect(objects.at(-1)?.getScaledHeight()).toBe(60)
})
