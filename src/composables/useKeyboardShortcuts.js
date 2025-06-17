import Mousetrap from 'mousetrap'
import { onMounted, onUnmounted } from 'vue'
import { useBaseElementStore } from '../stores/elements/baseElement'
import emitter from '@/utils/eventBus'
import { useRoute } from 'vue-router'

export function useKeyboardShortcuts() {
  const baseStore = useBaseElementStore()
  const route = useRoute()

  // 检查是否在表盘编辑器页面
  const isInEditor = () => {
    return route.name == 'Design'
  }
  // 阻止浏览器默认快捷键
 const preventDefaultShortcuts = (e) => {
    // 如果不在编辑器页面，不阻止默认行为
    if (!isInEditor()) return

    // 如果是在输入框内，允许默认行为
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return
    }

    // 阻止的快捷键列表
    const blockedShortcuts = [
      'ctrl+d', 'ctrl+f', 'ctrl+h', 'ctrl+p', 'ctrl+s', 'ctrl+w', 'ctrl+z', 'ctrl+y',
      'command+d', 'command+f', 'command+h', 'command+p', 'command+s', 'command+w', 'command+z', 'command+y'
    ]

    const key = e.key.toLowerCase()
    const isCtrl = e.ctrlKey
    const isCommand = e.metaKey
    const shortcut = `${isCtrl ? 'ctrl+' : isCommand ? 'command+' : ''}${key}`

    if (blockedShortcuts.includes(shortcut)) {
      e.preventDefault()
      e.stopImmediatePropagation()
      return false
    }
  }
  onMounted(() => {
   

    // 在捕获阶段添加事件监听
    document.addEventListener('keydown', preventDefaultShortcuts, { capture: true })

    // 绑定方向键
    Mousetrap.bind('left', () => {
      console.log('left')
      if (isInEditor()) baseStore.moveElement('left', 1)
    })
    Mousetrap.bind('right', () => {
      console.log('right')
      if (isInEditor()) baseStore.moveElement('right', 1)
    })
    Mousetrap.bind('up', () => {
      console.log('up')
      if (isInEditor()) baseStore.moveElement('up', 1)
    })
    Mousetrap.bind('down', () => {
      console.log('down')
      if (isInEditor()) baseStore.moveElement('down', 1)
    })

    // 绑定Shift+方向键，步长翻倍
    Mousetrap.bind('shift+left', () => {
      console.log('shift+left')
      if (isInEditor()) baseStore.moveElement('left', 2)
    })
    Mousetrap.bind('shift+right', () => {
      console.log('shift+right')
      if (isInEditor()) baseStore.moveElement('right', 2)
    })
    Mousetrap.bind('shift+up', () => {
      console.log('shift+up')
      if (isInEditor()) baseStore.moveElement('up', 2)
    })
    Mousetrap.bind('shift+down', () => {
      console.log('shift+down')
      if (isInEditor()) baseStore.moveElement('down', 2)
    })

    // 绑定Shift+加减号，修改字体大小
    Mousetrap.bind('shift+=', () => {
      console.log('shift+=')
      if (isInEditor()) baseStore.changeFontSize(1)
    })
    Mousetrap.bind('shift+-', () => {
      console.log('shift+-')
      if (isInEditor()) baseStore.changeFontSize(-1)
    })

    // 绑定复制粘贴快捷键
    Mousetrap.bind(['command+c', 'ctrl+c'], () => {
      console.log('command+c')
      if (isInEditor()) {
        baseStore.copySelectedElements()
        return false
      }
    })

    Mousetrap.bind(['command+v', 'ctrl+v'], () => {
      console.log('command+v')
      if (isInEditor()) {
        baseStore.pasteElements()
        return false
      }
    })

    // 绑定 App Properties 快捷键
    Mousetrap.bind(['command+,', 'ctrl+,'], () => {
      console.log('command+,')
      if (isInEditor()) {
        emitter.emit('open-app-properties')
        return false
      }
    })

    // 绑定 View 配置面板快捷键
    Mousetrap.bind(['command+.', 'ctrl+.'], () => {
      console.log('command+.')
      if (isInEditor()) {
        emitter.emit('open-view-properties')
        return false
      }
    })
  })

  onUnmounted(() => {
    // 清理绑定
    Mousetrap.unbind([
      'left', 'right', 'up', 'down',
      'shift+left', 'shift+right', 'shift+up', 'shift+down',
      'shift+=', 'shift+-',
      'command+c', 'ctrl+c', 'command+v', 'ctrl+v',
      'command+,', 'ctrl+,', 'command+.', 'ctrl+.',
    ])
    // 移除事件监听
    document.removeEventListener('keydown', preventDefaultShortcuts, { capture: true })
  })
}
