export const BizErrorCode = {
  SUCCESS: 0,
  SYSTEM_ERROR: -1,
  PARAM_ERROR: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  // 支付相关
  INVALID_PAYMENT_CODE: 1001,
  ALREADY_PAID: 1002,
  PRODUCT_NOT_FOUND: 1003,
} as const

export const BizErrorMessage: Record<number, string> = {
  [BizErrorCode.SUCCESS]: 'success',
  [BizErrorCode.SYSTEM_ERROR]: '系统错误',
  [BizErrorCode.PARAM_ERROR]: '参数错误',
  [BizErrorCode.NOT_FOUND]: '未找到资源',
  [BizErrorCode.FORBIDDEN]: '无权限访问',
  [BizErrorCode.INVALID_PAYMENT_CODE]: '无效的支付码',
  [BizErrorCode.ALREADY_PAID]: '已支付，无需重复操作',
  [BizErrorCode.PRODUCT_NOT_FOUND]: '未找到产品',
}
