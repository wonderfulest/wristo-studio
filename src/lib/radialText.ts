import { FabricText, Group as FabricGroup } from 'fabric'
import { getDataValueByName } from '@/utils/dataSimulator'

interface FabricRadialTextOptions {
  text?: string
  cx?: number
  cy?: number
  radius?: number
  fontSize?: number
  fontFamily?: string
  startAngle?: number // degrees
  direction?: 1 | -1
  inner?: boolean
  charSpacing?: number
  fill: string
}

// 环形文字渲染工具：不依赖外部库，只依赖 fabric
export class FabricRadialText {
  text: string
  cx: number
  cy: number
  radius: number
  fontSize: number
  fontFamily: string
  startAngle: number
  direction: 1 | -1
  inner: boolean
  charSpacing: number
  fill: string

  constructor(options: FabricRadialTextOptions) {
    this.text = options.text || ''
    // 径向文字圆心固定为表盘中心（当前为 227,227），不随元素位置变化
    this.cx = 227
    this.cy = 227
    this.radius = options.radius || 100

    this.fontSize = options.fontSize || 24
    this.fontFamily = options.fontFamily || 'Noto Sans SC'

    this.startAngle = options.startAngle ?? 0
    this.direction = options.direction ?? 1
    this.inner = options.inner ?? false
    this.charSpacing = options.charSpacing ?? 0

    this.fill = options.fill
  }

  // 生成环形文字，返回 fabric.Group
  render() {
    const templateText = this.text || ''
    const baseResolvedText = templateText.replace(/\{\{([^}]+)\}\}/g, (_match, p1) => {
      const key = String(p1 || '').trim()
      return key ? getDataValueByName(key) : ''
    })

    const chars = baseResolvedText.split('')
    const items: FabricText[] = []
    const rad = (deg: number) => (deg * Math.PI) / 180

    // 1. 先创建所有字符测量宽度
    const charObjs = chars.map((c) => {
      return new FabricText(c, {
        fontSize: this.fontSize,
        fontFamily: this.fontFamily,
        originX: 'center',
        originY: 'center',
        fill: this.fill,
      } as any)
    })

    // 计算文字总弧长（用于居中对齐）
    const totalArcLength = charObjs.reduce(
      (sum, obj) => sum + (obj.width || 0) + this.charSpacing,
      0,
    )

    // 起始角度：居中对齐
    const startRad = rad(this.startAngle)
    let angle = startRad - (totalArcLength / this.radius) / 2

    // 2. 逐字放置
    for (let i = 0; i < chars.length; i++) {
      const obj = charObjs[i]
      const w = (obj.width || 0) + this.charSpacing

      const deltaAngle = (w / this.radius) * this.direction
      angle += deltaAngle / 2

      const x = this.radius * Math.cos(angle)
      const y = this.radius * Math.sin(angle)
      obj.set({ left: x, top: y } as any)

      let rotateDeg = (angle * 180) / Math.PI + 90
      if (this.inner) rotateDeg += 180

      obj.rotate(rotateDeg)
      items.push(obj)

      angle += deltaAngle / 2
    }

    // 3. 组合成 Group
    // 注意：Fabric 在创建 Group 时会自动计算边界框，并把 items 的坐标转换为相对于边界框中心的局部坐标
    // 所以我们先不设置 left/top，让 Fabric 自动放置
    const group = new FabricGroup(items, {
      originX: 'center',
      originY: 'center',
    } as any)

    // Fabric 已经把 group 放在了 items 的边界框中心
    // 我们的 items 是以 (0, 0) 为圆心布局的，但边界框中心不是 (0, 0)
    // 需要补偿这个偏移，使得逻辑圆心 (0, 0) 对应到画布上的 (227, 227)
    // 偏移量 = 当前 group 位置（边界框中心）- 逻辑圆心 (0, 0) = group.left, group.top
    // 目标位置 = 227 + 偏移量? 不对，应该是：
    // 我们想让逻辑 (0,0) 在画布 (227, 227)，而当前 group 中心是边界框中心
    // 所以目标 group 位置 = 227 - (边界框中心相对于逻辑圆心的偏移)
    // 但更简单的做法：直接把 group 移动到 (227, 227)，然后遍历 items 把坐标加回去

    // 获取当前 group 的边界框中心（Fabric 自动计算的位置）
    const fabricCenter = { x: group.left || 0, y: group.top || 0 }
    console.log('[FabricRadialText] fabricCenter:', fabricCenter)

    // 把 group 移动到目标圆心 (227, 227)
    group.set({ left: 227, top: 227, width: 454, height: 454 })

    // 补偿：把 Fabric 重新计算的局部坐标调整回来
    // 每个 item 的新局部坐标 = 原始偏移 (radius*cos, radius*sin) - fabricCenter
    // 但 Fabric 已经做过一次转换了，所以我们需要再次设置正确的局部坐标
    // 由于 group 现在在 (227, 227)，items 应该是相对于 (227, 227) 的偏移
    // 也就是 items 的局部坐标就是 radius*cos, radius*sin
    // 我们重新遍历 items，设置它们的坐标为原始的 radius*cos, radius*sin
    const radReset = (deg: number) => (deg * Math.PI) / 180
    const startRadReset = radReset(this.startAngle)
    const totalArcLengthReset = items.reduce(
      (sum, obj) => sum + (obj.width || 0) + this.charSpacing,
      0,
    )
    let angleReset = startRadReset - (totalArcLengthReset / this.radius) / 2

    items.forEach((obj) => {
      const w = (obj.width || 0) + this.charSpacing
      const deltaAngle = (w / this.radius) * this.direction
      angleReset += deltaAngle / 2

      const x = this.radius * Math.cos(angleReset)
      const y = this.radius * Math.sin(angleReset)
      obj.set({ left: x, top: y } as any)

      angleReset += deltaAngle / 2
    })

    // 通知 Fabric 更新 group 的边界
    ;(group as any).addWithUpdate && (group as any).addWithUpdate()
    group.setCoords && group.setCoords()

    // 附加元数据和更新方法，方便之后根据半径/角度等重新布局
    const meta = {
      radius: this.radius,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      startAngle: this.startAngle,
      direction: this.direction,
      inner: this.inner,
      charSpacing: this.charSpacing,
      text: baseResolvedText,
    }

    ;(group as any).radialMeta = meta

    ;(group as any).updateRadialLayout = function updateRadialLayout() {
      const g: any = this
      const m = g.radialMeta || meta

      const radLocal = (deg: number) => (deg * Math.PI) / 180
      const currentRadius = typeof g.radius === 'number' ? g.radius : m.radius
      // 使用自定义属性 startAngle，而不是 Fabric 的 angle
      const startAngleDeg = typeof g.startAngle === 'number' ? g.startAngle : m.startAngle
      const directionFactor = m.direction || 1
      const spacing = m.charSpacing || 0

      const charsLocal = Array.isArray(g._objects) ? g._objects : []

      const totalArcLength = charsLocal.reduce((sum: number, obj: any) => {
        const w = obj.width || (typeof obj.getScaledWidth === 'function' ? obj.getScaledWidth() : 0)
        return sum + w + spacing
      }, 0)

      const startRadLocal = radLocal(startAngleDeg)
      let angleLocal = startRadLocal - (totalArcLength / currentRadius) / 2

      charsLocal.forEach((obj: any) => {
        const w = obj.width || (typeof obj.getScaledWidth === 'function' ? obj.getScaledWidth() : 0)
        const deltaAngle = (w / currentRadius) * directionFactor

        angleLocal += deltaAngle / 2

        const x = currentRadius * Math.cos(angleLocal)
        const y = currentRadius * Math.sin(angleLocal)
        obj.set({ left: x, top: y } as any)

        let rotateDeg = (angleLocal * 180) / Math.PI + 90
        if (m.inner) rotateDeg += 180

        obj.rotate(rotateDeg)

        angleLocal += deltaAngle / 2
      })
      g.addWithUpdate && g.addWithUpdate()
      g.setCoords && g.setCoords()
    }

    // 统一文本更新：根据新文本增删子对象并重排
    ;(group as any).updateRadialText = function updateRadialText(newText: string) {
      console.log('[111 updateRadialText] newText (template)', newText)
      const g: any = this
      const m = g.radialMeta || meta
      // 1) 先把模板字符串解析为真实展示文本
      // 支持简单形式："hr" 或 "{{hr}}"，以及混合文本例如 "HR {{hr}} bpm"
      const resolvedText = (newText || '').replace(/\{\{([^}]+)\}\}/g, (_match, p1) => {
        const key = String(p1 || '').trim()
        return key ? getDataValueByName(key) : ''
      })

      // 2) 更新模板与解析后的文本
      g.textTemplate = newText
      g.text = resolvedText
      if (m) m.text = resolvedText

      const chars = resolvedText.split('')
      const current: any[] = Array.isArray(g._objects) ? g._objects : []

      // 删除多余字符
      if (current.length > chars.length) {
        for (let i = chars.length; i < current.length; i++) {
          const child = current[i]
          if (!child) continue
          if (typeof g.removeWithUpdate === 'function') {
            g.removeWithUpdate(child)
          } else if (typeof g.remove === 'function') {
            g.remove(child)
          }
        }
      }

      // 增加缺少字符，沿用当前样式
      if (current.length < chars.length) {
        const prevCount = current.length
        const need = chars.length - current.length
        const addedChars = chars.slice(prevCount)
        console.log('[FabricRadialText.updateRadialText] added text:', addedChars.join(''))
        console.log('[FabricRadialText.updateRadialText] added chars array:', addedChars)
        for (let i = 0; i < need; i++) {
          const newIndex = prevCount + i
          console.log('[FabricRadialText.updateRadialText] add char at', newIndex, '=>', chars[newIndex], g.fill || m.fill)
          const child = new FabricText('', {
            fontSize: typeof g.fontSize === 'number' ? g.fontSize : m.fontSize,
            fontFamily: g.fontFamily || m.fontFamily,
            originX: 'center',
            originY: 'center',
            fill: g.fill || m.fill,
          } as any)
          if (typeof g.addWithUpdate === 'function') {
            g.addWithUpdate(child)
          } else if (typeof g.add === 'function') {
            g.add(child)
          } else {
            // 最后兜底（不推荐）：直接推入 _objects，后续 addWithUpdate 会校正
            Array.isArray(g._objects) && g._objects.push(child)
          }
        }
      }

      // 写入每个字符（使用最新的 g._objects）
      const children: any[] = Array.isArray(g._objects) ? g._objects : []
      children.forEach((child: any, index: number) => {
        if (child && typeof child.set === 'function') {
          child.set('text', chars[index] ?? '')
          // 标记脏并重算尺寸，确保 width 可用于角度计算
          child.dirty = true
          if (typeof child.initDimensions === 'function') child.initDimensions()
        }
      })

    
      // 让 Fabric 重算边界并重排
      g.addWithUpdate && g.addWithUpdate()
      g.set({left: 227, top: 227, width: 454, height: 454})
      if (typeof g.updateRadialLayout === 'function') {
        g.updateRadialLayout()
      } else {
        g.setCoords && g.setCoords()
      }
    }
   

    return group
  }
}

export default FabricRadialText
