// @vitest-environment jsdom
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import GuideSpotlight from './GuideSpotlight.vue'
let wrapper: ReturnType<typeof mount>
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; vi.useRealTimers() })
function target() {
  const el = document.createElement('button')
  el.getBoundingClientRect = () => ({ left: 40, top: 60, right: 140, bottom: 100, width: 100, height: 40 }) as DOMRect
  document.body.append(el)
  return el
}
it('cuts out the target, blocks unrelated keyboard actions and restores interaction on pause', async () => {
  const el = target(), other = document.createElement('button'); document.body.append(other)
  wrapper = mount(GuideSpotlight, { props: { active: true, targets: [el] } })
  await nextTick()
  expect(document.querySelector('.guide-shade mask rect[fill=black]')?.getAttribute('x')).toBe('34')
  const click = new MouseEvent('click', { bubbles: true, cancelable: true })
  other.dispatchEvent(click); expect(click.defaultPrevented).toBe(true)
  const blocked = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true })
  other.dispatchEvent(blocked); expect(blocked.defaultPrevented).toBe(true)
  const allowed = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
  el.dispatchEvent(allowed); expect(allowed.defaultPrevented).toBe(false)
  await wrapper.setProps({ active: false })
  expect(document.querySelector('.guide-spotlight')).toBeNull()
  const resumed = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true })
  other.dispatchEvent(resumed); expect(resumed.defaultPrevented).toBe(false)
})
it('allows a visible dialog and removes the overlay and listeners on unmount', () => {
  const el = target(), dialog = target(); dialog.className = 'el-dialog'
  dialog.getClientRects = () => [dialog.getBoundingClientRect()] as any
  wrapper = mount(GuideSpotlight, { props: { active: true, targets: [el] } })
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
  dialog.dispatchEvent(event); expect(event.defaultPrevented).toBe(false)
  wrapper.unmount()
  expect(document.querySelector('.guide-spotlight')).toBeNull()
})
it('positions the guide beside the target and refreshes after scrolling', async () => {
  vi.useFakeTimers()
  const el = target(), guide = document.createElement('section'); guide.className = 'first-design-guide'; document.body.append(guide)
  wrapper = mount(GuideSpotlight, { props: { active: true, targets: [el] } })
  expect(wrapper.emitted('placement')?.at(-1)?.[0]).toMatchObject({ left: '166px', top: '54px' })
  el.getBoundingClientRect = () => ({ left: 40, top: 160, right: 140, bottom: 200, width: 100, height: 40 }) as DOMRect
  document.dispatchEvent(new Event('scroll'))
  expect(wrapper.emitted('placement')?.at(-1)?.[0]).toMatchObject({ top: '154px' })
})
