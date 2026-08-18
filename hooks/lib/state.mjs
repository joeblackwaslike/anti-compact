/**
 * Per-session safety-valve state for the precompact-handoff hook.
 * Tracks consecutive PreCompact blocks with no forward progress so the hook can
 * detect a reactive-recovery retry loop and fail open instead of hard-crashing
 * the current turn. Extracted here so it can be unit-tested in isolation.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Default, self-pruning location for per-session state files. Deliberately not
// CLAUDE_PLUGIN_DATA — that's a shell-command-string substitution Claude Code performs
// before exec, not an env var visible to the spawned Node process (see plugins-reference.md).
const STATE_DIR = join(tmpdir(), 'anti-compact-state');

// State files not touched in this long are pruned on every writeState() call.
const PRUNE_AGE_MS = 48 * 60 * 60 * 1000;

const DEFAULT_STATE = { consecutiveBlocks: 0, lastMsgChars: 0, lastSeenAt: 0 };

/**
 * Read per-session safety-valve state. Returns defaults when the file is missing,
 * unreadable, or contains corrupt JSON. Never throws.
 *
 * @param {string} sessionId
 * @param {string} [stateDir] - directory containing per-session state files (injectable for tests)
 * @returns {{ consecutiveBlocks: number, lastMsgChars: number, lastSeenAt: number }}
 */
export function readState(sessionId, stateDir = STATE_DIR) {
  try {
    const parsed = JSON.parse(readFileSync(join(stateDir, `${sessionId}.json`), 'utf8'));
    return {
      consecutiveBlocks: Number.isFinite(parsed.consecutiveBlocks)
        ? parsed.consecutiveBlocks
        : DEFAULT_STATE.consecutiveBlocks,
      lastMsgChars: Number.isFinite(parsed.lastMsgChars) ? parsed.lastMsgChars : DEFAULT_STATE.lastMsgChars,
      lastSeenAt: Number.isFinite(parsed.lastSeenAt) ? parsed.lastSeenAt : DEFAULT_STATE.lastSeenAt,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

/**
 * Persist per-session safety-valve state, then opportunistically prune every other
 * session's state file whose lastSeenAt is older than 48 hours. No cron needed — the
 * files are tiny and this runs on every write.
 *
 * @param {string} sessionId
 * @param {{ consecutiveBlocks: number, lastMsgChars: number, lastSeenAt: number }} state
 * @param {string} [stateDir] - directory containing per-session state files (injectable for tests)
 * @returns {void}
 */
export function writeState(sessionId, state, stateDir = STATE_DIR) {
  try {
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, `${sessionId}.json`), JSON.stringify(state), 'utf8');
  } catch {
    return;
  }
  pruneStale(sessionId, stateDir);
}

/**
 * Delete state files (other than the current session's) whose lastSeenAt is stale.
 * Corrupt files are skipped, not deleted, so one bad file can't abort the pass.
 *
 * @param {string} currentSessionId
 * @param {string} stateDir
 * @returns {void}
 */
function pruneStale(currentSessionId, stateDir) {
  let files;
  try {
    files = readdirSync(stateDir);
  } catch {
    return;
  }

  const currentFile = `${currentSessionId}.json`;
  const now = Date.now();

  for (const file of files) {
    if (file === currentFile) continue;
    const path = join(stateDir, file);
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8'));
      if (!Number.isFinite(parsed.lastSeenAt) || now - parsed.lastSeenAt > PRUNE_AGE_MS) {
        unlinkSync(path);
      }
    } catch {
      /* corrupt or unreadable file — leave it, don't let it block pruning of the rest */
    }
  }
}
