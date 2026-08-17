/**
 * Integration tests: precompact-handoff.mjs as a subprocess.
 *
 * Tests the hook's behavior in all three modes:
 *   - disabled (no env var) → exits 0, banner injected
 *   - ANTI_COMPACT_ENABLE_HANDOFF_ONLY=1 → exits 0, handoff output (fallback path, no real claude -p call)
 *   - ANTI_COMPACT=1             → exits 2, blocks compaction
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { run } from '../helpers/subprocess.mjs';
import { fixturePath } from '../helpers/fixtures.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = join(__dirname, '..', '..', 'hooks', 'precompact-handoff.mjs');
const TRANSCRIPT = fixturePath('session-precompact.jsonl');
const FAKE_CLAUDE = join(__dirname, '..', 'helpers', 'fake-claude.mjs');
const CAPTURE_PATH = join(tmpdir(), 'anti-compact-fake-claude-capture.json');

function readCapture() {
  const capture = JSON.parse(readFileSync(CAPTURE_PATH, 'utf8'));
  rmSync(CAPTURE_PATH, { force: true });
  return capture;
}

function payload(overrides = {}) {
  return JSON.stringify({
    hook_event_name: 'PreCompact',
    session_id: 'test-precompact-001',
    transcript_path: TRANSCRIPT,
    ...overrides,
  });
}

// ─── Disabled path (no env var) ───────────────────────────────────────────────

describe('precompact hook: disabled path', () => {
  it('exits 0 when ANTI_COMPACT is not set', async () => {
    const { exitCode } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_ENABLE: '', CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '' },
    });
    assert.equal(exitCode, 0);
  });

  it('writes the context-capacity banner to stdout', async () => {
    const { stdout, exitCode } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_ENABLE: '', CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '' },
    });
    assert.equal(exitCode, 0);
    assert.ok(stdout.length > 0, 'expected non-empty stdout');
    assert.ok(stdout.includes('CONTEXT AT CAPACITY'), 'expected capacity heading');
  });

  it('banner mentions /handoff', async () => {
    const { stdout } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_ENABLE: '', CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '' },
    });
    assert.ok(stdout.includes('/handoff'));
  });

  it('banner includes the default ~83.5% token threshold', async () => {
    const { stdout } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_ENABLE: '', CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '' },
    });
    assert.ok(stdout.includes('~83.5%'), 'expected ~83.5% in banner');
  });

  it('banner reflects CLAUDE_AUTOCOMPACT_PCT_OVERRIDE when set', async () => {
    const { stdout } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_ENABLE: '', CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '70' },
    });
    assert.ok(stdout.includes('~70%'), 'expected the overridden threshold in banner');
  });

  it('banner includes estimated token counts from transcript', async () => {
    const { stdout } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_ENABLE: '', CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '' },
    });
    assert.ok(stdout.includes('~') && stdout.includes('k'), 'expected token count in banner');
  });

  it('exits 0 with empty stdin (no transcript path)', async () => {
    const { exitCode, stdout } = await run(HOOK, {
      stdin: '',
      env: { ANTI_COMPACT_ENABLE: '', CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '' },
    });
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes('CONTEXT AT CAPACITY'));
  });

  it('exits 0 with malformed stdin JSON', async () => {
    const { exitCode } = await run(HOOK, {
      stdin: '{not valid}',
      env: { ANTI_COMPACT_ENABLE: '', CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '' },
    });
    assert.equal(exitCode, 0);
  });

  it('exits 0 with missing transcript file', async () => {
    const { exitCode } = await run(HOOK, {
      stdin: payload({ transcript_path: '/tmp/no-such-session-xyz.jsonl' }),
      env: { ANTI_COMPACT_ENABLE: '', CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '' },
    });
    assert.equal(exitCode, 0);
  });

  it('banner shows the AUTOMATE THIS CTA', async () => {
    const { stdout } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_ENABLE: '', CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '' },
    });
    assert.ok(stdout.includes('AUTOMATE THIS'));
    assert.ok(stdout.includes('/handoff auto'));
  });
});

// ─── Enabled path ─────────────────────────────────────────────────────────────

describe('precompact hook: enabled path', () => {
  it('exits 2 to block compaction when ANTI_COMPACT=1', { timeout: 15000 }, async () => {
    const { exitCode } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_ENABLE: '1', ANTI_COMPACT_CLAUDE_BIN: FAKE_CLAUDE },
    });
    assert.equal(exitCode, 2, 'expected exit 2 to block compaction');
  });

  it('stdout contains the handoff heading', { timeout: 15000 }, async () => {
    const { stdout } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_ENABLE: '1', ANTI_COMPACT_CLAUDE_BIN: FAKE_CLAUDE },
    });
    assert.ok(
      stdout.includes('Pre-Compact Handoff') || stdout.includes('handoff'),
      'expected handoff content in stdout'
    );
  });

  it('spawns claude -p with isolation flags', { timeout: 15000 }, async () => {
    await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_ENABLE: '1', ANTI_COMPACT_CLAUDE_BIN: FAKE_CLAUDE },
    });
    const { argv } = readCapture();
    assert.ok(argv.includes('--setting-sources'), 'expected --setting-sources flag');
    assert.equal(argv[argv.indexOf('--setting-sources') + 1], '', 'expected empty setting-sources value');
    assert.ok(argv.includes('--system-prompt'), 'expected --system-prompt flag');
    assert.ok(argv.includes('--model'), 'expected --model flag');
    assert.equal(argv[argv.indexOf('--model') + 1], 'sonnet', 'expected --model sonnet');
    assert.ok(argv.includes('--no-session-persistence'), 'expected --no-session-persistence flag');
  });

  it('does not leak ANTHROPIC_API_KEY/ANTHROPIC_BASE_URL or arbitrary vars to the subprocess', { timeout: 15000 }, async () => {
    await run(HOOK, {
      stdin: payload(),
      env: {
        ANTI_COMPACT_ENABLE: '1',
        ANTI_COMPACT_CLAUDE_BIN: FAKE_CLAUDE,
        ANTHROPIC_API_KEY: 'sk-should-not-leak',
        ANTHROPIC_BASE_URL: 'https://evil.example.com',
        SOME_RANDOM_TEST_VAR: 'should-not-leak',
      },
    });
    const { env: capturedEnv } = readCapture();
    assert.ok(!('ANTHROPIC_API_KEY' in capturedEnv), 'ANTHROPIC_API_KEY must not reach the subprocess');
    assert.ok(!('ANTHROPIC_BASE_URL' in capturedEnv), 'ANTHROPIC_BASE_URL must not reach the subprocess');
    assert.ok(!('SOME_RANDOM_TEST_VAR' in capturedEnv), 'arbitrary vars must not reach the subprocess');
    assert.ok(!('ANTI_COMPACT_CLAUDE_BIN' in capturedEnv), 'test seam var must not reach the subprocess');
    const allowlist = ['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'TMPDIR'];
    // macOS's CoreFoundation runtime injects this into every child process regardless of what
    // env is passed to spawn() — confirmed via `spawn(node, {env: {}})` — not a leak from our code.
    const osInjected = ['__CF_USER_TEXT_ENCODING'];
    for (const key of Object.keys(capturedEnv)) {
      assert.ok(
        allowlist.includes(key) || osInjected.includes(key),
        `unexpected env var reached the subprocess: ${key}`
      );
    }
  });

  it('sends only the conversation text on stdin, not the system instructions', { timeout: 15000 }, async () => {
    await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_ENABLE: '1', ANTI_COMPACT_CLAUDE_BIN: FAKE_CLAUDE },
    });
    const { stdin: capturedStdin } = readCapture();
    assert.ok(!capturedStdin.includes('Produce a structured handoff'), 'system instructions must not be on stdin');
  });
});

// ─── HANDOFF_ONLY path ────────────────────────────────────────────────────────

describe('precompact hook: HANDOFF_ONLY path', () => {
  it('exits 0 (no block) when ANTI_COMPACT_HANDOFF_ONLY=1', { timeout: 15000 }, async () => {
    const { exitCode } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_ENABLE_HANDOFF_ONLY: '1', ANTI_COMPACT_CLAUDE_BIN: FAKE_CLAUDE },
    });
    assert.equal(exitCode, 0, 'HANDOFF_ONLY must not block compaction');
  });

  it('stdout contains handoff content', { timeout: 15000 }, async () => {
    const { stdout } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_ENABLE_HANDOFF_ONLY: '1', ANTI_COMPACT_CLAUDE_BIN: FAKE_CLAUDE },
    });
    assert.ok(stdout.length > 0, 'expected handoff output');
  });
});
