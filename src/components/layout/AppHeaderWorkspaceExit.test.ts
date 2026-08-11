import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const headerSource = readFileSync(new URL('./AppHeader.vue', import.meta.url), 'utf8')

describe('AppHeader workspace exit confirmation', () => {
  it('offers a red discard-and-exit action before the safe actions', () => {
    const dialogStart = headerSource.indexOf('v-model="designsListDialogVisible"')
    const dialogEnd = headerSource.indexOf('</el-dialog>', dialogStart)
    const dialogSource = headerSource.slice(dialogStart, dialogEnd)

    expect(dialogSource).toContain('type="danger"')
    expect(dialogSource).toContain('@click="discardAndOpenDesignsList"')
    expect(dialogSource).toContain("t('dialog.discardAndExit')")
    expect(dialogSource.indexOf('discardAndOpenDesignsList')).toBeLessThan(dialogSource.indexOf("t('common.cancel')"))
  })

  it('resets editor state and opens the workspace without saving', () => {
    const handlerStart = headerSource.indexOf('const discardAndOpenDesignsList =')
    const handlerEnd = headerSource.indexOf('const confirmOpenDesignsList =', handlerStart)
    const handlerSource = headerSource.slice(handlerStart, handlerEnd)

    expect(handlerSource).toContain('designsListDialogVisible.value = false')
    expect(handlerSource).toContain('baseStore.$reset()')
    expect(handlerSource).toContain("router.push('/designs')")
    expect(handlerSource).not.toContain('uploadApp')
  })
})
