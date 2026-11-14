// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const get = vi.hoisted(() => vi.fn())
vi.mock('@/config/axios', () => ({ default: { get } }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string, args?: { count: number }) => args ? `${key}:${args.count}` : key }) }))
import RewardPointsPanel from './RewardPointsPanel.vue'
const options = { global: { directives: { loading: () => {} }, stubs: { ElButton: {template: '<button><slot/></button>'}, ElTable: {props:['data'],template:'<div>{{ JSON.stringify(data) }}</div>'}, ElTableColumn:true, ElPagination:true } } }
beforeEach(() => { get.mockReset(); get.mockImplementation((path: string) => Promise.resolve({code:0,data:path.endsWith('/history') ? {items:[{id:'1',delta:5,description:'reward',createdAt:'2026-11-14T00:00:00Z'}],total:1} : {balance:5}})) })
describe('reward wallet display', () => {
  it('loads the reward wallet separately and refreshes after task awards', async () => {
    const wrapper=mount(RewardPointsPanel,{props:{active:true},...options});await flushPromises()
    expect(get).toHaveBeenCalledWith('/user/reward-points');expect(wrapper.text()).toContain('credits.rewardBalance:5')
    window.dispatchEvent(new Event('studio-credits-changed'));await flushPromises();expect(get).toHaveBeenCalledTimes(4)
    wrapper.unmount()
  })
  it('clears closed-account data and ignores late responses', async () => {
    let resolve!: (value: unknown) => void
    get.mockReturnValue(new Promise(r => {resolve=r}))
    const wrapper=mount(RewardPointsPanel,{props:{active:true},...options})
    await wrapper.setProps({active:false});resolve({data:{balance:999,items:[],total:0}});await flushPromises()
    expect(wrapper.text()).not.toContain('999');wrapper.unmount()
  })
})
