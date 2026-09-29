type BeforeStudioLogin = () => Promise<void>
let beforeStudioLogin: BeforeStudioLogin | undefined

export function registerBeforeStudioLogin(handler: BeforeStudioLogin) {
  beforeStudioLogin = handler
  return () => {
    if (beforeStudioLogin === handler) beforeStudioLogin = undefined
  }
}

export async function prepareStudioLogin() {
  await beforeStudioLogin?.()
}
