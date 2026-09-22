import { afterEach, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import JSZip from 'jszip'
import { createPinia, setActivePinia } from 'pinia'
import { packageFonts, packageFontBuildFiles } from './packageAssetRegistry'

const { build, dispose } = vi.hoisted(() => ({ build: vi.fn(), dispose: vi.fn() }))
vi.hoisted(() => {
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(globalThis, key, {
    configurable: true, value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  })
})
vi.mock('@/features/bitmap-font-maker/workerClient', () => ({ BitmapFontWorkerClient: class { build = build; dispose = dispose } }))
vi.mock('@/api/image', () => ({ findImageByUrl: vi.fn() }))
vi.mock('@/api/wristo/fonts', () => ({ getFontBySlug: vi.fn() }))
vi.mock('@/api/wristo/weather', () => ({ getWeatherConditions: vi.fn() }))
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
async function input(corrupt = false) {
  const zip = new JSZip()
  const bytes = new Uint8Array([0, 1, 0, 0])
  const config = { version: '1', name: 'Source only', designId: 'test', properties: {}, orderIds: ['time'],
    elements: [{ id: 'time', eleType: 'time', fontFamily: 'fixture', fontSize: 36 }], bitmapMode: false }
  zip.file('design.json', JSON.stringify(config))
  zip.file('config/config.json', JSON.stringify(config))
  zip.file('fonts/fixture.ttf', bytes)
  zip.file('manifest.json', JSON.stringify({ version: 2, format: 'wristo-design-package', selfContained: true,
    design: { path: 'design.json' }, studio: { configPath: 'config/config.json', assetRefs: [] },
    fonts: [{ slug: 'fixture', path: 'fonts/fixture.ttf', sha256: corrupt ? 'bad' : digest(bytes) }], failures: [] }))
  return new File([await zip.generateAsync({ type: 'arraybuffer' })], 'source.wrt')
}
async function workerResult() {
  const zip = new JSZip()
  for (const size of [30, 312]) {
    zip.file(`${size}/fixture-g.fnt`, 'info face="Fixture"\npage id=0 file="fixture-g_0.png"\n')
    zip.file(`${size}/fixture-g_0.png`, new Uint8Array([137, 80, 78, 71]))
  }
  return { zip: await zip.generateAsync({ type: 'arraybuffer' }) }
}
afterEach(async () => {
  const { clearRestoredDesignAssetUrls } = await import('./designAssetBundleService')
  clearRestoredDesignAssetUrls(); packageFonts.clear(); packageFontBuildFiles.clear(); vi.clearAllMocks()
})
it('automatically builds source-only fonts and preserves them through save and reopen without rebuilding', async () => {
  setActivePinia(createPinia())
  build.mockReturnValue({ result: workerResult() })
  const { readWrtDesignPackage, buildWrtDesignPackage } = await import('./designAssetBundleService')
  const imported = await readWrtDesignPackage(await input())
  expect(build).toHaveBeenCalledOnce()
  expect(build.mock.calls[0][0]).toMatchObject({ slug: 'fixture', preserveSource: true })
  expect(packageFonts.get('fixture')?.bitmapPreviewAtlasUrl).toMatch(/^blob:/)
  expect(packageFontBuildFiles.get('fixture')?.size).toBe(4)
  const saved = await buildWrtDesignPackage(imported.config)
  await readWrtDesignPackage(saved)
  expect(build).toHaveBeenCalledOnce()
  expect(packageFontBuildFiles.get('fixture')?.size).toBe(4)
  expect(dispose).toHaveBeenCalledOnce()
})
it('rejects corrupt TTF bytes before starting a worker', async () => {
  setActivePinia(createPinia())
  const { readWrtDesignPackage } = await import('./designAssetBundleService')
  await expect(readWrtDesignPackage(await input(true))).rejects.toThrow('Missing or corrupt package asset')
  expect(build).not.toHaveBeenCalled()
})
it('preserves current project fonts and disposes the worker on a build failure', async () => {
  setActivePinia(createPinia())
  packageFonts.set('current', { slug: 'current' } as any)
  build.mockImplementation(() => ({ result: Promise.reject(new Error('Invalid TTF')) }))
  const { readWrtDesignPackage } = await import('./designAssetBundleService')
  await expect(readWrtDesignPackage(await input())).rejects.toThrow('Invalid TTF')
  expect(packageFonts.has('current')).toBe(true)
  expect(dispose).toHaveBeenCalledOnce()
})

it('reports verification, bitmap size progress and completion in order', async () => {
  setActivePinia(createPinia())
  build.mockImplementation((_request, onProgress) => {
    onProgress?.({ completed: 19, total: 38, size: 66 })
    return { result: workerResult() }
  })
  const events: any[] = []
  const { readWrtDesignPackage } = await import('./designAssetBundleService')
  await readWrtDesignPackage(await input(), event => events.push(event))
  expect(events[0]).toMatchObject({ stage: 'reading', percentage: 0 })
  expect(events.some(event => event.stage === 'verifying')).toBe(true)
  expect(events.find(event => event.fontSize === 66)).toMatchObject({
    stage: 'fonts', fontSlug: 'fixture', fontIndex: 1, fontTotal: 1,
  })
  expect(events.at(-1)).toMatchObject({ stage: 'complete', percentage: 100 })
  expect(events.map(event => event.percentage)).toEqual(events.map(event => event.percentage).sort((a, b) => a - b))
})

it('preserves an existing icon subset on save and reopen without rebuilding', async () => {
  setActivePinia(createPinia())
  const ot = await import('opentype.js')
  const codes = [38,39,40,41,42,64,70]
  const glyphs = codes.map(unicode => {
    const path = new ot.Path(); path.moveTo(0,0); path.lineTo(100,0); path.lineTo(0,100); path.close()
    return new ot.Glyph({ name:`g${unicode}`, unicode, advanceWidth:120, path })
  })
  const source = new ot.Font({ familyName:'Icons', styleName:'Regular', unitsPerEm:1000, ascender:800, descender:-200,
    glyphs:[new ot.Glyph({name:'.notdef',advanceWidth:120,path:new ot.Path()}), ...glyphs] }).toArrayBuffer()
  packageFonts.set('fixture', {slug:'fixture',type:'icon_font',bitmapPreviewSize:30,bitmapPreviewDescriptorUrl:'https://cdn.wristo.io/font-bitmaps/fixture/preview/v1/30/fixture-g.fnt',bitmapPreviewAtlasUrl:'https://cdn.wristo.io/font-bitmaps/fixture/preview/v1/30/fixture-g_0.png',ttfFile:{url:URL.createObjectURL(new Blob([source]))}} as any)
  packageFontBuildFiles.set('fixture', new Map([
    ['30/fixture-g.fnt',new Blob(['page id=0 file="fixture-g_0.png"\nchar id=40 x=0 y=0 width=1 height=1\n'])],
    ['30/fixture-g_0.png',new Blob([new Uint8Array([137,80,78,71])])],
  ]))
  const {buildWrtDesignPackage,readWrtDesignPackage}=await import('./designAssetBundleService')
  const config:any={name:'Icons',version:'1',designId:'icons',bitmapMode:false,orderIds:['icon'],elements:[{id:'icon',eleType:'icon',fontFamily:'fixture',fontSize:30,metricSymbol:':FIELD_TYPE_BATTERY'}],properties:{},dataOptions:{}}
  const exported=await buildWrtDesignPackage(config)
  expect(build).not.toHaveBeenCalled()
  expect((await readWrtDesignPackage(exported)).failures).toEqual([])
  expect(build).not.toHaveBeenCalled()
  const descriptor=await(await fetch(packageFonts.get('fixture')!.bitmapPreviewDescriptorUrl!)).text()
  expect(descriptor).toBe('page id=0 file="fixture-g_0.png"\nchar id=40 x=0 y=0 width=1 height=1\n')
})

it('allows bitmap-only icon subsets even when required runtime glyphs are missing', async () => {
  const {buildMissingWrtFonts}=await import('./wrtFontBuild')
  const zip=new JSZip()
  zip.file('fonts/icons/30/icons-g.fnt','char id=40 x=0 y=0 width=1 height=1')
  const fonts=[{slug:'icons',metadata:{type:'icon_font'},buildFiles:[{path:'fonts/icons/30/icons-g.fnt',sha256:''}]}]
  await expect(buildMissingWrtFonts(zip,fonts,undefined,{elements:[{eleType:'icon',fontFamily:'icons',metricSymbol:':FIELD_TYPE_BATTERY'}]}))
    .resolves.toEqual([])
  expect(build).not.toHaveBeenCalled()
})

it('adds the runtime rain-probability alias without changing its bitmap or overwriting existing glyphs', async () => {
  const {addIconGlyphAliases}=await import('./wrtIconCoverage')
  const source='chars count=1\nchar id=4365 x=4 y=8 width=30 height=30 page=0\n'
  const repaired=addIconGlyphAliases(source)
  expect(repaired).toContain('chars count=2')
  expect(repaired).toContain('char id=103 x=4 y=8 width=30 height=30 page=0')
  expect(addIconGlyphAliases(repaired)).toBe(repaired)
})

it('refreshes nested font manifest hashes and layout when adding runtime aliases', async () => {
  const {completeIconBuild}=await import('./wrtIconCoverage')
  const zip=new JSZip()
  zip.file('30/icons-g.fnt','chars count=1\nchar id=4365 x=4 y=8 width=30 height=30 page=0\n')
  zip.file('connectiq-layout.json',JSON.stringify({sizes:{30:{glyphs:{4365:{advance:30,drawOffsetX:-1}}}}}))
  zip.file('manifest.json',JSON.stringify({type:'text_font',charset:{codepoints:[4365]},packageContentSha256:'stale'}))
  await completeIconBuild(zip)
  const manifest=JSON.parse(await zip.file('manifest.json')!.async('string'))
  expect(manifest.type).toBe('icon_font')
  expect(manifest.charset.codepoints).toEqual([103,4365])
  const layout=JSON.parse(await zip.file('connectiq-layout.json')!.async('string'))
  expect(layout.sizes[30].glyphs[103]).toEqual(layout.sizes[30].glyphs[4365])
  const material=(await Promise.all(Object.keys(zip.files).filter(p=>!zip.files[p].dir&&p!=='manifest.json').sort().map(async p=>`${p}\0${digest(await zip.files[p].async('uint8array'))}\n`))).join('')
  expect(manifest.packageContentSha256).toBe(createHash('sha256').update(material).digest('hex'))
})

it('repairs the legacy Wristo sensor-pressure slot and keeps layout and hashes consistent', async () => {
  const { completeIconBuild, iconFontCoverage } = await import('./wrtIconCoverage')
  const zip = new JSZip()
  zip.file('30/wristo-icon-g.fnt', 'chars count=1\nchar id=99 x=4 y=8 width=30 height=30 page=0\n')
  zip.file('connectiq-layout.json', JSON.stringify({ sizes: { 30: { glyphs: { 99: { advance: 30 } } } } }))
  zip.file('manifest.json', JSON.stringify({ charset: { codepoints: [99] } }))
  await completeIconBuild(zip, true)
  const config = { elements: [{ eleType: 'icon', fontFamily: 'wristo-icon', metricSymbol: ':FIELD_TYPE_SENSOR_PRESSURE' }],
    dataOptions: { ':FIELD_TYPE_SENSOR_PRESSURE': { iconUnicode: '0068' } } }
  expect((await iconFontCoverage(zip, { slug: 'wristo-icon', buildFiles: [{ path: '30/wristo-icon-g.fnt', sha256: '' }] }, config))?.incomplete).toEqual([])
  const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
  expect(manifest.charset.codepoints).toEqual([99, 104])
  const layout = JSON.parse(await zip.file('connectiq-layout.json')!.async('string'))
  expect(layout.sizes[30].glyphs[104]).toEqual(layout.sizes[30].glyphs[99])
  const material = (await Promise.all(Object.keys(zip.files).filter(p => !zip.files[p].dir && p !== 'manifest.json').sort().map(async p => `${p}\0${digest(await zip.files[p].async('uint8array'))}\n`))).join('')
  expect(manifest.packageContentSha256).toBe(createHash('sha256').update(material).digest('hex'))
})

it('never replaces an existing 0068 glyph or adds the legacy pressure alias by default', async () => {
  const { addIconGlyphAliases } = await import('./wrtIconCoverage')
  const source = 'chars count=1\nchar id=99 x=4 y=8 width=30 height=30 page=0\n'
  expect(addIconGlyphAliases(source)).toBe(source)
  const existing = source + 'char id=104 x=40 y=8 width=30 height=30 page=0\n'
  expect(addIconGlyphAliases(existing, true)).toBe(existing)
})


it('allows source-only icon fonts to build even when required glyphs are absent', async () => {
  const { buildMissingWrtFonts } = await import('./wrtFontBuild')
  const zip = new JSZip()
  const ot = await import('opentype.js')
  const source = new ot.Font({ familyName: 'Icons', styleName: 'Regular', unitsPerEm: 1000,
    ascender: 800, descender: -200,
    glyphs: [new ot.Glyph({ name: '.notdef', advanceWidth: 120, path: new ot.Path() })],
  }).toArrayBuffer()
  zip.file('fonts/fixture.ttf', source)
  const fonts = [{ slug: 'fixture', path: 'fonts/fixture.ttf', metadata: { type: 'icon_font' } }]
  build.mockReturnValue({ result: workerResult() })
  await expect(buildMissingWrtFonts(zip, fonts, undefined, {
    elements: [{ eleType: 'icon', fontFamily: 'fixture', metricSymbol: ':FIELD_TYPE_BATTERY' }],
  })).resolves.toHaveLength(4)
  expect(build).toHaveBeenCalledOnce()
})
