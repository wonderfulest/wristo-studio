import {readFileSync} from 'node:fs'
import {expect,it,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
import {packageFonts,packageFontBuildFiles} from './packageAssetRegistry'
import {createRequire} from 'node:module'
import {resolve} from 'node:path'
import {buildSync} from 'esbuild'
vi.hoisted(()=>{for(const key of ['localStorage','sessionStorage'])Object.defineProperty(globalThis,key,{configurable:true,value:{getItem:vi.fn(),setItem:vi.fn(),removeItem:vi.fn()}})})
vi.mock('@/api/image',()=>({findImageByUrl:vi.fn()}))
vi.mock('@/api/wristo/fonts',()=>({getFontBySlug:vi.fn()}))
vi.mock('@/api/wristo/weather',()=>({getWeatherConditions:vi.fn()}))
const root='/Users/mac/workspace/wristo/wfb-design/1992-01/296b08073b241-wristo-wrt/'
it('reproduces malformed original bitmap asset error',async()=>{
  setActivePinia(createPinia())
  const {readWrtDesignPackage}=await import('./designAssetBundleService')
  await expect(readWrtDesignPackage(new File([readFileSync(root+'1992-01-reference.wrt')],'original.wrt'))).rejects.toThrow('Missing or corrupt package asset: undefined')
})
it('renders glyph contours rather than opaque atlas rectangles in Chromium',async()=>{
  setActivePinia(createPinia())
  const {readWrtDesignPackage}=await import('./designAssetBundleService')
  await readWrtDesignPackage(new File([readFileSync(root+'1992-01-reference-fonts-fixed.wrt')],'fixed.wrt'))
  const require=createRequire(import.meta.url)
  const {chromium}=require('/Users/mac/workspace/wristo/wristo-store/node_modules/playwright')
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  try {
    const page=await browser.newPage({viewport:{width:780,height:550}})
    const bundle=buildSync({entryPoints:[resolve('src/features/bitmap-font-preview/fabricBitmapFontPreview.ts')],bundle:true,write:false,format:'iife',globalName:'FontRenderer',alias:{'@':resolve('src')}}).outputFiles[0].text
    await page.addScriptTag({content:bundle})
    for(const [slug,font] of packageFonts) {
      if(!slug.startsWith('wfb-296b'))continue
      const descriptor=await (await fetch(font.bitmapPreviewDescriptorUrl!)).text()
      const atlas=Buffer.from(await (await fetch(font.bitmapPreviewAtlasUrl!)).arrayBuffer()).toString('base64')
      const result=await page.evaluate(async({descriptor,atlas,slug,size}:any)=>{
        const image=new Image();image.src='data:image/png;base64,'+atlas;await image.decode()
        const pixels=document.createElement('canvas');pixels.width=image.width;pixels.height=image.height
        const ctx=pixels.getContext('2d')!;ctx.drawImage(image,0,0)
        const rgba=ctx.getImageData(0,0,image.width,image.height).data
        let transparent=0,opaque=0,partial=0
        for(let i=3;i<rgba.length;i+=4){if(rgba[i]===0)transparent++;else if(rgba[i]===255)opaque++;else partial++}
        const object:any={text:'08:36',fontSize:60,fill:'#ffb347',_renderText:()=>{throw Error('TTF fallback')}}
        const url=URL.createObjectURL(new Blob([descriptor],{type:'text/plain'}))
        await (window as any).FontRenderer.applyFabricBitmapFontPreview(object,{descriptorUrl:url,atlasUrl:image.src,sourceSize:size},{},{fallbackToText:false})
        const row=document.createElement('div');row.textContent=slug;row.style.cssText='display:flex;align-items:center;color:white;background:#151515;font:14px sans-serif'
        const canvas=document.createElement('canvas');canvas.width=480;canvas.height=86;row.append(canvas);document.body.append(row)
        const c=canvas.getContext('2d')!;c.translate(240,43);object._renderText(c)
        const rendered=c.getImageData(0,0,480,86).data
        const count=Array.from(rendered).filter((v,i)=>i%4===3&&v>0).length
        URL.revokeObjectURL(url)
        return {transparent,opaque,partial,count}
      },{descriptor,atlas,slug,size:font.bitmapPreviewSize})
      expect(result.transparent,slug).toBeGreaterThan(0)
      expect(result.opaque,slug).toBeGreaterThan(0)
      expect(result.partial,slug).toBeGreaterThan(0)
      expect(result.count,slug).toBeGreaterThan(100)
    }
    await page.screenshot({path:root+'font-render-validation.png',fullPage:true})
  } finally {await browser.close()}
},30000)
it('imports repaired delivery and restores every used font and data binding',async()=>{
  setActivePinia(createPinia())
  const {readWrtDesignPackage,collectFontSlugs}=await import('./designAssetBundleService')
  const result=await readWrtDesignPackage(new File([readFileSync(root+'1992-01-reference-fonts-fixed.wrt')],'fixed.wrt'))
  expect(result.failures).toEqual([])
  expect(result.config.elements).toHaveLength(16)
  for(const slug of collectFontSlugs(result.config)) {
    const font=packageFonts.get(slug)!
    expect(font.bitmapPreviewDescriptorUrl).toMatch(/^blob:/)
    expect(font.bitmapPreviewAtlasUrl).toMatch(/^blob:/)
    expect(packageFontBuildFiles.get(slug)!.size).toBeGreaterThanOrEqual(2)
    const descriptor=await (await fetch(font.bitmapPreviewDescriptorUrl!)).text()
    expect(descriptor).toContain('chars count=')
  }
  for(const e of result.config.elements as any[]) {
    expect(e.left).toBeGreaterThan(0);expect(e.left).toBeLessThan(454)
    expect(e.top).toBeGreaterThan(0);expect(e.top).toBeLessThan(454)
    if(e.dataProperty) {
      const c:any=result.config
      expect(c.properties[e.dataProperty].value).toBe(e.metricSymbol)
      expect(c.dataOptions[e.metricSymbol]).toBeDefined()
    }
  }
})
