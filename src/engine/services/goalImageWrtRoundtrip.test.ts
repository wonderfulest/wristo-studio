import {File} from 'node:buffer'
import JSZip from 'jszip'
import {describe,it,expect,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
vi.hoisted(()=>{
 for(const name of ['localStorage','sessionStorage']) Object.defineProperty(globalThis,name,{configurable:true,value:{getItem:vi.fn(),setItem:vi.fn(),removeItem:vi.fn()}})
})
vi.mock('@/api/image',()=>({findImageByUrl:vi.fn()}))
vi.mock('@/api/wristo/fonts',()=>({getFontBySlug:vi.fn()}))
const config=()=>({version:'1',designId:'goal-image-test',name:'Goal Images',properties:{goal_1:{type:'goal',title:'Bird Goal',value:101,options:[{value:101,valueCode:101,metricSymbol:':GOAL_TYPE_STEPS',label:'Steps'},{value:103,valueCode:103,metricSymbol:':GOAL_TYPE_FLOORS_CLIMBED',label:'Floors'}]}},dataOptions:{},elements:[{id:'bird',eleType:'dynamicImage',left:227,top:280,width:176,height:156,selectionMode:'goalProgress',goalProperty:'goal_1',progress:.6,items:[0,.2,.4,.6,.8,1].map((minProgress,i)=>({id:`stage-${i}`,minProgress,imageUrl:`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="${i+1}" height="10"/></svg>`)}`}))}],orderIds:['bird']})
describe('goal-image WRT contract',()=>{
 it('exports v3 and retains goal selection, thresholds and every image after reimport',async()=>{
  setActivePinia(createPinia())
  const {buildWrtDesignPackage,readWrtDesignPackage}=await import('./designAssetBundleService')
  const d:any=config();d.properties.goal_1.value=103
  const file=await buildWrtDesignPackage(d);const zip=await JSZip.loadAsync(await file.arrayBuffer())
  const manifest=JSON.parse(await zip.file('manifest.json')!.async('string'))
  expect(manifest.version).toBe(3);expect(manifest.requiredFeatures).toEqual(['goal-progress-images-v1'])
  const imported=await readWrtDesignPackage(file);expect(imported.failures).toEqual([])
  const again=await readWrtDesignPackage(await buildWrtDesignPackage(imported.config))
  const bird:any=again.config.elements[0]
  expect(bird.selectionMode).toBe('goalProgress');expect(bird.goalProperty).toBe('goal_1')
  expect(bird.items.map((item:any)=>item.minProgress)).toEqual([0,.2,.4,.6,.8,1]);expect(again.config.properties.goal_1.value).toBe(103)
  for(const item of bird.items) expect((await(await fetch(item.imageUrl)).text()).includes('<svg')).toBe(true)
  // A v3 package must receive the same asset-integrity checks as v2.
  zip.file(manifest.studio.assetRefs[0].path,'corrupt')
  await expect(readWrtDesignPackage(new File([await zip.generateAsync({type:'uint8array'})],'corrupt.wrt') as any)).rejects.toThrow('corrupt package asset')
 })
 it('rejects absent binding and unknown required capabilities before restoring a project',async()=>{
  setActivePinia(createPinia())
  const {buildWrtDesignPackage,readWrtDesignPackage}=await import('./designAssetBundleService')
  const broken:any=config();broken.elements[0].goalProperty='goal_2'
  await expect(buildWrtDesignPackage(broken)).rejects.toThrow('goal property')
  const file=await buildWrtDesignPackage(config() as any);const zip=await JSZip.loadAsync(await file.arrayBuffer());const m=JSON.parse(await zip.file('manifest.json')!.async('string'));m.requiredFeatures=['future-feature'];zip.file('manifest.json',JSON.stringify(m))
  await expect(readWrtDesignPackage(new File([await zip.generateAsync({type:'uint8array'})],'future.wrt') as any)).rejects.toThrow('unsupported features')
 })
})
