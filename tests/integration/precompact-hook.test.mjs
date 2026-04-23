/**
 * Integration tests: precompact-handoff.mjs as a subprocess.
 *
 * Tests the hook's behavior in all three modes:
 *   - disabled (no env var) → exits 0, banner injected
 *   - ANTI_COMPACT_HANDOFF_ONLY=1 → exits 0, handoff output (fallback path, no real claude -p call)
 *   - ANTI_COMPACT=1             → exits 2, blocks compaction
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../helpers/subprocess.mjs';
import { fixturePath } from '../helpers/fixtures.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = join(__dirname, '..', '..', 'hooks', 'precompact-handoff.mjs');
const TRANSCRIPT = fixturePath('session-precompact.jsonl');
const FAKE_CLAUDE = join(__dirname, '..', 'helpers', 'fake-claude.mjs');

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
      env: { ANTI_COMPACT: '' },
    });
    assert.equal(exitCode, 0);
  });

  it('writes the context-capacity banner to stdout', async () => {
    const { stdout, exitCode } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT: '' },
    });
    assert.equal(exitCode, 0);
    assert.ok(stdout.length > 0, 'expected non-empty stdout');
    assert.ok(stdout.includes('CONTEXT AT CAPACITY'), 'expected capacity heading');
  });

  it('banner mentions /handoff', async () => {
    const { stdout } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT: '' },
    });
    assert.ok(stdout.includes('/handoff'));
  });

  it('banner includes ~80% token threshold', async () => {
    const { stdout } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT: '' },
    });
    assert.ok(stdout.includes('~80%'), 'expected ~80% in banner');
  });

  it('banner includes estimated token counts from transcript', async () => {
    const { stdout } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT: '' },
    });
    assert.ok(stdout.includes('~') && stdout.includes('k'), 'expected token count in banner');
  });

  it('exits 0 with empty stdin (no transcript path)', async () => {
    const { exitCode, stdout } = await run(HOOK, {
      stdin: '',
      env: { ANTI_COMPACT: '' },
    });
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes('CONTEXT AT CAPACITY'));
  });

  it('exits 0 with malformed stdin JSON', async () => {
    const { exitCode } = await run(HOOK, {
      stdin: '{not valid}',
      env: { ANTI_COMPACT: '' },
    });
    assert.equal(exitCode, 0);
  });

  it('exits 0 with missing transcript file', async () => {
    const { exitCode } = await run(HOOK, {
      stdin: payload({ transcript_path: '/tmp/no-such-session-xyz.jsonl' }),
      env: { ANTI_COMPACT: '' },
    });
    assert.equal(exitCode, 0);
  });

  it('banner shows the AUTOMATE THIS CTA', async () => {
    const { stdout } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT: '' },
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
      env: { ANTI_COMPACT: '1', ANTI_COMPACT_CLAUDE_BIN: FAKE_CLAUDE },
    });
    assert.equal(exitCode, 2, 'expected exit 2 to block compaction');
  });

  it('stdout contains the handoff heading', { timeout: 15000 }, async () => {
    const { stdout } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT: '1', ANTI_COMPACT_CLAUDE_BIN: FAKE_CLAUDE },
    });
    assert.ok(
      stdout.includes('Pre-Compact Handoff') || stdout.includes('handoff'),
      'expected handoff content in stdout'
    );
  });
});

// ─── HANDOFF_ONLY path ────────────────────────────────────────────────────────

describe('precompact hook: HANDOFF_ONLY path', () => {
  it('exits 0 (no block) when ANTI_COMPACT_HANDOFF_ONLY=1', { timeout: 15000 }, async () => {
    const { exitCode } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_HANDOFF_ONLY: '1', ANTI_COMPACT_CLAUDE_BIN: FAKE_CLAUDE },
    });
    assert.equal(exitCode, 0, 'HANDOFF_ONLY must not block compaction');
  });

  it('stdout contains handoff content', { timeout: 15000 }, async () => {
    const { stdout } = await run(HOOK, {
      stdin: payload(),
      env: { ANTI_COMPACT_HANDOFF_ONLY: '1', ANTI_COMPACT_CLAUDE_BIN: FAKE_CLAUDE },
    });
    assert.ok(stdout.length > 0, 'expected handoff output');
  });
});
