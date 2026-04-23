import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseTranscript, estimateTokens, buildBanner, buildFallbackHandoff } from '../../hooks/lib/precompact.mjs';

// ─── parseTranscript ─────────────────────────────────────────────────────────

describe('parseTranscript', () => {
  function writeTmp(lines) {
    const dir = mkdtempSync(join(tmpdir(), 'precompact-test-'));
    const p = join(dir, 'session.jsonl');
    writeFileSync(p, lines.join('\n'), 'utf8');
    return p;
  }

  it('returns empty result for a nonexistent file', () => {
    const result = parseTranscript('/tmp/nonexistent-session-xyz.jsonl');
    assert.equal(result.entries.length, 0);
    assert.equal(result.msgChars, 0);
    assert.equal(result.attachChars, 0);
  });

  it('extracts user message text', () => {
    const path = writeTmp([
      JSON.stringify({
        type: 'user',
        message: { role: 'user', content: [{ type: 'text', text: 'build the precompact feature right now please' }] },
      }),
    ]);
    const { entries, msgChars } = parseTranscript(path);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].role, 'user');
    assert.ok(entries[0].text.includes('build the precompact feature'));
    assert.ok(msgChars > 0);
  });

  it('extracts assistant message text', () => {
    const path = writeTmp([
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'I will implement the PreCompact hook by creating the hook file and adding logic to block compaction via exit code 2.' }],
        },
      }),
    ]);
    const { entries } = parseTranscript(path);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].role, 'assistant');
    assert.ok(entries[0].text.includes('PreCompact'));
  });

  it('strips <system-reminder> injections from user messages', () => {
    const clean = 'run the tests and make sure everything passes correctly';
    const path = writeTmp([
      JSON.stringify({
        type: 'user',
        message: {
          content: `${clean}<system-reminder>Hook context injected here...</system-reminder>`,
        },
      }),
    ]);
    const { entries } = parseTranscript(path);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].text, clean);
  });

  it('strips <ide_opened_file> injections from user messages', () => {
    const clean = 'look at this file and tell me what you think about it';
    const path = writeTmp([
      JSON.stringify({
        type: 'user',
        message: {
          content: `${clean}<ide_opened_file>src/index.js content...</ide_opened_file>`,
        },
      }),
    ]);
    const { entries } = parseTranscript(path);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].text, clean);
  });

  it('skips short user messages (< 30 chars)', () => {
    const path = writeTmp([
      JSON.stringify({
        type: 'user',
        message: { content: 'ok' },
      }),
    ]);
    const { entries } = parseTranscript(path);
    assert.equal(entries.length, 0);
  });

  it('skips short assistant messages (< 100 chars)', () => {
    const path = writeTmp([
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Done.' }] },
      }),
    ]);
    const { entries } = parseTranscript(path);
    assert.equal(entries.length, 0);
  });

  it('counts attachment chars separately', () => {
    const attachment = { type: 'hook_injection', content: 'x'.repeat(500) };
    const path = writeTmp([
      JSON.stringify({ type: 'attachment', attachment }),
    ]);
    const { attachChars, msgChars } = parseTranscript(path);
    assert.ok(attachChars > 0, 'attachChars should be non-zero');
    assert.equal(msgChars, 0, 'msgChars should be zero (no messages)');
  });

  it('handles malformed JSON lines gracefully', () => {
    const path = writeTmp([
      '{not valid json}',
      JSON.stringify({
        type: 'user',
        message: { content: 'valid message that is definitely longer than thirty characters' },
      }),
    ]);
    const { entries } = parseTranscript(path);
    assert.equal(entries.length, 1);
  });

  it('handles empty file gracefully', () => {
    const path = writeTmp(['']);
    const { entries, msgChars, attachChars } = parseTranscript(path);
    assert.equal(entries.length, 0);
    assert.equal(msgChars, 0);
    assert.equal(attachChars, 0);
  });

  it('parses the bundled session fixture without throwing', () => {
    const fixturePath = new URL(
      '../../tests/fixtures/session-precompact.jsonl',
      import.meta.url
    ).pathname;
    const { entries, msgChars } = parseTranscript(fixturePath);
    assert.ok(entries.length >= 2, 'expected at least 2 conversation turns');
    assert.ok(msgChars > 0);
  });
});

// ─── estimateTokens ───────────────────────────────────────────────────────────

describe('estimateTokens', () => {
  it('returns zeros for zero input', () => {
    const result = estimateTokens(0, 0);
    assert.equal(result.approxTokens, 0);
    assert.equal(result.windowTokens, 0);
    assert.equal(result.approxK, 0);
    assert.equal(result.windowK, 0);
  });

  it('divides total chars by 4 to estimate tokens', () => {
    const { approxTokens } = estimateTokens(4000, 0);
    assert.equal(approxTokens, 1000);
  });

  it('infers window as approxTokens / 0.8 (PreCompact fires at 80%)', () => {
    const { approxTokens, windowTokens } = estimateTokens(80000, 0);
    assert.equal(approxTokens, 20000);
    assert.equal(windowTokens, 25000);
  });

  it('expresses results in rounded thousands', () => {
    const { approxK, windowK } = estimateTokens(560000, 0);
    assert.equal(approxK, 140); // 560000 / 4 = 140000 → 140k
    assert.equal(windowK, 175); // 140000 / 0.8 = 175000 → 175k
  });

  it('combines msgChars and attachChars before estimating', () => {
    const { approxTokens } = estimateTokens(2000, 2000);
    assert.equal(approxTokens, 1000); // (2000+2000)/4
  });
});

// ─── buildBanner ──────────────────────────────────────────────────────────────

describe('buildBanner', () => {
  it('contains the heavy rule lines', () => {
    const banner = buildBanner(142, 178);
    assert.ok(banner.includes('═'.repeat(20)), 'should contain heavy horizontal rule');
  });

  it('includes the token counts when provided', () => {
    const banner = buildBanner(142, 178);
    assert.ok(banner.includes('~142k'), 'should show approxK');
    assert.ok(banner.includes('~178k'), 'should show windowK');
    assert.ok(banner.includes('~80%'), 'should show percentage');
  });

  it('falls back to generic wording when approxK is 0', () => {
    const banner = buildBanner(0, 0);
    assert.ok(banner.includes('~80%'), 'should still show ~80%');
    assert.ok(!banner.includes('~0k'), 'should not show ~0k/~0k');
  });

  it('mentions /handoff command', () => {
    const banner = buildBanner(100, 125);
    assert.ok(banner.includes('/handoff'));
  });

  it('mentions the auto subcommand in the CTA', () => {
    const banner = buildBanner(100, 125);
    assert.ok(banner.includes('/handoff auto'));
  });

  it('mentions on and off subcommands', () => {
    const banner = buildBanner(100, 125);
    assert.ok(banner.includes('/handoff on'));
    assert.ok(banner.includes('/handoff off'));
  });

  it('contains degradation warning text', () => {
    const banner = buildBanner(100, 125);
    assert.ok(banner.toLowerCase().includes('inference'));
  });

  it('returns a non-empty string', () => {
    const banner = buildBanner(100, 125);
    assert.ok(typeof banner === 'string' && banner.length > 100);
  });
});

// ─── buildFallbackHandoff ─────────────────────────────────────────────────────

describe('buildFallbackHandoff', () => {
  it('returns a string starting with the handoff header', () => {
    const result = buildFallbackHandoff([]);
    assert.ok(result.startsWith('Session handoff'));
  });

  it('returns a non-empty string even when bd and git are unavailable', () => {
    // Relies on the internal try/catch — if commands fail, output is still non-empty.
    const result = buildFallbackHandoff([]);
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  it('includes a Conversation section when entries are provided', () => {
    const entries = [
      { role: 'user', text: 'implement the feature' },
      { role: 'assistant', text: 'I will implement it now' },
    ];
    const result = buildFallbackHandoff(entries);
    assert.ok(result.includes('## Conversation'));
  });

  it('formats user entries as **User**: ...', () => {
    const entries = [{ role: 'user', text: 'build the thing' }];
    const result = buildFallbackHandoff(entries);
    assert.ok(result.includes('**User**: build the thing'));
  });

  it('formats assistant entries as **Claude**: ...', () => {
    const entries = [{ role: 'assistant', text: 'building it now' }];
    const result = buildFallbackHandoff(entries);
    assert.ok(result.includes('**Claude**: building it now'));
  });

  it('omits the Conversation section when entries array is empty', () => {
    const result = buildFallbackHandoff([]);
    assert.ok(!result.includes('## Conversation'));
  });
});
