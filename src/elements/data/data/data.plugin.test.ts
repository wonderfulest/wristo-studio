import { expect, it, vi } from 'vitest'
vi.mock('@/elements/data/data/data.panel.vue', () => ({ default: {} }))
vi.mock('@/engine/registry/settingsRegistry', () => ({ registerSettings: vi.fn() }))
vi.mock('./data.renderer', () => ({ createData: vi.fn(), updateData: vi.fn() }))
import registerDataPlugin from './data.plugin'
import { getElementHandler } from '@/engine/registry/elementRegistry'
import { createData, updateData } from './data.renderer'
it('forwards render cancellation and waits for async glyph replacement', async () => {
 registerDataPlugin()
 const handler = getElementHandler('data')
 const context = { assertDocumentCurrent: vi.fn() }
 vi.mocked(createData).mockResolvedValue({} as any)
 await handler.add({ eleType: 'data' } as any, context)
 expect(createData).toHaveBeenCalledWith({ eleType: 'data' }, context)
 let finish!: () => void
 const pending = new Promise<void>(resolve => { finish = resolve })
 vi.mocked(updateData).mockReturnValue(pending)
 let settled = false
 const result = handler.update!({} as any, {}, { persist: false }) as Promise<void>
 expect(result).toBeDefined()
 const completion = result.then(() => { settled = true })
 await Promise.resolve()
 expect(settled).toBe(false)
 finish(); await completion
 expect(settled).toBe(true)
 expect(updateData).toHaveBeenCalledWith({}, {}, { persist: false })
})
