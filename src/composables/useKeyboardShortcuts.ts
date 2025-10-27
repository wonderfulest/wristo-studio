import Mousetrap from 'mousetrap'
import { onMounted, onUnmounted } from 'vue'
import { useBaseElementStore } from '@/stores/elements/baseElement'
import emitter from '@/utils/eventBus'
import { useRoute } from 'vue-router'

// 记录 Mousetrap 原始 stopCallback，便于还原
let originalStop: ((e: KeyboardEvent, element: Element, combo: string) => boolean) | null = null

export function useKeyboardShortcuts(): void {
  // baseElementStore 是 JS 实现，临时使用 any
  const baseStore = useBaseElementStore() as any
  const route = useRoute()

  // 检查是否在表盘编辑器页面
  const isInEditor = () => {
    return route.name == 'Design'
  }

  // 阻止浏览器默认快捷键
  const preventDefaultShortcuts = (e: KeyboardEvent) => {
    // 如果不在编辑器页面，不阻止默认行为
    if (!isInEditor()) {
      console.log('[Shortcuts] skip preventDefault (not in editor)')
      return
    }

    // 如果是在输入框内，允许默认行为
    const target = e.target as HTMLElement | null
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
    ) {
      console.log('[Shortcuts] allow default inside input/textarea/select')
      return
    }

    // 阻止的快捷键列表
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
    console.log('[Shortcuts] keydown', { key, isCtrl, isCommand, shortcut, willBlock })
    if (willBlock) {
      e.preventDefault()
      // stopImmediatePropagation 在类型上存在于 Event，但此处确认为 KeyboardEvent 也具备
      ;(e as any).stopImmediatePropagation?.()
      console.log('[Shortcuts] default prevented for', shortcut)
      return
    }
  }

  onMounted(() => {
    console.log('[Shortcuts] onMounted: register Mousetrap bindings')
    // 在捕获阶段添加事件监听
    document.addEventListener('keydown', preventDefaultShortcuts as EventListener, { capture: true })

    // 让 Mousetrap 在编辑器中对输入框也生效（避免输入框吞掉快捷键）
    originalStop = Mousetrap.stopCallback
    Mousetrap.stopCallback = (e: KeyboardEvent, element: Element, combo: string) => {
      if (isInEditor()) return false
      return originalStop ? originalStop(e, element, combo) : false
    }

    // 绑定方向键
    Mousetrap.bind('left', () => {
      if (isInEditor()) baseStore.moveElement('left', 1)
    })
    Mousetrap.bind('right', () => {
      if (isInEditor()) baseStore.moveElement('right', 1)
    })
    Mousetrap.bind('up', () => {
      if (isInEditor()) baseStore.moveElement('up', 1)
    })
    Mousetrap.bind('down', () => {
      if (isInEditor()) baseStore.moveElement('down', 1)
    })

    // 绑定Shift+方向键，步长翻倍
    Mousetrap.bind('shift+left', () => {
      if (isInEditor()) baseStore.moveElement('left', 2)
    })
    Mousetrap.bind('shift+right', () => {
      if (isInEditor()) baseStore.moveElement('right', 2)
    })
    Mousetrap.bind('shift+up', () => {
      if (isInEditor()) baseStore.moveElement('up', 2)
    })
    Mousetrap.bind('shift+down', () => {
      if (isInEditor()) baseStore.moveElement('down', 2)
    })

    // 绑定Shift+加减号，修改字体大小
    Mousetrap.bind('shift+=', () => {
      if (isInEditor()) baseStore.changeFontSize(1)
    })
    Mousetrap.bind('shift+-', () => {
      if (isInEditor()) baseStore.changeFontSize(-1)
    })

    // 绑定复制粘贴快捷键
    Mousetrap.bind(['command+c', 'ctrl+c'], () => {
      if (isInEditor()) {
        baseStore.copySelectedElements()
        return false as unknown as void
      }
    })

    Mousetrap.bind(['command+v', 'ctrl+v'], () => {
      if (isInEditor()) {
        baseStore.pasteElements()
        return false as unknown as void
      }
    })

    // 撤销/重做快捷键（统一由此发出事件给画布处理）
    Mousetrap.bind(['command+z', 'ctrl+z'], (e?: KeyboardEvent) => {
      if (isInEditor()) {
        console.log('[Shortcuts] undo via Mousetrap')
        ;(emitter as any).emit('canvas-undo')
        e?.preventDefault?.()
        return false as unknown as void
      }
    })

    Mousetrap.bind(['shift+command+z', 'shift+ctrl+z'], (e?: KeyboardEvent) => {
      console.log('[Shortcuts] redo via Mousetrap (Shift+Z)')
      if (isInEditor()) {
        ;(emitter as any).emit('canvas-redo')
        e?.preventDefault?.()
        return false as unknown as void
      }
    })

    // 绑定 App Properties 快捷键
    Mousetrap.bind(['command+,', 'ctrl+,'], () => {
      if (isInEditor()) {
        ;(emitter as any).emit('open-app-properties')
        return false as unknown as void
      }
    })

    // 绑定 View 配置面板快捷键
    Mousetrap.bind(['command+.', 'ctrl+.'], () => {
      if (isInEditor()) {
        ;(emitter as any).emit('open-view-properties')
        return false as unknown as void
      }
    })
  })

  onUnmounted(() => {
    console.log('[Shortcuts] onUnmounted: cleanup Mousetrap bindings')
    // 清理绑定
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
    // 移除事件监听
    document.removeEventListener('keydown', preventDefaultShortcuts as EventListener, { capture: true })
    // 恢复 Mousetrap 默认 stopCallback
    Mousetrap.stopCallback = originalStop ?? ((e: KeyboardEvent, element: Element, combo: string) => false)
  })
}
