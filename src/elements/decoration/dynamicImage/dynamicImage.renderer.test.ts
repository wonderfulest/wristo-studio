import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ updateImage: vi.fn(), patchElement: vi.fn(), requestRenderAll: vi.fn() }))
vi.mock('@/elements/decoration/image/image.renderer', () => ({ createImage: vi.fn(), updateImage: mocks.updateImage }))
vi.mock('@/stores/expressionPreviewStore', () => ({ useExpressionPreviewStore: () => ({ tokenValues: {} }) }))
vi.mock('@/stores/elementDataStore', () => ({ useElementDataStore: () => ({ patchElement: mocks.patchElement }) }))
vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => ({ canvas: { requestRenderAll: mocks.requestRenderAll } }) }))
import { refreshDynamicImage, updateDynamicImage } from './dynamicImage.renderer'
const makeBird = (): any => ({ id: 'bird', eleType: 'dynamicImage', goalProperty: 'goal_1', selectionMode: 'goalProgress', progress: 0,
  left: 227, top: 280, width: 176, height: 156, frameWidth: 176, frameHeight: 156, set: vi.fn(),
  items: [{ id: 'rest', imageUrl: 'rest.png', minProgress: 0 }, { id: 'fly', imageUrl: 'fly.png', minProgress: 1 }],
})
beforeEach(() => {
 vi.clearAllMocks()
 mocks.updateImage.mockImplementation(async (element, patch) => { if ('imageUrl' in patch) element.imageUrl = patch.imageUrl })
})
describe('goal image canvas updates', () => {
 it('accepts reactive editor items without losing the serialized stages', async () => {
  const bird=makeBird()
  await updateDynamicImage(bird, {items:reactive(bird.items)})
  expect(mocks.patchElement).toHaveBeenCalledWith('bird',expect.objectContaining({eleType:'dynamicImage',items:bird.items}))
 })

 it('keeps the dynamic type and binding when persisting a slider change', async () => {
  const bird=makeBird(); await updateDynamicImage(bird,{progress:1})
  expect(mocks.updateImage.mock.calls.every(call => call[2]?.persist === false)).toBe(true)
  expect(mocks.patchElement).toHaveBeenCalledWith('bird',expect.objectContaining({eleType:'dynamicImage',goalProperty:'goal_1',progress:1,items:bird.items}))
  expect(bird.imageUrl).toBe('fly.png')
 })
 it('loads each selected stage once and does not persist preview refreshes', async () => {
  const bird=makeBird(); await refreshDynamicImage(bird); await refreshDynamicImage(bird)
  expect(mocks.updateImage).toHaveBeenCalledTimes(1);expect(mocks.patchElement).not.toHaveBeenCalled()
 })
 it('serializes loads and keeps the latest progress after rapid changes', async () => {
  const bird=makeBird();let release:()=>void=()=>{}
  mocks.updateImage.mockImplementationOnce(async (element,patch)=>{await new Promise<void>(r=>release=r);element.imageUrl=patch.imageUrl})
  const first=refreshDynamicImage(bird);await vi.waitFor(()=>expect(mocks.updateImage).toHaveBeenCalledTimes(1))
  bird.progress=1;const last=refreshDynamicImage(bird);release();await Promise.all([first,last])
  expect(bird.imageUrl).toBe('fly.png')
  await refreshDynamicImage(bird);expect(mocks.updateImage).toHaveBeenCalledTimes(2)
 })
 it('reloads a replaced asset at the same threshold',async()=>{
  const bird=makeBird();await refreshDynamicImage(bird);bird.items[0].imageUrl='rest-v2.png';await refreshDynamicImage(bird)
  expect(bird.imageUrl).toBe('rest-v2.png')
 })
})
