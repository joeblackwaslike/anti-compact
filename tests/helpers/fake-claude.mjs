#!/usr/bin/env node
// Stub for ANTI_COMPACT_CLAUDE_BIN in tests — emits minimal handoff output so
// generateHandoff() resolves immediately without falling back to buildFallbackHandoff().
process.stdout.write('# Pre-Compact Handoff\n\nTest handoff content.\n');
process.exit(0);
