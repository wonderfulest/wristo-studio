<template>
  <div class="launcher-guide">
    <header class="guide-hero">
      <div class="hero-mark">CIQ</div>
      <div>
        <p class="eyebrow">Wristo Studio</p>
        <h1>{{ t('launcherGuide.title') }}</h1>
        <p class="subtitle">{{ t('launcherGuide.subtitle') }}</p>
        <p class="no-terminal">{{ t('launcherGuide.noTerminal') }}</p>
      </div>
    </header>

    <el-tabs v-model="activePlatform" class="platform-tabs">
      <el-tab-pane v-for="platform in platforms" :key="platform" :name="platform" :label="platformLabel(platform)">
        <section class="download-card">
          <div>
            <h2>{{ platformLabel(platform) }}</h2>
            <select
              v-if="platform === 'mac' && macArchitectures.length > 1"
              v-model="activeMacArchitecture"
              class="architecture-select"
              data-test="launcher-mac-architecture"
              aria-label="macOS architecture"
            >
              <option :value="null" disabled>Architecture</option>
              <option v-for="arch in macArchitectures" :key="arch" :value="arch">{{ architectureLabel(arch) }}</option>
            </select>
            <dl class="release-meta">
              <template v-if="releaseFor(platform).architecture">
                <dt>Architecture</dt>
                <dd :data-test="`launcher-${platform}-architecture-label`">
                  {{ architectureLabel(releaseFor(platform).architecture!) }}
                </dd>
              </template>
              <template v-if="releaseFor(platform).version">
                <dt>{{ t('launcherGuide.version') }}</dt>
                <dd>{{ releaseFor(platform).version }}</dd>
              </template>
              <template v-if="releaseFor(platform).requirements">
                <dt>{{ t('launcherGuide.requirements') }}</dt>
                <dd>{{ releaseFor(platform).requirements }}</dd>
              </template>
              <template v-if="releaseFor(platform).sha256">
                <dt>{{ t('launcherGuide.sha256') }}</dt>
                <dd class="checksum">{{ releaseFor(platform).sha256 }}</dd>
              </template>
            </dl>
          </div>
          <a v-if="releaseFor(platform).available && releaseFor(platform).url" :data-test="`launcher-download-${platform}`" :href="releaseFor(platform).url!" rel="noopener noreferrer">
            <el-button type="primary" size="large">{{ t('launcherGuide.download') }}</el-button>
          </a>
          <el-button v-else :data-test="`launcher-download-${platform}-unavailable`" size="large" disabled>
            {{ t('launcherGuide.downloadUnavailable') }}
          </el-button>
        </section>
      </el-tab-pane>
    </el-tabs>

    <section class="guide-section">
      <div class="section-heading">
        <span>01</span>
        <h2>{{ t('launcherGuide.getReady') }}</h2>
      </div>
      <ol class="steps">
        <li v-for="step in steps" :key="step.title" data-test="launcher-step">
          <div class="step-number">{{ step.number }}</div>
          <div>
            <h3>{{ t(step.title) }}</h3>
            <p>{{ t(step.body) }}</p>
          </div>
        </li>
      </ol>
      <a class="sdk-link" href="https://developer.garmin.com/connect-iq/sdk/" target="_blank" rel="noopener noreferrer">{{ t('launcherGuide.garminSdk') }} ↗</a>
    </section>

    <div class="info-grid">
      <section class="guide-section compact">
        <div class="section-heading">
          <span>02</span>
          <h2>{{ t('launcherGuide.limitationsTitle') }}</h2>
        </div>
        <ul>
          <li>{{ t('launcherGuide.deviceLimit') }}</li>
          <li>{{ t('launcherGuide.simulatorLimit') }}</li>
        </ul>
      </section>
      <section class="guide-section compact">
        <div class="section-heading">
          <span>03</span>
          <h2>{{ t('launcherGuide.troubleshootingTitle') }}</h2>
        </div>
        <ul>
          <li>{{ t('launcherGuide.troubleLauncher') }}</li>
          <li>{{ t('launcherGuide.troubleSdk') }}</li>
          <li>{{ t('launcherGuide.troubleSimulator') }}</li>
        </ul>
      </section>
    </div>

    <footer>
      <router-link to="/designs">
        <el-button>{{ t('launcherGuide.returnStudio') }}</el-button>
      </router-link>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from '@/i18n'
import { detectLauncherPlatform, getLauncherReleases, type LauncherPlatform, type LauncherRelease } from '@/features/connectIqLauncher/config'
import { loadLauncherReleases, type MacLauncherArch } from '@/features/connectIqLauncher/manifest'

const { t } = useI18n()
const platforms: LauncherPlatform[] = ['mac', 'windows']
const releases = ref(getLauncherReleases())
const macReleases = ref<Partial<Record<MacLauncherArch, LauncherRelease>>>({})
const macArchitectures = ref<MacLauncherArch[]>([])
const activeMacArchitecture = ref<MacLauncherArch | null>(null)
const activePlatform = ref<LauncherPlatform>(detectLauncherPlatform(navigator.platform))
const platformLabel = (platform: LauncherPlatform) => t(platform === 'mac' ? 'launcherGuide.platformMac' : 'launcherGuide.platformWindows')
const architectureLabel = (arch: MacLauncherArch) => ({ arm64: 'Apple Silicon (arm64)', x64: 'Intel (x64)', universal: 'Universal' })[arch]
const releaseFor = (platform: LauncherPlatform): LauncherRelease => {
  if (platform !== 'mac' || macArchitectures.value.length <= 1) return releases.value[platform]
  if (!activeMacArchitecture.value) return { ...releases.value.mac, available: false, url: null }
  return macReleases.value[activeMacArchitecture.value] ?? { ...releases.value.mac, available: false, url: null }
}

onMounted(async () => {
  const result = await loadLauncherReleases({ fallback: releases.value })
  releases.value = result.releases
  macReleases.value = result.macReleases
  macArchitectures.value = result.macArchitectures
  activeMacArchitecture.value = result.macArchitectures.length === 1 ? result.macArchitectures[0] : null
})
const steps = [
  { number: '1', title: 'launcherGuide.step1Title', body: 'launcherGuide.step1Body' },
  { number: '2', title: 'launcherGuide.step2Title', body: 'launcherGuide.step2Body' },
  { number: '3', title: 'launcherGuide.step3Title', body: 'launcherGuide.step3Body' },
  { number: '4', title: 'launcherGuide.step4Title', body: 'launcherGuide.step4Body' },
  { number: '5', title: 'launcherGuide.step5Title', body: 'launcherGuide.step5Body' }
]
</script>

<style scoped>
.launcher-guide {
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
  .launcher-guide {
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
