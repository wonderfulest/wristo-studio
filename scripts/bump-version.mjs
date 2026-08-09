import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const releaseTypes = new Set(['major', 'minor', 'patch'])
const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
const current = packageJson.version

if (!SEMVER.test(current)) {
  console.error(`Invalid Studio version: ${String(current)}`)
  process.exit(1)
}

const cliIndex = process.argv.indexOf('--release-type')
let releaseType = cliIndex >= 0 ? process.argv[cliIndex + 1] : undefined

if (!releaseType) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  releaseType = (
    await prompt.question(
      `Current version ${current}. Choose major, minor, patch, or cancel: `,
    )
  ).trim()
  prompt.close()
}

if (!releaseTypes.has(releaseType)) {
  console.error(
    releaseType === 'cancel'
      ? 'Version bump cancelled.'
      : `Invalid release type: ${String(releaseType)}`,
  )
  process.exit(1)
}

const result = spawnSync(
  'npm',
  ['version', releaseType, '--no-git-tag-version', '--ignore-scripts'],
  {
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
  },
)

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

const next = JSON.parse(await readFile('package.json', 'utf8')).version
console.log(
  `Studio version: ${current} -> ${next} (package.json, package-lock.json)`,
)
