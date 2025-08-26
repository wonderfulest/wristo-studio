export type Procedure<TArgs extends any[] = any[], TThis = any, TResult = any> = (
  this: TThis,
  ...args: TArgs
) => TResult

/**
 * 高性能节流函数
 */
export const throttle = <TArgs extends any[], TThis = any>(func: Procedure<TArgs, TThis, void>, limit: number) => {
  let lastFunc: any
  let lastRan: number | undefined
  return function (this: TThis, ...args: TArgs) {
    const context = this
    if (!lastRan) {
      func.apply(context, args)
      lastRan = Date.now()
    } else {
      clearTimeout(lastFunc)
      lastFunc = setTimeout(function () {
        if (Date.now() - (lastRan as number) >= limit) {
          func.apply(context, args)
          lastRan = Date.now()
        }
      }, limit - (Date.now() - (lastRan as number)))
    }
  }
}
