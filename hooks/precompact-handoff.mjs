#!/usr/bin/env node

/**
 * PreCompact hook: intercepts /compact, generates a session handoff, then blocks.
 *
 * Modes:
 *   ANTI_COMPACT=1              — enabled: generates handoff and exits 2 (blocks /compact)
 *   ANTI_COMPACT_HANDOFF_ONLY=1 — on-demand: generates handoff and exits 0 (no block)
 *   neither set                 — disabled: emits context-full warning banner and exits 0
 *
 * stdin: JSON with { hook_event_name, session_id, transcript_path }
 * stdout: raw text (Claude Code PreCompact convention — NOT JSON)
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import {
  parseTranscript,
  estimateTokens,
  buildBanner,
  buildFallbackHandoff,
} from './lib/precompact.mjs';

const ENABLED = Boolean(process.env.ANTI_COMPACT);
const HANDOFF_ONLY = Boolean(process.env.ANTI_COMPACT_HANDOFF_ONLY);

// Resolve claude binary: prefer ANTI_COMPACT_CLAUDE_BIN (test seam), then PATH, then nvm fallback.
function findClaudeBin() {
  if (process.env.ANTI_COMPACT_CLAUDE_BIN) return process.env.ANTI_COMPACT_CLAUDE_BIN;
  try {
    return execFileSync('which', ['claude'], { encoding: 'utf8' }).trim();
  } catch {
    /* which not available or claude not on PATH */
  }
  const fallback = `${process.env.HOME}/.nvm/versions/node/v24.10.0/bin/claude`;
  return existsSync(fallback) ? fallback : 'claude';
}

async function generateHandoff(entries) {
  const claudeBin = findClaudeBin();
  const convText = entries
    .map(e => `${e.role === 'user' ? 'User' : 'Claude'}: ${e.text}`)
    .join('\n\n---\n\n');

  const prompt = `You are creating a session handoff document. The session is about to be interrupted.

Produce a structured handoff that preserves ALL important context so work can continue seamlessly in a new session. Include:
- Original task and overall goal
- Key decisions made and WHY (rationale matters, not just what was decided)
- Current state: what's done, what's in progress, what's blocked
- Specific commands, file paths, issue IDs (never generalize these — list them exactly)
- Any mistakes encountered and their solutions
- Next concrete steps with specific issue IDs or commands

Be thorough. This handoff must preserve more context than an automated summary.

CONVERSATION:
${convText}`;

  return new Promise(resolve => {
    const child = spawn(claudeBin, ['-p', '--no-session-persistence'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let out = '';
    child.stdout.on('data', d => {
      out += d.toString();
    });
    child.stdin.write(prompt);
    child.stdin.end();

    // claude -p hangs after printing output due to post-response cleanup.
    // Kill on close event (fires before the hang) instead of waiting for process exit.
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve(out.trim() || null);
    }, 45000);

    child.on('close', () => {
      clearTimeout(timer);
      resolve(out.trim() || null);
    });

    child.on('error', () => resolve(null));
  });
}

async function main() {
  let transcriptPath = null;

  try {
    const stdin = readFileSync(0, 'utf8');
    const data = JSON.parse(stdin);
    transcriptPath = data.transcript_path ?? null;
  } catch {
    /* malformed or missing stdin */
  }

  const { entries, msgChars, attachChars } = transcriptPath
    ? parseTranscript(transcriptPath)
    : { entries: [], msgChars: 0, attachChars: 0 };

  const { approxK, windowK } = estimateTokens(msgChars, attachChars);

  // Disabled path: emit the context-full warning banner, then allow compaction.
  if (!ENABLED && !HANDOFF_ONLY) {
    process.stdout.write(buildBanner(approxK, windowK) + '\n');
    process.exit(0);
  }

  let summary = null;
  if (entries.length > 0) {
    summary = await generateHandoff(entries);
  }
  if (!summary) {
    summary = buildFallbackHandoff(entries);
  }

  process.stdout.write(`# [anti-compact] Pre-Compact Handoff

Context: ~${approxK}k / ~${windowK}k tokens (~80%). Compaction would degrade inference quality — blocking to preserve session context.

Copy this prompt to continue in a new session:

\`\`\`
${summary}
\`\`\`
`);

  // HANDOFF_ONLY mode is called on demand (/handoff command) — do not block.
  process.exit(HANDOFF_ONLY ? 0 : 2);
}

main();
