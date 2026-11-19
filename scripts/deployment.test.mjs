import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

// Execute the real rollout script with a deterministic Docker/HTTP boundary.
// These verify transaction recovery; the GitHub container job verifies real Docker.
const project = resolve(import.meta.dirname, '..')
const revision = 'a'.repeat(40)
const release = (number) => `${revision}-${number}-1`
const mock = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const root = process.env.MOCK_ROOT;
const command = path.basename(process.argv[1]);
fs.appendFileSync(path.join(root, 'calls'), JSON.stringify([command, ...args]) + '\\n');
const active = path.join(root, 'active');
if (command === 'gh') {
  if (args.includes('status')) process.exit(0);
  if (args.includes('.permissions.admin')) process.stdout.write('true');
  else if (args.includes('.deployment_branch_policy.custom_branch_policies')) {
    if (process.env.MOCK_ENV_FAILURE === '1') {
      process.stderr.write('gh: Forbidden (HTTP 403)'); process.exit(1);
    }
    process.stdout.write('true');
  } else if (args.some(arg => arg.endsWith('/deployment-branch-policies'))) {
    if (!args.at(-1).includes('.name !=')) process.stdout.write('main');
  }
} else if (command === 'ssh') {
  const remoteCommand = args.at(-1);
  if (remoteCommand.includes('mktemp -d')) process.stdout.write(process.env.MOCK_BAD_UPLOAD || '/opt/diyatmoko-portfolio/incoming/run-MOCK1234');
  else if (remoteCommand.includes('cat /opt/diyatmoko-portfolio/config')) process.stdout.write('PORTFOLIO_BIND_PORT=18080\\nPORTFOLIO_PROXY_NETWORK=edge\\n');
} else if (command === 'scp') {
  // Upload boundary only; no real host is contacted.
} else if (command === 'curl') {
  const current = fs.existsSync(active) ? fs.readFileSync(active, 'utf8') : '';
  if (!current || current === process.env.MOCK_HTTP_FAIL) process.exit(22);
  if (args.at(-1).endsWith('/release.json')) {
    process.stdout.write(JSON.stringify({sha: current.slice(0, 40), release_id: current === process.env.MOCK_RELEASE_MISMATCH ? 'unexpected-release' : current}));
  } else process.stdout.write(args.at(-1).endsWith('/health.txt') ? 'ok' : '<html>Yanuar Diyatmoko</html>');
} else if (args[0] === 'image' && args[1] === 'inspect') {
  process.stdout.write(args.at(-1).includes('Architecture') ? 'amd64' : (process.env.MOCK_REVISION || '${revision}'));
} else if (args[0] === 'network' && process.env.MOCK_NETWORK_FAIL === '1') {
  process.exit(1);
} else if (args[0] === 'compose') {
  const folder = args[args.indexOf('--project-directory') + 1];
  const id = path.basename(folder);
  if (args.includes('up')) {
    fs.writeFileSync(active, id);
    if (id === process.env.MOCK_UP_FAIL) process.exit(1);
  } else if (args.includes('down')) {
    fs.rmSync(active, { force: true });
  }
}
`

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'portfolio-deploy-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const directory of ['incoming', 'releases', 'bin', 'mock-bin'])
    await mkdir(join(root, directory))
  for (const command of ['docker', 'curl', 'gh', 'ssh', 'scp']) {
    await writeFile(join(root, 'mock-bin', command), mock)
    await chmod(join(root, 'mock-bin', command), 0o700)
  }
  await writeFile(join(root, 'config'), 'PORTFOLIO_BIND_PORT=18080\nPORTFOLIO_PROXY_NETWORK=\n')
  const env = {
    ...process.env,
    PATH: `${join(root, 'mock-bin')}:${process.env.PATH}`,
    PORTFOLIO_ROOT: root,
    MOCK_ROOT: root,
  }
  return {
    root,
    env,
    async payload(number) {
      const folder = join(root, 'incoming', `run-${number}`)
      await mkdir(folder)
      const image = Buffer.from(`fixture-image-${number}`)
      await writeFile(join(folder, 'image.tar.gz'), image)
      await writeFile(
        join(folder, 'image.tar.gz.sha256'),
        `${createHash('sha256').update(image).digest('hex')}  image.tar.gz\n`,
      )
      await copyFile(join(project, 'deploy/compose.vps.yaml'), join(folder, 'compose.yaml'))
      await copyFile(join(project, 'deploy/compose.proxy.yaml'), join(folder, 'compose.proxy.yaml'))
      return folder
    },
    run(args, overrides = {}) {
      const result = spawnSync('bash', [join(project, 'deploy/vps-rollout.sh'), ...args], {
        env: { ...env, ...overrides },
        encoding: 'utf8',
        timeout: 15_000,
      })
      assert.ifError(result.error)
      return result
    },
    async deploy(number, overrides = {}) {
      const folder = await this.payload(number)
      return this.run(['deploy', folder, release(number)], overrides)
    },
    async state() {
      return (await readFile(join(root, 'state'), 'utf8')).trimEnd().split('\n')
    },
    async active() {
      return readFile(join(root, 'active'), 'utf8')
    },
    async calls() {
      return (await readFile(join(root, 'calls'), 'utf8')).trim().split('\n').map(JSON.parse)
    },
  }
}

function passed(result) {
  assert.equal(result.status, 0, result.stderr + result.stdout)
}

test('first deployment and subsequent releases retain exactly one predecessor', async (t) => {
  const f = await fixture(t)
  passed(await f.deploy(1))
  assert.deepEqual(await f.state(), [release(1)])
  passed(await f.deploy(2))
  assert.deepEqual(await f.state(), [release(2), release(1)])
  passed(await f.deploy(3))
  assert.deepEqual(await f.state(), [release(3), release(2)])
  assert.equal(await f.active(), release(3))
  const removals = (await f.calls()).filter((call) => call[1] === 'image' && call[2] === 'rm')
  assert.deepEqual(removals, [['docker', 'image', 'rm', `diyatmoko-portfolio:${release(1)}`]])
  assert.equal(
    (await f.calls()).some((call) => call.includes('build') || call.includes('prune')),
    false,
  )
})

for (const boundary of ['MOCK_UP_FAIL', 'MOCK_HTTP_FAIL']) {
  test(`${boundary}: unsuccessful update restores the running image and preserves state`, async (t) => {
    const f = await fixture(t)
    passed(await f.deploy(1))
    const result = await f.deploy(2, { [boundary]: release(2) })
    assert.notEqual(result.status, 0)
    assert.deepEqual(await f.state(), [release(1)])
    assert.equal(await f.active(), release(1))
    await assert.rejects(readFile(join(f.root, 'pending')), { code: 'ENOENT' })
  })
}

test('failed first deployment removes only its dedicated Compose service', async (t) => {
  const f = await fixture(t)
  assert.notEqual((await f.deploy(1, { MOCK_UP_FAIL: release(1) })).status, 0)
  await assert.rejects(f.state(), { code: 'ENOENT' })
  await assert.rejects(f.active(), { code: 'ENOENT' })
  const downs = (await f.calls()).filter((call) => call.includes('down'))
  assert.equal(downs.length, 1)
  assert.equal(downs[0][downs[0].indexOf('--project-name') + 1], 'diyatmoko-portfolio-vps')
})

test('manual rollback restores the previous complete release and can be reversed', async (t) => {
  const f = await fixture(t)
  passed(await f.deploy(1))
  passed(await f.deploy(2))
  passed(f.run(['rollback']))
  assert.deepEqual(await f.state(), [release(1), release(2)])
  assert.equal(await f.active(), release(1))
  passed(f.run(['rollback']))
  assert.deepEqual(await f.state(), [release(2), release(1)])
})

test('failed manual rollback recovers the current working release', async (t) => {
  const f = await fixture(t)
  passed(await f.deploy(1))
  passed(await f.deploy(2))
  assert.notEqual(f.run(['rollback'], { MOCK_HTTP_FAIL: release(1) }).status, 0)
  assert.deepEqual(await f.state(), [release(2), release(1)])
  assert.equal(await f.active(), release(2))
})

test('checksum corruption is rejected before any Docker call', async (t) => {
  const f = await fixture(t)
  const folder = await f.payload(1)
  await writeFile(join(folder, 'image.tar.gz'), 'corrupted transfer')
  assert.notEqual(f.run(['deploy', folder, release(1)]).status, 0)
  await assert.rejects(readFile(join(f.root, 'calls')), { code: 'ENOENT' })
})

test('an image from a different commit never replaces the current service', async (t) => {
  const f = await fixture(t)
  passed(await f.deploy(1))
  assert.notEqual((await f.deploy(2, { MOCK_REVISION: 'b'.repeat(40) })).status, 0)
  assert.equal(await f.active(), release(1))
  assert.deepEqual(await f.state(), [release(1)])
})

test('a missing shared proxy network preserves the existing deployment', async (t) => {
  const f = await fixture(t)
  passed(await f.deploy(1))
  await writeFile(
    join(f.root, 'config'),
    'PORTFOLIO_BIND_PORT=18080\nPORTFOLIO_PROXY_NETWORK=edge\n',
  )
  assert.notEqual((await f.deploy(2, { MOCK_NETWORK_FAIL: '1' })).status, 0)
  assert.equal(await f.active(), release(1))
})

test('an interrupted rollout is recovered before a subsequent operation', async (t) => {
  const f = await fixture(t)
  passed(await f.deploy(1))
  passed(await f.deploy(2))
  // Simulate a crash before state commit: Docker has switched but the journal remains.
  await writeFile(join(f.root, 'state'), `${release(1)}\n\n`)
  await writeFile(join(f.root, 'pending'), `${release(2)}\n`)
  assert.notEqual(f.run(['rollback']).status, 0) // Recovery succeeds, but no predecessor exists.
  assert.equal(await f.active(), release(1))
  await assert.rejects(readFile(join(f.root, 'pending')), { code: 'ENOENT' })
})

test('invalid incoming paths cannot remove files outside the upload directory', async (t) => {
  const f = await fixture(t)
  const protectedFile = join(f.root, 'config')
  assert.notEqual(f.run(['deploy', f.root, release(1)]).status, 0)
  assert.ok(await readFile(protectedFile, 'utf8'))
})

test('rollback before any successful predecessor makes no Docker changes', async (t) => {
  const f = await fixture(t)
  assert.notEqual(f.run(['rollback']).status, 0)
  await assert.rejects(readFile(join(f.root, 'calls')), { code: 'ENOENT' })
})

test('rollback uses the original port and proxy network configuration', async (t) => {
  const f = await fixture(t)
  passed(await f.deploy(1))
  await writeFile(
    join(f.root, 'config'),
    'PORTFOLIO_BIND_PORT=18081\nPORTFOLIO_PROXY_NETWORK=edge\n',
  )
  passed(await f.deploy(2))
  assert.ok(await readFile(join(f.root, 'releases', release(2), 'proxy.yaml'), 'utf8'))
  passed(f.run(['rollback']))
  assert.equal(await f.active(), release(1))
  assert.match(
    await readFile(join(f.root, 'releases', release(1), '.env'), 'utf8'),
    /PORTFOLIO_BIND_PORT=18080\nPORTFOLIO_PROXY_NETWORK=\n/,
  )
  await assert.rejects(readFile(join(f.root, 'releases', release(1), 'proxy.yaml')), {
    code: 'ENOENT',
  })
})

test('interactive setup configures secrets from files without including a private key in CLI arguments', async (t) => {
  const f = await fixture(t)
  const result = spawnSync('bash', [join(project, 'scripts/setup-vps.sh')], {
    env: {
      ...f.env,
      XDG_CONFIG_HOME: join(f.root, 'local-config'),
      GITHUB_REPOSITORY: 'diyatmoko/diyatmoko.my.id',
    },
    input: 'vps.example.com\nubuntu\n22\nhttps://diyatmoko.my.id\n18080\nedge\n',
    encoding: 'utf8',
    timeout: 15_000,
  })
  passed(result)
  const secrets = (await f.calls()).filter((call) => call[0] === 'gh' && call[1] === 'secret')
  assert.deepEqual(
    secrets.map((call) => call[3]),
    ['VPS_HOST', 'VPS_USER', 'VPS_SSH_KEY', 'VPS_KNOWN_HOSTS'],
  )
  for (const call of secrets) {
    assert.ok(call.includes('production'))
    assert.equal(call.includes('--body'), false)
  }
  const key = join(
    f.root,
    'local-config',
    'diyatmoko-portfolio',
    'vps.example.com-22',
    'id_ed25519',
  )
  assert.match(await readFile(key, 'utf8'), /BEGIN OPENSSH PRIVATE KEY/)
  assert.equal(result.stdout.includes('PRIVATE KEY'), false)
})

test('setup does not replace an existing environment when GitHub returns a permission error', async (t) => {
  const f = await fixture(t)
  const result = spawnSync('bash', [join(project, 'scripts/setup-vps.sh')], {
    env: { ...f.env, XDG_CONFIG_HOME: join(f.root, 'local-config'), MOCK_ENV_FAILURE: '1' },
    input: 'vps.example.com\nubuntu\n22\nhttps://diyatmoko.my.id\n18080\nedge\n',
    encoding: 'utf8',
    timeout: 15_000,
  })
  assert.notEqual(result.status, 0)
  const calls = await f.calls()
  assert.equal(
    calls.some((call) => call.includes('PUT') || call.includes('secret')),
    false,
  )
  assert.equal(
    calls.some((call) => call.some((arg) => arg.includes('bash -s'))),
    false,
  )
})

test('SSH client pins the host key and removes temporary credentials after rollback', async (t) => {
  const f = await fixture(t)
  const result = spawnSync('bash', [join(project, 'scripts/github-vps.sh'), 'rollback'], {
    cwd: project,
    env: {
      ...f.env,
      RUNNER_TEMP: f.root,
      VPS_HOST: 'vps.example.com',
      VPS_USER: 'portfolio-deploy',
      VPS_SSH_KEY: 'test-key-boundary',
      VPS_KNOWN_HOSTS: 'test-host-key-boundary',
    },
    encoding: 'utf8',
    timeout: 15_000,
  })
  passed(result)
  const calls = (await f.calls()).filter((call) => call[0] === 'ssh' || call[0] === 'scp')
  for (const call of calls) {
    assert.ok(call.includes('StrictHostKeyChecking=yes'))
    assert.ok(call.includes('BatchMode=yes'))
    const key = call[call.indexOf('-i') + 1]
    await assert.rejects(readFile(key), { code: 'ENOENT' })
  }
  assert.ok(
    calls.some((call) => call.at(-1).includes('rollout.sh') && call.at(-1).endsWith('rollback')),
  )
})

test('SSH client rejects an unexpected upload path without issuing a destructive cleanup', async (t) => {
  const f = await fixture(t)
  const result = spawnSync('bash', [join(project, 'scripts/github-vps.sh'), 'rollback'], {
    cwd: project,
    env: {
      ...f.env,
      RUNNER_TEMP: f.root,
      VPS_HOST: 'vps.example.com',
      VPS_USER: 'portfolio-deploy',
      VPS_SSH_KEY: 'test-key-boundary',
      VPS_KNOWN_HOSTS: 'test-host-key-boundary',
      MOCK_BAD_UPLOAD: '/opt/unrelated-application',
    },
    encoding: 'utf8',
    timeout: 15_000,
  })
  assert.notEqual(result.status, 0)
  assert.equal(
    (await f.calls()).some((call) => call.some((arg) => arg.startsWith('rm -rf'))),
    false,
  )
})

test('SSH deployment accepts the production secret names used by ai.mesthi.com', async (t) => {
  const f = await fixture(t)
  const result = spawnSync('bash', [join(project, 'scripts/github-vps.sh'), 'rollback'], {
    cwd: project,
    env: {
      ...f.env,
      RUNNER_TEMP: f.root,
      VPS_HOST: 'vps.example.com',
      VPS_USER: 'ubuntu',
      VPS_SSH_KEY: '',
      VPS_KNOWN_HOSTS: '',
      VPS_SSH_KEY_B64: Buffer.from('test-private-key-boundary').toString('base64'),
      VPS_HOST_KEY: 'test-trusted-host-boundary',
    },
    encoding: 'utf8',
    timeout: 15_000,
  })
  passed(result)
  assert.ok((await f.calls()).some((call) => call.includes('ubuntu@vps.example.com')))
  assert.equal(result.stdout.includes('test-private-key-boundary'), false)
  assert.equal(result.stderr.includes('test-private-key-boundary'), false)
})

test('invalid base64 SSH credentials fail before contacting the VPS', async (t) => {
  const f = await fixture(t)
  const result = spawnSync('bash', [join(project, 'scripts/github-vps.sh'), 'rollback'], {
    env: {
      ...f.env,
      VPS_SSH_KEY: '',
      VPS_SSH_KEY_B64: 'invalid@base64!',
      VPS_HOST_KEY: 'test-trusted-host-boundary',
    },
    encoding: 'utf8',
    timeout: 15_000,
  })
  assert.notEqual(result.status, 0)
  await assert.rejects(readFile(join(f.root, 'calls')), { code: 'ENOENT' })
})

test('a reachable server reporting the wrong release identity triggers recovery', async (t) => {
  const f = await fixture(t)
  passed(await f.deploy(1))
  assert.notEqual((await f.deploy(2, { MOCK_RELEASE_MISMATCH: release(2) })).status, 0)
  assert.deepEqual(await f.state(), [release(1)])
  assert.equal(await f.active(), release(1))
})
