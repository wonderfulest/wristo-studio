import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readDialog = (name: string) => readFileSync(new URL(`./${name}.vue`, import.meta.url), 'utf8')

describe('Garmin official payment UI contract', () => {
  it.each(['SubmitDesignDialog', 'GoLiveDialog', 'EditDesignDialog'])(
    '%s exposes Garmin official payment only to admins and locks the method after first go-live',
    (name) => {
      const source = readDialog(name)

      expect(source).toContain('label="garmin"')
      expect(source).toContain('v-if="userStore.isAdminUser"')
      expect(source).toContain("t('payment.garminOfficial')")
      expect(source).toContain('paymentMethodLocked')
      expect(source).toContain("t('payment.methodLockedAfterPublish')")
    },
  )

  it.each(['SubmitDesignDialog', 'GoLiveDialog', 'EditDesignDialog'])(
    '%s normalizes trial time through the shared payment rule',
    (name) => {
      expect(readDialog(name)).toContain('normalizeTrialLasts')
    },
  )

  it('allows Garmin official payment as an admin-only designer default', () => {
    const source = readDialog('DesignerDefaultConfigDialog')

    expect(source).toContain('value="garmin"')
    expect(source).toContain('v-if="userStore.isAdminUser"')
    expect(source).toContain("t('payment.garminOfficial')")
  })
})
