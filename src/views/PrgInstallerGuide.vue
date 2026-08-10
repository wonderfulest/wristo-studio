<template>
  <div class="prg-installer-guide">
    <header class="guide-hero">
      <div class="hero-mark">CIQ</div>
      <div>
        <p class="eyebrow">Wristo Studio</p>
        <h1>{{ t('prgInstallerGuide.title') }}</h1>
        <p class="subtitle">{{ t('prgInstallerGuide.subtitle') }}</p>
        <p class="no-terminal">{{ t('prgInstallerGuide.noTerminal') }}</p>
      </div>
    </header>

    <el-tabs v-model="activePlatform" class="platform-tabs">
      <el-tab-pane v-for="platform in platforms" :key="platform" :name="platform" :label="platformLabel(platform)">
        <section v-if="platform === 'mac'" class="download-card">
          <div>
            <h2>{{ platformLabel(platform) }}</h2>
            <select
              v-if="macArchitectures.length > 1"
              v-model="activeMacArchitecture"
              class="architecture-select"
              data-test="prg-installer-mac-architecture"
              aria-label="macOS architecture"
            >
              <option :value="null" disabled>Architecture</option>
              <option v-for="arch in macArchitectures" :key="arch" :value="arch">{{ architectureLabel(arch) }}</option>
            </select>
            <dl class="release-meta">
              <template v-if="releaseFor(platform).architecture">
                <dt>Architecture</dt>
                <dd :data-test="`prg-installer-${platform}-architecture-label`">
                  {{ architectureLabel(releaseFor(platform).architecture!) }}
                </dd>
              </template>
              <template v-if="releaseFor(platform).version">
                <dt>{{ t('prgInstallerGuide.version') }}</dt>
                <dd>{{ releaseFor(platform).version }}</dd>
              </template>
              <template v-if="releaseFor(platform).requirements">
                <dt>{{ t('prgInstallerGuide.requirements') }}</dt>
                <dd>{{ releaseFor(platform).requirements }}</dd>
              </template>
              <template v-if="releaseFor(platform).sha256">
                <dt>{{ t('prgInstallerGuide.sha256') }}</dt>
                <dd class="checksum">{{ releaseFor(platform).sha256 }}</dd>
              </template>
            </dl>
          </div>
          <a v-if="releaseFor(platform).available && releaseFor(platform).url" :data-test="`prg-installer-download-${platform}`" :href="releaseFor(platform).url!" rel="noopener noreferrer">
            <el-button type="primary" size="large">{{ t('prgInstallerGuide.download') }}</el-button>
          </a>
          <el-button v-else :data-test="`prg-installer-download-${platform}-unavailable`" size="large" disabled>
            {{ t('prgInstallerGuide.downloadUnavailable') }}
          </el-button>
        </section>
        <section v-else class="download-card windows-download-card">
          <div class="windows-downloads">
            <h2>{{ platformLabel(platform) }}</h2>
            <article v-for="kind in hasWindowsInstaller ? windowsInstallerKinds : []" :key="kind" class="installer-option">
              <div class="installer-details">
                <div class="installer-heading">
                  <h3>{{ t(kind === 'exe' ? 'prgInstallerGuide.windowsExe' : 'prgInstallerGuide.windowsMsi') }}</h3>
                  <span v-if="kind === 'exe'" class="recommended">{{ t('prgInstallerGuide.recommended') }}</span>
                </div>
                <p>{{ t(kind === 'exe' ? 'prgInstallerGuide.windowsExeDescription' : 'prgInstallerGuide.windowsMsiDescription') }}</p>
                <dl v-if="windowsInstallerFor(kind).available" class="release-meta installer-meta">
                  <template v-if="windowsInstallerFor(kind).version">
                    <dt>{{ t('prgInstallerGuide.version') }}</dt>
                    <dd>{{ windowsInstallerFor(kind).version }}</dd>
                  </template>
                  <template v-if="windowsInstallerFor(kind).sha256">
                    <dt>{{ t('prgInstallerGuide.sha256') }}</dt>
                    <dd :data-test="`prg-installer-windows-${kind}-sha256`" class="checksum">{{ windowsInstallerFor(kind).sha256 }}</dd>
                  </template>
                </dl>
              </div>
              <a
                v-if="windowsInstallerFor(kind).available && windowsInstallerFor(kind).url"
                :data-test="`prg-installer-download-windows-${kind}`"
                :href="windowsInstallerFor(kind).url!"
                rel="noopener noreferrer"
              >
                <el-button :type="kind === 'exe' ? 'primary' : 'default'" size="large">{{ t('prgInstallerGuide.download') }}</el-button>
              </a>
              <el-button v-else :data-test="`prg-installer-download-windows-${kind}-unavailable`" size="large" disabled>
                {{ t('prgInstallerGuide.downloadUnavailable') }}
              </el-button>
            </article>
            <el-button v-if="!hasWindowsInstaller" data-test="prg-installer-download-windows-unavailable" size="large" disabled>
              {{ t('prgInstallerGuide.downloadUnavailable') }}
            </el-button>
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>

    <section class="guide-section">
      <div class="section-heading">
        <span>01</span>
        <h2>{{ t('prgInstallerGuide.getReady') }}</h2>
      </div>
      <ol class="steps">
        <li v-for="step in steps" :key="step.title" data-test="prg-installer-step">
          <div class="step-number">{{ step.number }}</div>
          <div>
            <h3>{{ t(step.title) }}</h3>
            <p>{{ t(step.body) }}</p>
          </div>
        </li>
      </ol>
      <a class="sdk-link" href="https://developer.garmin.com/connect-iq/sdk/" target="_blank" rel="noopener noreferrer">{{ t('prgInstallerGuide.garminSdk') }} ↗</a>
    </section>

    <div class="info-grid">
      <section class="guide-section compact">
        <div class="section-heading">
          <span>02</span>
          <h2>{{ t('prgInstallerGuide.limitationsTitle') }}</h2>
        </div>
        <ul>
          <li>{{ t('prgInstallerGuide.deviceLimit') }}</li>
          <li>{{ t('prgInstallerGuide.simulatorLimit') }}</li>
        </ul>
      </section>
      <section class="guide-section compact">
        <div class="section-heading">
          <span>03</span>
          <h2>{{ t('prgInstallerGuide.troubleshootingTitle') }}</h2>
        </div>
        <ul>
          <li>{{ t('prgInstallerGuide.troublePrgInstaller') }}</li>
          <li>{{ t('prgInstallerGuide.troubleSdk') }}</li>
          <li>{{ t('prgInstallerGuide.troubleSimulator') }}</li>
        </ul>
      </section>
    </div>

    <footer>
      <router-link to="/designs">
        <el-button>{{ t('prgInstallerGuide.returnStudio') }}</el-button>
      </router-link>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '@/i18n'
import { detectPrgInstallerPlatform, getPrgInstallerReleases, type PrgInstallerPlatform, type PrgInstallerRelease } from '@/features/prg-installer/config'
import { loadPrgInstallerReleases, type MacPrgInstallerArch, type WindowsInstallerKind } from '@/features/prg-installer/manifest'

const { t } = useI18n()
const platforms: PrgInstallerPlatform[] = ['mac', 'windows']
const releases = ref(getPrgInstallerReleases())
const macReleases = ref<Partial<Record<MacPrgInstallerArch, PrgInstallerRelease>>>({})
const macArchitectures = ref<MacPrgInstallerArch[]>([])
const windowsInstallers = ref<Partial<Record<WindowsInstallerKind, PrgInstallerRelease>>>({})
const windowsInstallerKinds: WindowsInstallerKind[] = ['exe', 'msi']
const activeMacArchitecture = ref<MacPrgInstallerArch | null>(null)
const activePlatform = ref<PrgInstallerPlatform>(detectPrgInstallerPlatform(navigator.platform))
const platformLabel = (platform: PrgInstallerPlatform) => t(platform === 'mac' ? 'prgInstallerGuide.platformMac' : 'prgInstallerGuide.platformWindows')
const architectureLabel = (arch: MacPrgInstallerArch) => ({ arm64: 'Apple Silicon (arm64)', x64: 'Intel (x64)', universal: 'Universal' })[arch]
const releaseFor = (platform: PrgInstallerPlatform): PrgInstallerRelease => {
  if (platform !== 'mac' || macArchitectures.value.length <= 1) return releases.value[platform]
  if (!activeMacArchitecture.value) return { ...releases.value.mac, available: false, url: null }
  return macReleases.value[activeMacArchitecture.value] ?? { ...releases.value.mac, available: false, url: null }
}
const windowsInstallerFor = (kind: WindowsInstallerKind): PrgInstallerRelease => {
  if (windowsInstallers.value[kind]) return windowsInstallers.value[kind]!
  if (kind === 'exe') return releases.value.windows
  return { ...releases.value.windows, available: false, url: null, sha256: null }
}
const hasWindowsInstaller = computed(() => windowsInstallerKinds.some((kind) => windowsInstallerFor(kind).available))

onMounted(async () => {
  const result = await loadPrgInstallerReleases({ fallback: releases.value })
  releases.value = result.releases
  macReleases.value = result.macReleases
  macArchitectures.value = result.macArchitectures
  windowsInstallers.value = result.windowsInstallers
  activeMacArchitecture.value = result.macArchitectures.length === 1 ? result.macArchitectures[0] : null
})
const steps = [
  { number: '1', title: 'prgInstallerGuide.step1Title', body: 'prgInstallerGuide.step1Body' },
  { number: '2', title: 'prgInstallerGuide.step2Title', body: 'prgInstallerGuide.step2Body' },
  { number: '3', title: 'prgInstallerGuide.step3Title', body: 'prgInstallerGuide.step3Body' },
  { number: '4', title: 'prgInstallerGuide.step4Title', body: 'prgInstallerGuide.step4Body' },
  { number: '5', title: 'prgInstallerGuide.step5Title', body: 'prgInstallerGuide.step5Body' }
]
</script>

<style scoped>
.prg-installer-guide {
  max-width: 1120px;
  margin: 0 auto;
  padding: 64px 28px 80px;
}
.architecture-select {
  min-width: 210px;
  margin-top: 12px;
  padding: 9px 12px;
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  background: var(--studio-surface-raised);
  color: var(--studio-text);
}
.guide-hero {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  margin-bottom: 44px;
}
.hero-mark {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  flex: 0 0 auto;
  border-radius: 20px;
  background: #111827;
  color: #fff;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.eyebrow {
  margin: 0 0 8px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
h1 {
  margin: 0;
  color: var(--studio-text);
  font-size: clamp(34px, 5vw, 58px);
  line-height: 1.05;
}
.subtitle {
  max-width: 720px;
  margin: 18px 0 10px;
  color: #64748b;
  font-size: 19px;
  line-height: 1.6;
}
.no-terminal {
  display: inline-block;
  margin: 0;
  padding: 7px 12px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-size: 14px;
  font-weight: 600;
}
.platform-tabs {
  margin-bottom: 44px;
}
.download-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: 30px;
  border: 1px solid #dbe3ec;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}
.download-card h2 {
  margin: 0 0 16px;
  font-size: 25px;
}
.windows-download-card {
  display: block;
}
.windows-downloads {
  width: 100%;
}
.installer-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 0;
  border-top: 1px solid #e2e8f0;
}
.installer-details {
  min-width: 0;
}
.installer-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}
.installer-heading h3 {
  margin: 0;
  font-size: 18px;
}
.recommended {
  padding: 3px 8px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
}
.installer-details p {
  margin: 6px 0 12px;
  color: #64748b;
}
.installer-meta {
  font-size: 13px;
}
.release-meta {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 8px 18px;
  margin: 0;
  color: #64748b;
}
.release-meta dt {
  font-weight: 600;
}
.release-meta dd {
  margin: 0;
}
.checksum {
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
.guide-section {
  margin-top: 32px;
  padding: 32px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid #e2e8f0;
}
.section-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.section-heading span {
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.section-heading h2 {
  margin: 0;
  font-size: 25px;
}
.steps {
  display: grid;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.steps li {
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 16px;
}
.step-number {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 800;
}
.steps h3 {
  margin: 2px 0 5px;
  font-size: 17px;
}
.steps p,
.compact li {
  margin: 0;
  color: #64748b;
  line-height: 1.65;
}
.sdk-link {
  display: inline-block;
  margin-top: 24px;
  color: #2563eb;
  font-weight: 650;
  text-decoration: none;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.compact ul {
  display: grid;
  gap: 14px;
  margin: 0;
  padding-left: 20px;
}
footer {
  margin-top: 36px;
  text-align: center;
}
@media (max-width: 720px) {
  .prg-installer-guide {
    padding: 36px 18px 56px;
  }
  .guide-hero {
    display: block;
  }
  .hero-mark {
    margin-bottom: 24px;
  }
  .download-card {
    align-items: stretch;
    flex-direction: column;
  }
  .download-card a,
  .download-card :deep(.el-button) {
    width: 100%;
  }
  .installer-option {
    align-items: stretch;
    flex-direction: column;
  }
  .release-meta {
    grid-template-columns: 1fr;
    gap: 3px;
  }
  .release-meta dd {
    margin-bottom: 8px;
  }
  .info-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .guide-section {
    padding: 24px 20px;
  }
}
</style>
