import {readFileSync,writeFileSync} from 'node:fs'
import {it,expect,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
import {evaluateExpression} from '@/engine/expression/evaluator'
import {packageFonts,packageFontBuildFiles} from '@/engine/services/packageAssetRegistry'
vi.hoisted(()=>{for(const k of ['sessionStorage','localStorage'])Object.defineProperty(globalThis,k,{configurable:true,value:{getItem:vi.fn(),setItem:vi.fn(),removeItem:vi.fn()}})})
vi.mock('@/api/image',()=>({findImageByUrl:vi.fn(async()=>({data:null}))}))
vi.mock('@/api/wristo/fonts',()=>({getFontBySlug:vi.fn(async()=>({data:null}))}))
it('restores the self-contained font, binds settings, and selects exactly one matching weekday',async()=>{
 setActivePinia(createPinia());const root='/Users/mac/workspace/wristo/wristo-resources/assets/watchfaces/mint-hatch-20260915'
 const {readWrtDesignPackage,clearRestoredDesignAssetUrls}=await import('@/engine/services/designAssetBundleService')
 const r=await readWrtDesignPackage(new File([readFileSync(root+'/mint-hatch.wrt')],'mint-hatch.wrt'));expect(r.failures).toEqual([])
 const c:any=r.config;expect(JSON.stringify(c)).not.toContain('bundle://');const w=c.elements.find((e:any)=>e.eleType==='dynamicImage');expect(w.items).toHaveLength(7)
 const paths=['07-sun','01-mon','02-tue','03-wed','04-thu','05-fri','06-sat']
 for(let d=1;d<=7;d++){const active=w.items.filter((i:any)=>evaluateExpression(i.expression.ast,{'time.dayOfWeek':d}));expect(active).toHaveLength(1);expect(active[0].id).toBe('weekday-'+d);expect(Buffer.from(await(await fetch(active[0].imageUrl)).arrayBuffer())).toEqual(readFileSync(root+'/mint-hatch/weekday/'+paths[d-1]+'.png'))}
 for(const e of c.elements)for(const[k,v]of Object.entries(e))if(k.endsWith('Property')&&v)expect(c.properties[v as string]).toBeDefined()
 for(const p of Object.values(c.properties)as any[]){if(p.options)expect(new Set(p.options.map((o:any)=>o.value)).size).toBe(p.options.length);if(p.type==='goal'){expect(Number.isInteger(p.value)).toBe(true);for(const o of p.options)expect(o.value).toBe(Number(c.dataOptions[o.metricSymbol].valueCode))}}
 expect(Object.values(c.properties).filter((p:any)=>p.type==='color').length).toBeLessThanOrEqual(6)
 const font:any=packageFonts.get('mint-hatch-display');expect(font).toBeDefined();expect(Buffer.from(await(await fetch(font.ttfFile.url)).arrayBuffer())).toEqual(readFileSync(root+'/mint-hatch/fonts/mint-hatch-display.ttf'))
 const builds=packageFontBuildFiles.get('mint-hatch-display');expect(builds?.size).toBe(2)
 const time=c.elements.find((e:any)=>e.eleType==='time');expect(time.fontFamily).toBe('mint-hatch-display');expect(time.formatter).toBe(0)
 const ring=c.elements.find((e:any)=>e.eleType==='goalArc');expect(ring.segmentMode).toBe(true);expect(ring.goalProperty).toBe('goal_outer')
 writeFileSync(root+'/mint-hatch/source/studio-validation.json',JSON.stringify({offlineImport:'passed',fontRestoration:'passed - exact TTF bytes and bitmap build files',weekdayStates:7,bindings:'passed',numericGoalCodes:'passed',studioUI:'not run',compile:'not run',device:'not run'},null,2));clearRestoredDesignAssetUrls()
},30000)
