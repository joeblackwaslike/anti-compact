#!/usr/bin/env node
// Stub for ANTI_COMPACT_CLAUDE_BIN in tests — emits minimal handoff output so
// generateHandoff() resolves immediately without falling back to buildFallbackHandoff().
//
// Also captures how it was invoked (argv/env/stdin) to a fixed tmpdir path so integration
// tests can assert on the isolation the hook is supposed to apply to the real spawn call —
// using TMPDIR (an allowlisted var) means no extra env var needs to cross that boundary.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let stdin = '';
process.stdin.on('data', d => {
  stdin += d.toString();
});
process.stdin.on('end', () => {
  writeFileSync(
    join(tmpdir(), 'anti-compact-fake-claude-capture.json'),
    JSON.stringify({ argv: process.argv.slice(2), env: process.env, stdin }),
    'utf8'
  );
  process.stdout.write('# Pre-Compact Handoff\n\nTest handoff content.\n');
  process.exit(0);
});
