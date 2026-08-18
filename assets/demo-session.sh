#!/bin/bash
# Fake terminal recording for the anti-compact demo GIF.
# Echo/sleep only — no real claude or API calls.

echo '$ # ...debugging a flaky auth test for the last 20 minutes...'
sleep 1
echo '$ npm test -- auth.spec.ts'
sleep 1
echo '  ✓ rejects expired tokens'
echo '  ✓ rejects malformed signatures'
echo '  ✗ accepts refreshed token after clock skew'
sleep 1.5
echo ''
echo '  → root cause: comparing exp claim in seconds against Date.now() in ms'
echo '  → fix: convert exp * 1000 before comparing'
sleep 2

echo ''
echo '⚠ context window at 83.5% — auto-compacting...'
sleep 1.5
echo ''
echo '# [Claude Code] Compacting conversation...'
sleep 2
echo ''
echo 'Summary: Investigated failing auth test, made progress on token'
echo 'validation logic.'
sleep 2.5

echo ''
echo '$ # ...the exact fix is gone. re-deriving it from scratch...'
sleep 2

clear

echo '$ # same session, anti-compact enabled'
sleep 1
echo '$ npm test -- auth.spec.ts'
sleep 1
echo '  ✓ rejects expired tokens'
echo '  ✓ rejects malformed signatures'
echo '  ✗ accepts refreshed token after clock skew'
sleep 1.5
echo ''
echo '  → root cause: comparing exp claim in seconds against Date.now() in ms'
echo '  → fix: convert exp * 1000 before comparing'
sleep 2

echo ''
echo '⚠ context window at 83.5% — anti-compact intercepted /compact'
sleep 1.5
echo ''
echo '# [anti-compact] Pre-Compact Handoff'
echo ''
echo 'Context: ~165k / ~198k tokens (~83.5%). Compaction would degrade'
echo 'inference quality — blocking to preserve session context.'
echo ''
echo 'Copy this prompt to continue in a new session:'
echo ''
echo '```'
echo 'Root cause: exp claim in seconds vs Date.now() in ms.'
echo 'Fix: convert exp * 1000 before comparing.'
echo 'File: src/auth/verifyToken.ts:42'
echo '```'
sleep 3
