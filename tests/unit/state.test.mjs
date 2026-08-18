import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readState, writeState } from '../../hooks/lib/state.mjs';

function freshDir() {
  return mkdtempSync(join(tmpdir(), 'state-test-'));
}

describe('readState', () => {
  it('returns defaults when the state file is missing', () => {
    const dir = freshDir();
    const state = readState('missing-session', dir);
    assert.deepEqual(state, { consecutiveBlocks: 0, lastMsgChars: 0, lastSeenAt: 0 });
  });

  it('returns defaults when the state file contains corrupt JSON', () => {
    const dir = freshDir();
    writeFileSync(join(dir, 'corrupt-session.json'), '{not valid json', 'utf8');
    const state = readState('corrupt-session', dir);
    assert.deepEqual(state, { consecutiveBlocks: 0, lastMsgChars: 0, lastSeenAt: 0 });
  });

  it('never throws on a missing directory', () => {
    const dir = join(tmpdir(), 'state-test-does-not-exist-xyz');
    assert.doesNotThrow(() => readState('some-session', dir));
  });
});

describe('readState/writeState round-trip', () => {
  it('reads back exactly what was written', () => {
    const dir = freshDir();
    const written = { consecutiveBlocks: 2, lastMsgChars: 4321, lastSeenAt: Date.now() };
    writeState('round-trip-session', written, dir);
    const read = readState('round-trip-session', dir);
    assert.deepEqual(read, written);
  });

  it('keeps separate sessions in separate files', () => {
    const dir = freshDir();
    writeState('session-a', { consecutiveBlocks: 1, lastMsgChars: 100, lastSeenAt: Date.now() }, dir);
    writeState('session-b', { consecutiveBlocks: 9, lastMsgChars: 900, lastSeenAt: Date.now() }, dir);
    assert.equal(readState('session-a', dir).consecutiveBlocks, 1);
    assert.equal(readState('session-b', dir).consecutiveBlocks, 9);
  });
});

describe('writeState pruning', () => {
  it('deletes other session files older than 48 hours and keeps fresh ones', () => {
    const dir = freshDir();
    const now = Date.now();
    const staleAge = 49 * 60 * 60 * 1000;

    // Hand-write a stale file for a different session.
    const stalePath = join(dir, 'stale-session.json');
    writeFileSync(
      stalePath,
      JSON.stringify({ consecutiveBlocks: 1, lastMsgChars: 10, lastSeenAt: now - staleAge }),
      'utf8'
    );

    // Writing state for the current session should prune the stale file.
    writeState('current-session', { consecutiveBlocks: 1, lastMsgChars: 10, lastSeenAt: now }, dir);

    assert.ok(!existsSync(stalePath), 'stale session file should be pruned');
    assert.ok(existsSync(join(dir, 'current-session.json')), 'fresh session file should remain');
  });

  it('does not prune a fresh (< 48h) session file belonging to another session', () => {
    const dir = freshDir();
    const now = Date.now();

    const freshPath = join(dir, 'other-fresh-session.json');
    writeFileSync(
      freshPath,
      JSON.stringify({ consecutiveBlocks: 1, lastMsgChars: 10, lastSeenAt: now - 1000 }),
      'utf8'
    );

    writeState('current-session', { consecutiveBlocks: 1, lastMsgChars: 10, lastSeenAt: now }, dir);

    assert.ok(existsSync(freshPath), 'fresh session file belonging to another session should remain');
  });

  it('swallows a corrupt file during pruning instead of throwing, and still prunes the rest', () => {
    const dir = freshDir();
    const now = Date.now();
    const staleAge = 49 * 60 * 60 * 1000;

    writeFileSync(join(dir, 'corrupt-other-session.json'), '{not valid json', 'utf8');
    writeFileSync(
      join(dir, 'stale-other-session.json'),
      JSON.stringify({ consecutiveBlocks: 1, lastMsgChars: 10, lastSeenAt: now - staleAge }),
      'utf8'
    );

    assert.doesNotThrow(() => {
      writeState('current-session', { consecutiveBlocks: 1, lastMsgChars: 10, lastSeenAt: now }, dir);
    });

    assert.ok(!existsSync(join(dir, 'stale-other-session.json')), 'stale session file should still be pruned');
  });
});
