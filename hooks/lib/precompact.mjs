/**
 * Pure utility functions for the precompact-handoff hook.
 * Extracted here so they can be unit-tested without spawning subprocesses.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Width of the horizontal rule lines in the banner (chars).
const RULE_WIDTH = 68;

// Env vars passed through to the isolated `claude -p` subprocess. Everything else —
// notably ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL — is excluded by omission so a stray
// exported proxy var in the caller's shell can't redirect the call or its auth.
const ENV_ALLOWLIST = ['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'TMPDIR'];

const RULE_HEAVY = '═'.repeat(RULE_WIDTH);
const RULE_LIGHT = '─'.repeat(RULE_WIDTH);

// Claude Code's default auto-compact threshold when CLAUDE_AUTOCOMPACT_PCT_OVERRIDE is unset.
const DEFAULT_AUTOCOMPACT_PCT = 83.5;

/**
 * Resolve the active auto-compact percentage. Claude Code reads
 * CLAUDE_AUTOCOMPACT_PCT_OVERRIDE (1-100) to control when PreCompact fires; out-of-range or
 * non-numeric values fall back to the default.
 *
 * @param {NodeJS.ProcessEnv} sourceEnv
 * @returns {number}
 */
function autocompactPct(sourceEnv) {
  const override = Number(sourceEnv.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE);
  return Number.isFinite(override) && override >= 1 && override <= 100 ? override : DEFAULT_AUTOCOMPACT_PCT;
}

/**
 * Parse a session JSONL transcript and return conversation entries plus
 * raw character counts for token estimation.
 *
 * @param {string} filePath
 * @returns {{ entries: Array<{role:string,text:string}>, msgChars: number, attachChars: number }}
 */
export function parseTranscript(filePath) {
  let msgChars = 0;
  let attachChars = 0;
  const entries = [];

  let raw;
  try {
    raw = readFileSync(filePath, 'utf8').trim();
  } catch {
    return { entries, msgChars, attachChars };
  }

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const d = JSON.parse(line);
      if (d.type === 'user') {
        const c = d.message?.content;
        const text =
          typeof c === 'string'
            ? c
            : Array.isArray(c)
              ? c
                  .filter(x => x.type === 'text')
                  .map(x => x.text)
                  .join('\n')
              : '';
        // Strip injected system context — keep only the human-authored message.
        const clean = text.split('<system-reminder>')[0].split('<ide_opened_file>')[0].trim();
        if (clean.length > 30) entries.push({ role: 'user', text: clean });
        msgChars += text.length;
      } else if (d.type === 'assistant') {
        const c = d.message?.content;
        if (Array.isArray(c)) {
          const text = c
            .filter(x => x.type === 'text')
            .map(x => x.text)
            .join('\n')
            .trim();
          if (text.length > 100) entries.push({ role: 'assistant', text });
          msgChars += text.length;
        }
      } else if (d.type === 'attachment') {
        attachChars += JSON.stringify(d.attachment ?? {}).length;
      }
    } catch {
      /* malformed JSONL line */
    }
  }

  return { entries, msgChars, attachChars };
}

/**
 * Estimate token usage and infer the context window size.
 * PreCompact fires at the active auto-compact percentage (CLAUDE_AUTOCOMPACT_PCT_OVERRIDE,
 * default ~83.5%), so windowTokens = approxTokens / (pct / 100).
 *
 * @param {number} msgChars  - chars from user+assistant messages
 * @param {number} attachChars - chars from hook attachment records
 * @param {NodeJS.ProcessEnv} [sourceEnv]
 * @returns {{ approxTokens: number, windowTokens: number, approxK: number, windowK: number, pct: number }}
 */
export function estimateTokens(msgChars, attachChars, sourceEnv = process.env) {
  const totalChars = msgChars + attachChars;
  const approxTokens = Math.round(totalChars / 4);
  const pct = autocompactPct(sourceEnv);
  const windowTokens = Math.round(approxTokens / (pct / 100));
  const approxK = Math.round(approxTokens / 1000);
  const windowK = Math.round(windowTokens / 1000);
  return { approxTokens, windowTokens, approxK, windowK, pct };
}

/**
 * Build the context-at-capacity warning banner.
 * Displayed on the disabled path (ANTI_COMPACT not set) so users still know
 * their context is full and what to do about it.
 *
 * @param {number} approxK  - estimated tokens used, in thousands
 * @param {number} windowK  - estimated window size, in thousands
 * @param {number} [pct]    - the active auto-compact percentage
 * @returns {string}
 */
export function buildBanner(approxK, windowK, pct = DEFAULT_AUTOCOMPACT_PCT) {
  const tokenLine =
    approxK > 0
      ? `  CONTEXT AT CAPACITY  ·  ~${approxK}k / ~${windowK}k tokens used  (~${pct}%)`
      : `  CONTEXT AT CAPACITY  ·  context window at ~${pct}% capacity`;

  return [
    RULE_HEAVY,
    tokenLine,
    RULE_HEAVY,
    '',
    '  Inference quality degrades significantly at this threshold.',
    '  Compaction will discard decision context and reasoning chains',
    '  that cannot be recovered afterward.',
    '',
    '  Run /handoff to generate a continuation prompt, then',
    '  open a fresh session and paste it in to resume with full context.',
    '',
    RULE_LIGHT,
    '  AUTOMATE THIS · never lose context to compaction again:',
    '',
    '  /handoff auto    automate handoffs + block /compact',
    '  /handoff on      re-enable automation',
    '  /handoff off     disable automation',
    RULE_HEAVY,
  ].join('\n');
}

/**
 * Build a fallback handoff from structured state when claude -p is unavailable.
 *
 * @param {Array<{role:string,text:string}>} entries
 * @returns {string}
 */
export function buildFallbackHandoff(entries) {
  let out = 'Session handoff (fallback — claude -p unavailable)\n\n';

  try {
    const active = execFileSync('bd', ['list', '--status=in_progress'], {
      encoding: 'utf8',
    }).trim();
    if (active) out += `## Active Issues\n${active}\n\n`;
  } catch {
    /* bd not available */
  }

  try {
    const ready = execFileSync('bd', ['ready'], { encoding: 'utf8' }).trim();
    if (ready) out += `## Ready Work\n${ready}\n\n`;
  } catch {
    /* bd not available */
  }

  try {
    const commits = execFileSync('git', ['log', '--oneline', '-10'], { encoding: 'utf8' }).trim();
    if (commits) out += `## Recent Commits\n${commits}\n\n`;
  } catch {
    /* git not available */
  }

  if (entries.length > 0) {
    out += '## Conversation\n\n';
    for (const e of entries) {
      out += `**${e.role === 'user' ? 'User' : 'Claude'}**: ${e.text}\n\n`;
    }
  }

  return out;
}

/**
 * Build an allowlisted env object for the isolated `claude -p` subprocess.
 *
 * @param {NodeJS.ProcessEnv} [sourceEnv]
 * @returns {Record<string, string>}
 */
export function scopedEnv(sourceEnv = process.env) {
  const env = {};
  for (const key of ENV_ALLOWLIST) {
    if (sourceEnv[key] !== undefined) env[key] = sourceEnv[key];
  }
  return env;
}
