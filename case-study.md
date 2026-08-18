# Case Study: What /compact Loses (and What anti-compact Keeps)

A reproducible, qualitative before/after. No special setup beyond Claude Code itself — takes about 5 minutes.

## Setup

- Claude Code CLI installed and authenticated (if you're reading this, you already have it).
- No other integrations, MCP servers, or paid tools required.

## Run 1: without anti-compact

1. Start a fresh Claude Code session in any repo with a real (or toy) bug to fix.
2. Work the bug for several turns — enough that you end up with a specific root cause and a specific fix (e.g. "the `exp` claim is compared in seconds against `Date.now()` in milliseconds — multiply by 1000 before comparing").
3. Either let `/compact` fire naturally once your context fills, or force it early with `/compact`.
4. Read the resulting summary. Check: does it still contain the *exact* fix, or just that you were "debugging authentication"?

## Run 2: with anti-compact

1. Install anti-compact (see [README.md#install](README.md#install)) and enable automatic interception: `/anti-compact:handoff auto`.
2. Repeat the same task from Run 1 in a new session — same bug, same investigation depth.
3. Let `/compact` fire (or trigger it) as before. anti-compact intercepts it and produces a structured handoff instead of a summary.
4. Compare: the handoff should include the specific fix, the file path, and the reasoning — not just the topic.

## What to look for

| | Run 1 (`/compact`) | Run 2 (anti-compact) |
|---|---|---|
| Exact fix preserved | Usually not | Yes |
| File paths preserved | Usually not | Yes |
| Decision rationale preserved | Rarely | Yes |
| Blocks compaction | No (always proceeds) | Yes (in `auto` mode) |

There's no fabricated percentage here — the difference is qualitative and depends on your specific session. That's the point: read both outputs side by side and judge for yourself whether the exact details you'd need to resume without re-deriving them are actually there.

## Share your results

If you run this and get a notably different outcome, open a [discussion or issue](https://github.com/joeblackwaslike/anti-compact/issues) — real before/after examples from other sessions are useful signal.
