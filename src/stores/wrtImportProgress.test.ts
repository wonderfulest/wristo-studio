import { createPinia, setActivePinia } from 'pinia'
import { expect, it } from 'vitest'
import { useWrtImportProgressStore } from './wrtImportProgress'

it('keeps the overlay open after parsing until project work finishes, then resets on the next import', () => {
  setActivePinia(createPinia())
  const state = useWrtImportProgressStore()
  state.begin('volt.wrt')
  state.update({ stage: 'fonts', percentage: 50, fontSlug: 'bebas-kai', fontIndex: 1, fontTotal: 3, fontSize: 30 })
  expect(state.progress).toMatchObject({ percentage: 45, fontSlug: 'bebas-kai' })
  state.update({ stage: 'complete', percentage: 100 })
  expect(state.active).toBe(true)
  expect(state.progress.percentage).toBe(90)
  state.finalize('saving')
  expect(state.progress.stage).toBe('saving')
  state.finish()
  expect(state.active).toBe(false)
  state.begin('next.wrt')
  expect(state.fileName).toBe('next.wrt')
  expect(state.progress).toEqual({ stage: 'reading', percentage: 0 })
})
