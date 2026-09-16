import {readFileSync,writeFileSync} from 'node:fs'
import {it,expect,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
import {evaluateExpression} from '@/engine/expression/evaluator'
import {packageFonts,packageFontBuildFiles} from '@/engine/services/packageAssetRegistry'
vi.hoisted(()=>{for(const k of ['sessionStorage','localStorage'])Object.defineProperty(globalThis,k,{configurable:true,value:{getItem:vi.fn(),setItem:vi.fn(),removeItem:vi.fn()}})})
vi.mock('@/api/image',()=>({findImageByUrl:vi.fn(async()=>({data:null}))}))
vi.mock('@/api/wristo/fonts',()=>({getFontBySlug:vi.fn(async()=>({data:null}))}))
const root='/Users/mac/workspace/wristo/wristo-resources/assets/watchfaces/hatch-themes-ten-20260915'
const themes=JSON.parse(readFileSync(root+'/index.json','utf8'))
for(const theme of themes)it(theme.name+': offline import, fonts, seven weekdays and bound settings',async()=>{
 setActivePinia(createPinia())
 const {readWrtDesignPackage,clearRestoredDesignAssetUrls}=await import('@/engine/services/designAssetBundleService')
 const result=await readWrtDesignPackage(new File([readFileSync(root+'/'+theme.wrt)],theme.wrt));expect(result.failures).toEqual([])
 const c:any=result.config;expect(JSON.stringify(c)).not.toContain('bundle://');const weekday=c.elements.find((e:any)=>e.eleType==='dynamicImage');expect(weekday.items).toHaveLength(7)
 const paths=['07-sun','01-mon','02-tue','03-wed','04-thu','05-fri','06-sat']
 for(let day=1;day<=7;day++){
  const active=weekday.items.filter((i:any)=>evaluateExpression(i.expression.ast,{'time.dayOfWeek':day}));expect(active).toHaveLength(1);expect(active[0].id).toBe('weekday-'+day)
  expect(Buffer.from(await(await fetch(active[0].imageUrl)).arrayBuffer())).toEqual(readFileSync(root+'/'+theme.slug+'/weekday/'+paths[day-1]+'.png'))
 }
 for(const e of c.elements)for(const[key,value]of Object.entries(e))if(key.endsWith('Property')&&value)expect(c.properties[value as string]).toBeDefined()
 for(const p of Object.values(c.properties)as any[]){
  if(p.options){expect(new Set(p.options.map((o:any)=>o.value)).size).toBe(p.options.length);expect(p.options.some((o:any)=>o.value===p.value)).toBe(true)}
  if(p.type==='goal'){expect(Number.isInteger(p.value)).toBe(true);for(const o of p.options)expect(o.value).toBe(Number(c.dataOptions[o.metricSymbol].valueCode))}
  if(p.type==='color'){
   const rgb565=(v:string)=>{const n=parseInt(v.replace('#','').replace('0x',''),16);return ((n>>19)<<11)|(((n>>10)&63)<<5)|((n>>3)&31)}
   expect(new Set(p.options.map((o:any)=>rgb565(o.value))).size).toBe(p.options.length)
  }
 }
 expect(Object.values(c.properties).filter((p:any)=>p.type==='color')).toHaveLength(4)
 const font:any=packageFonts.get('mint-hatch-display');expect(font).toBeDefined();expect(Buffer.from(await(await fetch(font.ttfFile.url)).arrayBuffer())).toEqual(readFileSync(root+'/'+theme.slug+'/fonts/mint-hatch-display.ttf'))
 const times=c.elements.filter((e:any)=>e.eleType==='time');expect(times.length).toBeGreaterThan(0)
 for(const t of times){expect(t.fontFamily).toBe('mint-hatch-display');expect(packageFontBuildFiles.get('mint-hatch-display')?.has(t.fontSize+'/mint-hatch-display-g.fnt')).toBe(true)}
 expect(times.length===1?times[0].formatter===0:times.map((t:any)=>t.formatter).sort().join(',')==='2,3').toBe(true)
 const report={name:theme.name,offlineImport:'passed',fontRestoration:'passed',weekdayStates:7,bindings:'passed',numericGoalCodes:'passed',colorOptionsRGB565:'passed',studioUI:'not run',compile:'not run',device:'not run'}
 writeFileSync(root+'/'+theme.slug+'/source/studio-validation.json',JSON.stringify(report,null,2)+'\n');clearRestoredDesignAssetUrls()
},30000)
it('has ten distinct palettes, layouts, theme images and weekday groups',()=>{
 expect(themes).toHaveLength(10);expect(new Set(themes.map((t:any)=>t.primary)).size).toBe(10)
 expect(new Set(themes.map((t:any)=>t.layout)).size).toBe(10)
 const configs=themes.map((t:any)=>JSON.parse(readFileSync(root+'/'+t.slug+'/design.json','utf8')))
 expect(new Set(configs.map((c:any)=>JSON.stringify(c.elements.filter((e:any)=>['time','date','data','dynamicImage'].includes(e.eleType)).map((e:any)=>[e.eleType,e.left,e.top,e.fontSize])))).size).toBe(10)
 expect(new Set(themes.map((t:any)=>readFileSync(root+'/'+t.slug+'/modules/theme.png').toString('base64'))).size).toBe(10)
 expect(new Set(themes.map((t:any)=>readFileSync(root+'/'+t.slug+'/weekday/02-tue.png').toString('base64'))).size).toBe(10)
})
