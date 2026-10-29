// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { createPinia, setActivePinia } from 'pinia'
import { Canvas, FabricObject, Rect, ActiveSelection } from 'fabric'
import { markRaw } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useHistoryStore } from '@/stores/historyStore'
import { registerElement, getElementHandler } from '@/engine/registry/elementRegistry'
import { addElement } from '@/engine/managers/elementManager'
import { useAiAdjustmentEditor } from './useAiAdjustmentEditor'
import { weatherVisibility, additionConfig } from './aiAdjustmentOperations'
vi.mock('@/api/wristo/bitmapFont', () => ({listBitmapFontChars:vi.fn(async()=>({data:[]}))}))
vi.mock('@/api/wristo/upload', () => ({uploadPersistentDesignAsset:vi.fn(async()=> 'https://example.test/asset.png')}))
vi.mock('@/api/wristo/fonts', () => ({ getFontBySlug: vi.fn(async () => ({ data: null })) }))
const { savedDesign } = vi.hoisted(() => ({ savedDesign: vi.fn(async (_payload: any) => ({code:0,data:{uid:'integration-project'}})) }))
vi.mock('@/api/wristo/design', () => ({designApi:{updateDesign:savedDesign}}))
let canvas: Canvas
const additions: any[] = [
 {id:'sun',eleType:'circle',fields:{left:100,top:100,radius:25,fill:'#FFDD00'},weather:'clear'},
 {id:'land',eleType:'rectangle',fields:{left:227,top:350,width:300,height:60,fill:'#008800'},weather:'always'},
 {id:'rain',eleType:'line',fields:{x1:150,y1:200,x2:170,y2:230,stroke:'#00AAFF',strokeWidth:3},weather:'rain'},
 {id:'hill',eleType:'triangle',fields:{left:300,top:250,width:100,height:90,fill:'#559955'},weather:'cloudy'},
 {id:'label',eleType:'text',fields:{left:227,top:80,fontSize:36,fill:'#FFFFFF',textTemplate:'"RAIN"'},weather:'rain'},
]
beforeEach(async () => {
 setActivePinia(createPinia())
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:webcrypto})
 const circleRenderer=await import('@/elements/shapes/circle/circle.renderer')
 const circleEncoder=await import('@/elements/shapes/circle/circle.encoder')
 registerElement('circle',{add:circleRenderer.createCircle as any,update:circleRenderer.updateCircle as any,encode:circleEncoder.encodeCircle as any,decode:circleEncoder.decodeCircle as any})
 const rectangleRenderer=await import('@/elements/shapes/rectangle/rectangle.renderer')
 const rectangleEncoder=await import('@/elements/shapes/rectangle/rectangle.encoder')
 registerElement('rectangle',{add:rectangleRenderer.createRectangle as any,update:rectangleRenderer.updateRectangle as any,encode:rectangleEncoder.encodeRectangle as any,decode:rectangleEncoder.decodeRectangle as any})
 const lineRenderer=await import('@/elements/shapes/line/line.renderer')
 const lineEncoder=await import('@/elements/shapes/line/line.encoder')
 registerElement('line',{add:lineRenderer.createLine as any,update:lineRenderer.updateLine as any,encode:lineEncoder.encodeLine as any,decode:lineEncoder.decodeLine as any})
 const triangleRenderer=await import('@/elements/shapes/triangle/triangle.renderer')
 const triangleEncoder=await import('@/elements/shapes/triangle/triangle.encoder')
 registerElement('triangle',{add:triangleRenderer.createTriangle as any,update:triangleRenderer.updateTriangle as any,encode:triangleEncoder.encodeTriangle as any,decode:triangleEncoder.decodeTriangle as any})
 const textRenderer=await import('@/elements/texts/text/text.renderer')
 const textEncoder=await import('@/elements/texts/text/text.encoder')
 registerElement('text',{add:textRenderer.createText as any,update:textRenderer.updateText as any,encode:textEncoder.encodeText as any,decode:textEncoder.decodeText as any})
 FabricObject.customProperties=[...new Set([...FabricObject.customProperties,'id','eleType','visibility','displayStates','layerName','textTemplate'])]
 canvas=new Canvas(document.createElement('canvas'),{width:454,height:454,renderOnAddRemove:false})
 useCanvasStore().canvas=markRaw(canvas)
 useBaseStore().canvas=markRaw(canvas) as any
 useBaseStore().id='integration-project'
 canvas.add(new Rect({id:'background',eleType:'background',width:454,height:454,fill:'#000000'} as any))
 useCanvasStore().ensureGlobalLayer()
 await addElement('rectangle',additionConfig({id:'existing',eleType:'rectangle',fields:{left:227,top:227,width:60,height:40,fill:'#FFFFFF'}}))
 canvas.discardActiveObject()
 useHistoryStore().attachCanvas(canvas,useBaseStore() as any)
 useHistoryStore().saveInitial()
})
afterEach(async()=>{await canvas?.dispose()})
async function apply(result:any) {
 const editor=useAiAdjustmentEditor(), snap=await editor.capture()
 await editor.applyResult({fingerprint:snap.fingerprint,request:{...snap,prompt:'Weather scene',expectedCreditCost:5,history:[]}},result)
}
it('defaults to all despite a selection and preserves explicit selected scope',async()=>{
 useCanvasStore().activeIds=['existing']
 const editor=useAiAdjustmentEditor()
 expect((await editor.capture()).selectedIds).toEqual([])
 expect((await editor.capture('selected')).selectedIds).toEqual(['existing'])
})
it('renders native additions and preserves weather through export and whole-adjustment undo/redo',async()=>{
 await apply({summary:'Weather scene',changes:[],additions,weatherRules:[{id:'existing',weather:'snow'}]})
 const exportConfig=()=>useBaseStore().generateConfig({validateBindings:false})!
 const exported=exportConfig()
 const recaptured=await useAiAdjustmentEditor().capture()
 expect(recaptured.elements.find(e=>e.id==='label')?.fields.textTemplate).toBe('"RAIN"')
 for(const addition of additions){
  const object=canvas.getObjects().find((o:any)=>o.id===addition.id) as any
  expect(object,addition.id).toBeTruthy()
  expect(object.width).toBeGreaterThan(0)
  expect(exported.elements.find(e=>e.id===addition.id)?.visibility).toEqual(weatherVisibility(addition.weather))
 }
 expect(exported.elements.find(e=>e.id==='existing')?.visibility).toEqual(weatherVisibility('snow'))
 await useHistoryStore().undo()
 expect(canvas.getObjects().filter((o:any)=>!['background','global'].includes(o.id)).map((o:any)=>o.id)).toEqual(['existing'])
 await useHistoryStore().redo()
 expect(exportConfig().elements.map(e=>({id:e.id,visibility:e.visibility}))).toEqual(exported.elements.map(e=>({id:e.id,visibility:e.visibility})))
})
it('rolls back prior additions and edits if a later renderer fails',async()=>{
 const before=useBaseStore().generateConfig({validateBindings:false})
 const handler=getElementHandler('triangle'), original=handler.add
 handler.add=()=>{throw Error('injected renderer failure')}
 try{
  await expect(apply({summary:'Fail midway',changes:[{id:'existing',patch:{left:300}}],additions:additions.slice(0,4)})).rejects.toThrow('injected renderer failure')
  expect(canvas.getObjects().filter((o:any)=>!['background','global'].includes(o.id)).map((o:any)=>o.id)).toEqual(['existing'])
  expect(useBaseStore().generateConfig({validateBindings:false})).toEqual(before)
 }finally{handler.add=original}
})

it('persists weather expressions through the JSON project save and restore contract',async()=>{
 await apply({summary:'Saved scene',changes:[],additions})
 const {saveJsonProject,restoreJsonProject}=await import('@/engine/services/jsonProject')
 const config=useBaseStore().generateConfig({validateBindings:false})!
 await saveJsonProject('integration-project',config)
 const saved=savedDesign.mock.calls.at(-1)![0].configJson
 const restored=restoreJsonProject(JSON.parse(JSON.stringify(saved)))
 for(const addition of additions) expect(restored.elements.find((e:any)=>e.id===addition.id)?.visibility).toEqual(weatherVisibility(addition.weather))
})

it('captures and applies triangle rotation and line endpoint edits in a second adjustment',async()=>{
 await apply({summary:'Scene',changes:[],additions:additions.filter(a=>['line','triangle'].includes(a.eleType))})
 const snapshot=await useAiAdjustmentEditor().capture()
 const line=snapshot.elements.find(e=>e.id==='rain')!
 expect(line.fields).toHaveProperty('x1')
 expect(line.fields).not.toHaveProperty('left')
 await apply({summary:'Move line and rotate hill',changes:[{id:'hill',patch:{angle:30}},{id:'rain',patch:{x1:170,y1:220,x2:190,y2:250}}]})
 const hill=canvas.getObjects().find((o:any)=>o.id==='hill') as any
 expect(hill.angle).toBe(30)
 const next=await useAiAdjustmentEditor().capture()
 expect(next.elements.find(e=>e.id==='hill')?.fields.angle).toBe(30)
 expect(next.elements.find(e=>e.id==='rain')?.fields).toMatchObject({x1:170,y1:220,x2:190,y2:250})
})
it('remaps an addition id colliding with the fixed background',async()=>{
 const background=canvas.getObjects().find((o:any)=>o.id==='background')
 await apply({summary:'Add cloud',changes:[],additions:[{...additions[0],id:'background'}]})
 expect(canvas.getObjects().filter((o:any)=>o.id==='background')).toEqual([background])
 const added=canvas.getObjects().find((o:any)=>o.eleType==='circle') as any
 expect(added).toBeTruthy()
 expect(added.id).not.toBe('background')
 expect(added.visibility).toEqual(weatherVisibility('clear'))
})
it('preserves a custom visibility expression when AI tries to replace its weather rule',async()=>{
 const {createVisibilityExpression}=await import('@/components/expression/visibilityExpressionModel')
 const {updateElementById}=await import('@/engine/managers/elementManager')
 const custom=createVisibilityExpression('(ds3) > 20',false)
 await updateElementById('existing',{visibility:custom})
 const snapshot=await useAiAdjustmentEditor().capture()
 expect(snapshot.elements.find(e=>e.id==='existing')?.context.weather).toBe('custom')
 await expect(apply({summary:'Overwrite custom rule',changes:[],weatherRules:[{id:'existing',weather:'rain'}]})).rejects.toThrow()
 expect(useBaseStore().generateConfig({validateBindings:false})!.elements.find(e=>e.id==='existing')?.visibility).toEqual(custom)
})
it('captures absolute positions from a real Fabric multiselection and applies a selected move',async()=>{
 await addElement('rectangle',additionConfig({id:'second',eleType:'rectangle',fields:{left:100,top:100,width:40,height:40,fill:'#FFFFFF'}}))
 const objects=canvas.getObjects().filter((o:any)=>['existing','second'].includes(o.id))
 canvas.setActiveObject(new ActiveSelection(objects,{canvas}))
 useCanvasStore().activeIds=['existing','second']
 // Fabric stores selected members relative to the selection center.
 expect((objects.find((o:any)=>o.id==='existing') as any).left).not.toBe(227)
 const editor=useAiAdjustmentEditor(), snapshot=await editor.capture('selected')
 expect(snapshot.selectedIds).toEqual(['existing','second'])
 expect(snapshot.elements.find(e=>e.id==='existing')?.fields).toMatchObject({left:227,top:227})
 expect(snapshot.elements.find(e=>e.id==='second')?.fields).toMatchObject({left:100,top:100})
 // A fresh selection during the request must not invalidate unchanged world geometry.
 canvas.setActiveObject(new ActiveSelection(objects,{canvas}))
 await editor.applyResult({fingerprint:snapshot.fingerprint,request:{...snapshot,prompt:'Move selected box',expectedCreditCost:5,history:[]}},
 {summary:'Move box',changes:[{id:'existing',patch:{left:260,top:270}}]})
 expect(canvas.getObjects().find((o:any)=>o.id==='existing')).toMatchObject({left:260,top:270})
 expect(canvas.getObjects().find((o:any)=>o.id==='second')).toMatchObject({left:100,top:100})
})
it('places scenery below existing text and analog hand layers',async()=>{
 await addElement('text',additionConfig(additions.find(a=>a.eleType==='text')))
 // Use real Fabric geometry for an existing image hand without image IO;
 // the insertion policy is keyed by its native eleType.
 registerElement('rotatingHand', {
  add: () => { throw Error('not used: existing hand fixture') },
  encode: (element:any) => ({id:element.id,eleType:'rectangle',left:element.left,top:element.top,width:element.width,height:element.height,fill:element.fill} as any),
 })
 const hand=new Rect({id:'hand',eleType:'rotatingHand',left:227,top:227,width:4,height:100,fill:'#FFFFFF'} as any)
 canvas.add(hand)
 await apply({summary:'Add scenery behind readings',changes:[],additions:additions.filter(a=>['circle','rectangle','triangle'].includes(a.eleType))})
 const order=canvas.getObjects().map((o:any)=>o.id)
 for(const id of ['sun','land','hill']){
  expect(order.indexOf(id)).toBeLessThan(order.indexOf('label'))
  expect(order.indexOf(id)).toBeLessThan(order.indexOf('hand'))
 }
})
