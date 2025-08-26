// 应用全局配置
export default {
  // 自动保存相关配置
  autoSave: {
    // 自动保存间隔 (毫秒)
    interval: 20 * 1000, // 20秒
    // 是否启用自动保存
    enabled: false
  },

  // 可以添加其他全局配置
  api: {
    timeout: 30000
  },

  // 字体相关配置
  fonts: {
    // ...
  },

  // 更新日志数据
  changelog: {
    // 是否启用更新日志
    enabled: true,
    // 存储在 localStorage 中的键名
    storageKey: 'last-viewed-changelog-version',
    // 更新日志数据
    versions: [
      {
        version: '1.0.13',
        date: '2025-05-14',
        updates: [
          '增加背景颜色配置',
        ]
      },
      {
        version: '1.0.12',
        date: '2025-05-10',
        updates: [
          '图层支持顺序调整，调整后排在前面的图层显示在图层下方；尤其是指针表盘, 层次一定要清晰',
          '图层选中后，设置项立即显示当前元素设置；实现方式为选中图层元素时，先取消所有选中，再设置select；然后配合事件通知，更新设置项当前元素',
          '增加更多的 dial 素材，将现在 dial-png 文件夹下的用 figma 重新设计',
        ]
      },
      {
        version: '1.0.11',
        date: '2025-05-08',
        updates: [
          '增加dial功能',
          '设置12小时/60小时刻度线',
          '增加罗马数字元素',
        ]
      },
      {
        version: '1.0.10',
        date: '2025-05-03',
        updates: [
          '增加了标尺功能',
          '增加了辅助线功能',
          '增加了画布缩放功能',
          '增加了时针和分针的设置功能',
          '支持画布背景色设置'
        ]
      }
    ]
  }
}
