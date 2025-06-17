// 定义常用的图标映射
export const alignmentIcons = {
  left: 'mdi:format-align-left',
  center: 'mdi:format-align-center',
  right: 'mdi:format-align-right',
  top: 'mdi:format-align-top',
  middle: 'mdi:format-align-middle',
  bottom: 'mdi:format-align-bottom'
}

export const layoutIcons = {
  ':LAYOUT_TYPES_CENTER': 'mdi:format-horizontal-align-center',
  ':LAYOUT_TYPES_LEFT': 'mdi:format-horizontal-align-left',
  ':LAYOUT_TYPES_RIGHT': 'mdi:format-horizontal-align-right'
}

// 导出所有图标列表，方便预加载
export const allIconsList = [...Object.values(alignmentIcons), ...Object.values(layoutIcons)]
