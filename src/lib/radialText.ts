import { Text as FabricText, Group as FabricGroup } from 'fabric'

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
  fill?: string
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

  constructor(options: FabricRadialTextOptions = {}) {
    this.text = options.text || ''
    this.cx = options.cx || 0
    this.cy = options.cy || 0
    this.radius = options.radius || 100

    this.fontSize = options.fontSize || 24
    this.fontFamily = options.fontFamily || 'Noto Sans SC'

    this.startAngle = options.startAngle ?? 0
    this.direction = options.direction ?? 1
    this.inner = options.inner ?? false
    this.charSpacing = options.charSpacing ?? 0

    this.fill = options.fill || '#000'
  }

  // 生成环形文字，返回 fabric.Group
  render() {
    const chars = this.text.split('')
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
    const totalArcLength = charObjs.reduce((sum, obj) => sum + (obj.width || 0) + this.charSpacing, 0)

    // 起始角度：居中对齐
    let angle = rad(this.startAngle) - (totalArcLength / this.radius) / 2

    // 2. 逐字放置
    for (let i = 0; i < chars.length; i++) {
      const obj = charObjs[i]
      const w = (obj.width || 0) + this.charSpacing

      const deltaAngle = (w / this.radius) * this.direction
      angle += deltaAngle / 2

      const x = this.cx + this.radius * Math.cos(angle)
      const y = this.cy + this.radius * Math.sin(angle)

      obj.set({ left: x, top: y } as any)

      let rotateDeg = (angle * 180) / Math.PI + 90
      if (this.inner) rotateDeg += 180

      obj.rotate(rotateDeg)
      items.push(obj)

      angle += deltaAngle / 2
    }

    // 3. 组合成 Group 方便缩放/移动
    const group = new FabricGroup(items, {
      left: this.cx,
      top: this.cy,
      originX: 'center',
      originY: 'center',
    } as any)

    return group
  }
}

export default FabricRadialText
