import assert from 'node:assert/strict'
import { copyFile, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const sourceScript = new URL('../scripts/bump-version.mjs', import.meta.url)

async function fixture(version = '1.2.3') {
  const root = await mkdtemp(path.join(tmpdir(), 'wristo-version-'))
  await copyFile(sourceScript, path.join(root, 'bump-version.mjs'))
  const pkg = { name: 'fixture', private: true, version }
  const lock = {
    name: 'fixture',
    version,
    lockfileVersion: 3,
    requires: true,
    packages: { '': pkg },
  }
  await writeFile(path.join(root, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)
  await writeFile(path.join(root, 'package-lock.json'), `${JSON.stringify(lock, null, 2)}\n`)
  return root
}

function run(root, type) {
  return spawnSync(process.execPath, ['bump-version.mjs', '--release-type', type], {
    cwd: root,
    encoding: 'utf8',
  })
}

for (const [type, expected] of [
  ['patch', '1.2.4'],
  ['minor', '1.3.0'],
  ['major', '2.0.0'],
]) {
  test(`bumps ${type} and synchronizes both package files`, async () => {
    const root = await fixture()
    const result = run(root, type)
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, new RegExp(`1\\.2\\.3 -> ${expected.replaceAll('.', '\\.')} `))
    assert.equal(JSON.parse(await readFile(path.join(root, 'package.json'))).version, expected)
    assert.equal(JSON.parse(await readFile(path.join(root, 'package-lock.json'))).version, expected)
  })
}

test('rejects an invalid current version without changing files', async () => {
  const root = await fixture('v1.2.3')
  const before = await readFile(path.join(root, 'package.json'), 'utf8')
  const result = run(root, 'patch')
  assert.notEqual(result.status, 0)
  assert.equal(await readFile(path.join(root, 'package.json'), 'utf8'), before)
})

test('rejects cancellation without changing files', async () => {
  const root = await fixture()
  const before = await readFile(path.join(root, 'package.json'), 'utf8')
  const result = run(root, 'cancel')
  assert.notEqual(result.status, 0)
  assert.equal(await readFile(path.join(root, 'package.json'), 'utf8'), before)
})
