/**
 * Pure utility functions for the precompact-handoff hook.
 * Extracted here so they can be unit-tested without spawning subprocesses.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Width of the horizontal rule lines in the banner (chars).
const RULE_WIDTH = 68;

const RULE_HEAVY = '═'.repeat(RULE_WIDTH);
const RULE_LIGHT = '─'.repeat(RULE_WIDTH);

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
 * PreCompact fires at exactly 80%, so windowTokens = approxTokens / 0.8.
 *
 * @param {number} msgChars  - chars from user+assistant messages
 * @param {number} attachChars - chars from hook attachment records
 * @returns {{ approxTokens: number, windowTokens: number, approxK: number, windowK: number }}
 */
export function estimateTokens(msgChars, attachChars) {
  const totalChars = msgChars + attachChars;
  const approxTokens = Math.round(totalChars / 4);
  const windowTokens = Math.round(approxTokens / 0.8);
  const approxK = Math.round(approxTokens / 1000);
  const windowK = Math.round(windowTokens / 1000);
  return { approxTokens, windowTokens, approxK, windowK };
}

/**
 * Build the context-at-capacity warning banner.
 * Displayed on the disabled path (ANTI_COMPACT not set) so users still know
 * their context is full and what to do about it.
 *
 * @param {number} approxK  - estimated tokens used, in thousands
 * @param {number} windowK  - estimated window size, in thousands
 * @returns {string}
 */
export function buildBanner(approxK, windowK) {
  const tokenLine =
    approxK > 0
      ? `  CONTEXT AT CAPACITY  ·  ~${approxK}k / ~${windowK}k tokens used  (~80%)`
      : `  CONTEXT AT CAPACITY  ·  context window at ~80% capacity`;

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
