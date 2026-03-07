import Mousetrap from 'mousetrap'
import emitter from '@/utils/eventBus'
import {
  nudgeSelection,
  changeSelectionFontSize,
  copySelection,
  pasteSelection,
} from '@/engine/managers/elementManager'

// 记录 Mousetrap 原始 stopCallback，便于还原
let originalStop: ((e: KeyboardEvent, element: Element, combo: string) => boolean) | null = null

let preventDefaultShortcuts: ((e: KeyboardEvent) => void) | null = null

export interface KeyboardManagerDeps {
  isInEditor: () => boolean
}

export function attachKeyboardShortcuts({ isInEditor }: KeyboardManagerDeps): void {
  // 阻止浏览器默认快捷键
  preventDefaultShortcuts = (e: KeyboardEvent) => {
    if (!isInEditor()) return

    const target = e.target as HTMLElement | null
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
    ) {
      return
    }

    const blockedShortcuts = [
      'ctrl+d',
      'ctrl+f',
      'ctrl+h',
      'ctrl+p',
      'ctrl+s',
      'ctrl+w',
      'ctrl+z',
      'ctrl+y',
      'command+d',
      'command+f',
      'command+h',
      'command+p',
      'command+s',
      'command+w',
      'command+y',
    ]

    const key = e.key.toLowerCase()
    const isCtrl = e.ctrlKey
    const isCommand = e.metaKey
    const shortcut = `${isCtrl ? 'ctrl+' : isCommand ? 'command+' : ''}${key}`

    const willBlock = blockedShortcuts.includes(shortcut)
    if (willBlock) {
      e.preventDefault()
      ;(e as any).stopImmediatePropagation?.()
    }
  }

  document.addEventListener('keydown', preventDefaultShortcuts as EventListener, { capture: true })

  // 调整 Mousetrap 在编辑器中的 stopCallback 行为
  originalStop = Mousetrap.stopCallback
  Mousetrap.stopCallback = (e: KeyboardEvent, element: Element, combo: string) => {
    if (isInEditor()) return false
    return originalStop ? originalStop(e, element, combo) : false
  }

  // 方向键移动
  Mousetrap.bind('left', () => {
    if (isInEditor()) nudgeSelection('left', 1)
  })
  Mousetrap.bind('right', () => {
    if (isInEditor()) nudgeSelection('right', 1)
  })
  Mousetrap.bind('up', () => {
    if (isInEditor()) nudgeSelection('up', 1)
  })
  Mousetrap.bind('down', () => {
    if (isInEditor()) nudgeSelection('down', 1)
  })

  // Shift + 方向键，步长翻倍
  Mousetrap.bind('shift+left', () => {
    if (isInEditor()) nudgeSelection('left', 2)
  })
  Mousetrap.bind('shift+right', () => {
    if (isInEditor()) nudgeSelection('right', 2)
  })
  Mousetrap.bind('shift+up', () => {
    if (isInEditor()) nudgeSelection('up', 2)
  })
  Mousetrap.bind('shift+down', () => {
    if (isInEditor()) nudgeSelection('down', 2)
  })

  // Shift + 加减号，修改字体大小
  Mousetrap.bind('shift+=', () => {
    if (isInEditor()) changeSelectionFontSize(1)
  })
  Mousetrap.bind('shift+-', () => {
    if (isInEditor()) changeSelectionFontSize(-1)
  })

  // 复制
  Mousetrap.bind(['command+c', 'ctrl+c'], () => {
    if (isInEditor()) {
      copySelection()
      return false as unknown as void
    }
  })

  // 粘贴
  Mousetrap.bind(['command+v', 'ctrl+v'], () => {
    if (isInEditor()) {
      pasteSelection()
      return false as unknown as void
    }
  })

  // 撤销 / 重做，通过事件总线通知画布
  Mousetrap.bind(['command+z', 'ctrl+z'], (e?: KeyboardEvent) => {
    if (isInEditor()) {
      ;(emitter as any).emit('canvas-undo')
      e?.preventDefault?.()
      return false as unknown as void
    }
  })

  Mousetrap.bind(['shift+command+z', 'shift+ctrl+z'], (e?: KeyboardEvent) => {
    if (isInEditor()) {
      ;(emitter as any).emit('canvas-redo')
      e?.preventDefault?.()
      return false as unknown as void
    }
  })

  // App Properties 面板
  Mousetrap.bind(['command+,', 'ctrl+,'], () => {
    if (isInEditor()) {
      ;(emitter as any).emit('open-app-properties')
      return false as unknown as void
    }
  })

  // View 配置面板
  Mousetrap.bind(['command+.', 'ctrl+.'], () => {
    if (isInEditor()) {
      ;(emitter as any).emit('open-view-properties')
      return false as unknown as void
    }
  })
}

export function detachKeyboardShortcuts(): void {
  Mousetrap.unbind([
    'left',
    'right',
    'up',
    'down',
    'shift+left',
    'shift+right',
    'shift+up',
    'shift+down',
    'shift+=',
    'shift+-',
    'command+c',
    'ctrl+c',
    'command+v',
    'ctrl+v',
    'command+z',
    'ctrl+z',
    'shift+command+z',
    'shift+ctrl+z',
    'command+,',
    'ctrl+,',
    'command+.',
    'ctrl+.',
  ])

  if (preventDefaultShortcuts) {
    document.removeEventListener('keydown', preventDefaultShortcuts as EventListener, {
      capture: true,
    })
    preventDefaultShortcuts = null
  }

  Mousetrap.stopCallback =
    originalStop ?? ((e: KeyboardEvent, element: Element, combo: string) => false)
}
