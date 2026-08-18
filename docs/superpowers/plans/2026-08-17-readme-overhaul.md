# anti-compact README & Visual Identity Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `README.md` and build the supporting visual assets (logo, infographics, demo GIF, case study) so the repo converts a first-time visitor within 60 seconds, per `docs/superpowers/specs/2026-08-17-readme-overhaul-design.md`.

**Architecture:** Static assets only — no application code changes. New SVGs and a VHS-recorded GIF live under `assets/`, a reproducible qualitative case study lives at `case-study.md`, and `README.md` is rewritten in place to the structure defined in the spec.

**Tech Stack:** Hand-authored SVG, bash (fake terminal script for the demo), VHS (`/opt/homebrew/bin/vhs`) for GIF recording, Markdown.

---

## Deviation from spec

The spec described the README rewrite as three chunks (top/middle/bottom) for parallel dispatch. Since it's a single file, splitting the write across multiple subagents editing the same file risks conflicting edits with no benefit (dependencies are sequential anyway). Task 7 below writes the complete file in one step instead.

The spec's "orange-left-border callout" for the legitimacy anchor isn't achievable in GitHub Markdown (no arbitrary border colors) — Task 7 uses GitHub's native `> [!NOTE]` alert syntax instead, which renders with its own accent border and achieves the same "this is backed by something real" visual weight.

While drafting the Install section, found the existing README's second `## Install` block uses the wrong marketplace alias — `anti-compact@joeblackwaslike` instead of `anti-compact@agent-marketplace` (confirmed against `agent-marketplace/.claude-plugin/marketplace.json`'s top-level `"name"` field, and against a successful `claude plugin install anti-compact@agent-marketplace` run this session). This would fail for any new user copy-pasting it. Task 7 fixes this as part of the rewrite.

---

## File Structure

```
assets/
  logo-dark.svg                  # wordmark, dark-background gradient
  logo-light.svg                 # wordmark, light-background gradient
  infographic-before-after.svg   # two-panel comparison
  infographic-arch.svg           # hook interception flow
  demo-session.sh                # fake terminal script (no real API calls)
  demo.tape                      # VHS recording config
  demo.gif                       # rendered output (generated, not hand-authored)
case-study.md                    # reproducible qualitative before/after
README.md                        # rewritten in place
.gitignore                       # already has .superpowers/ from this session
```

---

### Task 1: Logo SVGs

**Files:**
- Create: `assets/logo-dark.svg`
- Create: `assets/logo-light.svg`

- [ ] **Step 1: Create the assets directory and the dark-variant logo**

```bash
mkdir -p assets
```

Write `assets/logo-dark.svg`:

```svg
<svg viewBox="0 0 340 60" width="340" height="60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mark" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <text x="4" y="42" font-family="ui-monospace,'SF Mono',Menlo,monospace"
        font-weight="800" font-size="32" fill="url(#mark)" letter-spacing="-1">anti-compact</text>
</svg>
```

- [ ] **Step 2: Create the light-variant logo**

Write `assets/logo-light.svg`:

```svg
<svg viewBox="0 0 340 60" width="340" height="60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mark" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0f9488"/>
      <stop offset="100%" stop-color="#1d4fd1"/>
    </linearGradient>
  </defs>
  <text x="4" y="42" font-family="ui-monospace,'SF Mono',Menlo,monospace"
        font-weight="800" font-size="32" fill="url(#mark)" letter-spacing="-1">anti-compact</text>
</svg>
```

- [ ] **Step 3: Validate both SVGs are well-formed XML**

Run: `xmllint --noout assets/logo-dark.svg assets/logo-light.svg && echo OK`
Expected: `OK` (no parse errors printed)

- [ ] **Step 4: Commit**

```bash
git add assets/logo-dark.svg assets/logo-light.svg
git commit -m "feat: add anti-compact wordmark logo (dark/light variants)"
```

---

### Task 2: Before/After Infographic

**Files:**
- Create: `assets/infographic-before-after.svg`

- [ ] **Step 1: Write the infographic**

Write `assets/infographic-before-after.svg`:

```svg
<svg viewBox="0 0 900 460" width="900" height="460" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="900" height="460" fill="#0d1117"/>
  <text x="450" y="36" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="20" font-weight="700" fill="#f0f6fc">What /compact does to your context</text>
  <text x="450" y="58" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="13" fill="#8b949e">(same session, two outcomes)</text>

  <rect x="40" y="90" width="380" height="330" rx="12" fill="#161b22" stroke="#f85149" stroke-width="2" stroke-dasharray="6 4"/>
  <text x="60" y="130" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="16" font-weight="700" fill="#f85149">without anti-compact</text>
  <text x="60" y="152" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="12" fill="#8b949e">/compact fires — lossy summary</text>

  <text x="60" y="194" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#f85149">&#10007;</text>
  <text x="82" y="194" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#8b949e">exact file paths</text>
  <text x="60" y="230" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#f85149">&#10007;</text>
  <text x="82" y="230" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#8b949e">decision rationale</text>
  <text x="60" y="266" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#f85149">&#10007;</text>
  <text x="82" y="266" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#8b949e">the fix you already found</text>
  <text x="60" y="302" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#f85149">&#10007;</text>
  <text x="82" y="302" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#8b949e">issue IDs &amp; commands</text>

  <rect x="60" y="360" width="180" height="32" rx="16" fill="#3a1618"/>
  <text x="150" y="381" text-anchor="middle" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="13" font-weight="600" fill="#f85149">lossy summary</text>

  <text x="450" y="266" text-anchor="middle" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="40" fill="#6e7681">&#8594;</text>

  <rect x="480" y="90" width="380" height="330" rx="12" fill="#161b22" stroke="#2dd4bf" stroke-width="2"/>
  <text x="500" y="130" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="16" font-weight="700" fill="#2dd4bf">with anti-compact</text>
  <text x="500" y="152" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="12" fill="#8b949e">/compact intercepted — structured handoff</text>

  <text x="500" y="194" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#2dd4bf">&#10003;</text>
  <text x="522" y="194" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#f0f6fc">exact file paths</text>
  <text x="500" y="230" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#2dd4bf">&#10003;</text>
  <text x="522" y="230" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#f0f6fc">decision rationale</text>
  <text x="500" y="266" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#2dd4bf">&#10003;</text>
  <text x="522" y="266" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#f0f6fc">the fix you already found</text>
  <text x="500" y="302" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#2dd4bf">&#10003;</text>
  <text x="522" y="302" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="14" fill="#f0f6fc">issue IDs &amp; commands</text>

  <rect x="500" y="360" width="200" height="32" rx="16" fill="#0f3d38"/>
  <text x="600" y="381" text-anchor="middle" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="13" font-weight="600" fill="#2dd4bf">structured handoff</text>
</svg>
```

- [ ] **Step 2: Validate the SVG is well-formed XML**

Run: `xmllint --noout assets/infographic-before-after.svg && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add assets/infographic-before-after.svg
git commit -m "feat: add before/after infographic"
```

---

### Task 3: Architecture Diagram

**Files:**
- Create: `assets/infographic-arch.svg`

- [ ] **Step 1: Write the diagram**

Write `assets/infographic-arch.svg`:

```svg
<svg viewBox="0 0 640 560" width="640" height="560" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="640" height="560" fill="#0d1117"/>

  <rect x="100" y="20" width="440" height="50" rx="8" fill="#161b22" stroke="#30363d" stroke-width="1.5"/>
  <text x="320" y="50" text-anchor="middle" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="15" fill="#f0f6fc">/compact triggered (~83.5% context)</text>

  <line x1="320" y1="70" x2="320" y2="92" stroke="#6e7681" stroke-width="2"/>
  <polygon points="320,100 314,88 326,88" fill="#6e7681"/>

  <rect x="100" y="100" width="440" height="50" rx="8" fill="#161b22" stroke="#30363d" stroke-width="1.5"/>
  <text x="320" y="130" text-anchor="middle" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="15" fill="#f0f6fc">PreCompact hook (anti-compact)</text>

  <line x1="320" y1="150" x2="320" y2="172" stroke="#6e7681" stroke-width="2"/>
  <polygon points="320,180 314,168 326,168" fill="#6e7681"/>

  <rect x="80" y="180" width="480" height="170" rx="8" fill="#161b22" stroke="#3b82f6" stroke-width="2" stroke-dasharray="6 4"/>
  <text x="320" y="207" text-anchor="middle" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="15" font-weight="700" fill="#3b82f6">isolated `claude -p` call</text>
  <text x="110" y="238" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="13" fill="#8b949e">&#8226; --setting-sources ''</text>
  <text x="110" y="268" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="13" fill="#8b949e">&#8226; --system-prompt (fixed instructions)</text>
  <text x="110" y="298" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="13" fill="#8b949e">&#8226; --model sonnet</text>
  <text x="110" y="328" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="13" fill="#8b949e">&#8226; env: PATH &#183; HOME &#183; USER &#183; ... only</text>

  <line x1="320" y1="350" x2="320" y2="372" stroke="#6e7681" stroke-width="2"/>
  <polygon points="320,380 314,368 326,368" fill="#6e7681"/>

  <rect x="100" y="380" width="440" height="50" rx="8" fill="#161b22" stroke="#2dd4bf" stroke-width="1.5"/>
  <text x="320" y="410" text-anchor="middle" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="15" fill="#2dd4bf">structured handoff generated</text>

  <line x1="320" y1="430" x2="190" y2="452" stroke="#6e7681" stroke-width="2"/>
  <polygon points="182,458 191,446 199,456" fill="#6e7681"/>
  <line x1="320" y1="430" x2="450" y2="452" stroke="#6e7681" stroke-width="2"/>
  <polygon points="458,458 449,446 441,456" fill="#6e7681"/>

  <rect x="80" y="460" width="220" height="60" rx="8" fill="#161b22" stroke="#f0883e" stroke-width="1.5"/>
  <text x="190" y="485" text-anchor="middle" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="13" fill="#f0f6fc">ANTI_COMPACT_ENABLE</text>
  <text x="190" y="505" text-anchor="middle" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="13" fill="#f0883e">block (exit 2)</text>

  <rect x="340" y="460" width="220" height="60" rx="8" fill="#161b22" stroke="#8b949e" stroke-width="1.5"/>
  <text x="450" y="485" text-anchor="middle" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="13" fill="#f0f6fc">HANDOFF_ONLY</text>
  <text x="450" y="505" text-anchor="middle" font-family="ui-monospace,SF Mono,Menlo,monospace" font-size="13" fill="#8b949e">allow (exit 0)</text>
</svg>
```

- [ ] **Step 2: Validate the SVG is well-formed XML**

Run: `xmllint --noout assets/infographic-arch.svg && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add assets/infographic-arch.svg
git commit -m "feat: add architecture diagram"
```

---

### Task 4: Demo Script

**Files:**
- Create: `assets/demo-session.sh`

- [ ] **Step 1: Write the fake terminal script**

No real `claude` invocation — this is purely `echo`/`sleep` for the recording, matching the actual banner/handoff text format the hook produces (verified against `hooks/precompact-handoff.mjs` and `hooks/lib/precompact.mjs` output this session).

Write `assets/demo-session.sh`:

```bash
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
```

- [ ] **Step 2: Make it executable and dry-run it**

```bash
chmod +x assets/demo-session.sh
bash assets/demo-session.sh > /tmp/demo-session-output.txt
```

Expected: exits 0, `/tmp/demo-session-output.txt` contains both the "Summary: Investigated failing..." line (Act 1) and the "# [anti-compact] Pre-Compact Handoff" line (Act 2).

- [ ] **Step 3: Commit**

```bash
git add assets/demo-session.sh
git commit -m "feat: add demo-session.sh fake terminal script for demo GIF"
```

---

### Task 5: Demo GIF

**Files:**
- Create: `assets/demo.tape`
- Generate: `assets/demo.gif`

**Depends on:** Task 4 (`assets/demo-session.sh` must exist).

- [ ] **Step 1: Write the VHS tape config**

Sleep duration covers the script's total sleep time (~23.5s), rounded up.

Write `assets/demo.tape`:

```tape
Output assets/demo.gif
Set Shell "bash"
Set FontSize 14
Set Width 1000
Set Height 400
Set Theme "Dracula"
Set Padding 24
Set TypingSpeed 0ms
Type "bash assets/demo-session.sh"
Enter
Sleep 24s
```

- [ ] **Step 2: Record the GIF**

```bash
cd /Users/joe/github/joeblackwaslike/anti-compact
vhs assets/demo.tape
```

Expected: exits 0, `assets/demo.gif` created.

- [ ] **Step 3: Verify the GIF was produced with reasonable size**

Run: `file assets/demo.gif && ls -la assets/demo.gif`
Expected: `file` reports `GIF image data`; size is non-trivial (at least tens of KB, not 0 bytes).

- [ ] **Step 4: Commit**

```bash
git add assets/demo.tape assets/demo.gif
git commit -m "feat: add and record demo GIF"
```

---

### Task 6: Case Study

**Files:**
- Create: `case-study.md`

- [ ] **Step 1: Write the case study**

Write `case-study.md`:

```markdown
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
```

- [ ] **Step 2: Verify internal links resolve to real headings**

Run: `grep -n "^## Install" README.md` (after Task 7 lands) to confirm the `#install` fragment target exists. If Task 7 hasn't run yet in your dispatch order, note this as a follow-up check rather than blocking — see Task 8's final verification pass, which re-checks this.

- [ ] **Step 3: Commit**

```bash
git add case-study.md
git commit -m "feat: add reproducible case study"
```

---

### Task 7: README Rewrite

**Files:**
- Modify: `README.md` (complete rewrite)

**Depends on:** Tasks 1–6 (all asset paths referenced below must exist).

- [ ] **Step 1: Replace the full contents of README.md**

Write `README.md`:

```markdown
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/logo-light.svg">
  <img alt="anti-compact" src="assets/logo-light.svg" width="340">
</picture>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/works%20with-Claude%20Code-ea580c)](https://claude.ai/code)
[![Discord](https://img.shields.io/discord/1486035859747897414?logo=discord&label=Discord&color=5865F2)](https://discord.gg/Fjc9zYHZyV)

> Keep the part that mattered.

A Claude Code plugin that intercepts `/compact` and generates a structured session handoff instead of letting Claude discard your context.

> [!NOTE]
> Backed by Anthropic's own guidance on context: models are trained to track and use their remaining context precisely — but response quality degrades well before that budget runs out. See [context awareness in Claude's prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#context-awareness-and-multi-window-workflows) and [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents).

![anti-compact demo](assets/demo.gif)

[Install](#install) · [Usage](#usage) · [How It Works](#how-it-works)

## The Problem

Claude Code's `/compact` command frees up context window space by summarizing your session and discarding the rest. It fires automatically once your context fills up (~83.5% by default) — no warning, no confirmation. The summary is lossy: exact file paths, the reasoning behind a decision, the fix you already found for a tricky bug — all of it can vanish into a paragraph of prose.

You've felt this: deep into a debugging session, root cause finally identified, fix half-written — then `/compact` fires. The new summary knows *that* you were debugging auth, but not the one-line fix you'd already found. You re-derive it from scratch.

![Without anti-compact vs. with anti-compact](assets/infographic-before-after.svg)

## How It Works

anti-compact intercepts Claude Code's `PreCompact` hook, generates a structured handoff through an isolated `claude -p` call, and either blocks the lossy compaction or lets it proceed — depending on which mode you've enabled.

![anti-compact architecture](assets/infographic-arch.svg)

See [docs/how-it-works.md](docs/how-it-works.md) for the full technical breakdown — transcript parsing, token estimation, subprocess isolation, and fallback behavior.

## Scenarios

**Auto-interception** — `/compact` fires mid-session, anti-compact catches it, blocks it, and hands you a structured continuation prompt instead:

```
$ # ...three hours into a migration...
⚠ context window at 83.5% — anti-compact intercepted /compact
# [anti-compact] Pre-Compact Handoff
...
```

**On-demand handoff** — before a natural break, generate a handoff without waiting for auto-compact:

```
/anti-compact:handoff
```

**Resume in a new session** — paste the handoff into a fresh session and continue with full context, no re-deriving anything:

```
$ claude
> [paste the handoff prompt]
```

## Case Study

Want to see the difference yourself? [case-study.md](case-study.md) walks through a reproducible before/after in under 5 minutes — no special setup beyond Claude Code itself.

## Install

Inside a Claude Code session:

```
/plugin marketplace add joeblackwaslike/agent-marketplace
/plugin install anti-compact@agent-marketplace
```

Or from a shell:

```bash
claude plugin marketplace add joeblackwaslike/agent-marketplace
claude plugin install anti-compact@agent-marketplace
```

Restart your session for the plugin to take effect.

## Usage

### Generate a handoff on demand

```
/anti-compact:handoff
```

Generates a handoff for the current session and displays it in a fenced block ready to paste.

### Enable automatic interception

```
/anti-compact:handoff auto
```

or

```
/anti-compact:handoff on
```

From now on, every `/compact` call is intercepted — a handoff is generated and compaction is blocked.

### Disable automatic interception

```
/anti-compact:handoff off
```

`/compact` returns to normal behavior.

## Requirements

- Node.js >= 22.5
- Claude Code with `claude` available in PATH (used to generate the handoff)

## Tuning

By default, Claude Code auto-compacts at ~83.5% context — well past where response quality starts to degrade. `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=65` is a reasonable starting point that leaves real working room while triggering before quality drops. See [docs/how-it-works.md#tuning-when-it-fires](docs/how-it-works.md#tuning-when-it-fires) for the full rationale and how to set it.

## Limitations

- The `claude -p` handoff call typically takes 20–40 seconds, against a 45s internal timeout and a 60s hook timeout.
- Token estimates are approximate (`chars ÷ 4`), not exact counts.
- Claude Code only — Gemini CLI and Codex don't have a `PreCompact` hook equivalent.

Full details in [docs/how-it-works.md#limitations](docs/how-it-works.md#limitations).

## Roadmap

- [ ] Reduce `claude -p` handoff latency
- [ ] Replace the `chars / 4` token estimate with a real tokenizer
- [ ] Evaluate Gemini CLI / Codex equivalents for `PreCompact`
- [ ] Improve `claude` binary discovery beyond PATH + the hardcoded nvm fallback

Tracked in [docs/_backlog.md](docs/_backlog.md).

## License

MIT — see [LICENSE](LICENSE).
```

- [ ] **Step 2: Verify no unbalanced code fences**

Run: `grep -c '^```' README.md`
Expected: an even number (each fence has an open and a close).

- [ ] **Step 3: Verify every referenced asset file exists**

Run:
```bash
for f in assets/logo-dark.svg assets/logo-light.svg assets/demo.gif assets/infographic-before-after.svg assets/infographic-arch.svg case-study.md docs/how-it-works.md docs/_backlog.md LICENSE; do
  test -f "$f" && echo "OK: $f" || echo "MISSING: $f"
done
```
Expected: every line reports `OK:` — no `MISSING:` lines.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README with visual identity, demo, and fixed install command

Replaces the duplicated Install section and fixes the marketplace alias
(anti-compact@joeblackwaslike -> anti-compact@agent-marketplace, confirmed
against agent-marketplace/.claude-plugin/marketplace.json)."
```

---

### Task 8: Final Verification

**Files:** None created — verification only.

- [ ] **Step 1: Confirm case-study.md's #install link now resolves**

Run: `grep -n "^## Install" README.md`
Expected: one match (confirms the `case-study.md` link to `README.md#install` from Task 6 resolves correctly now that Task 7 has run).

- [ ] **Step 2: Run the full spec-compliance checklist**

Confirm each item, fixing inline if anything fails:
- [ ] `<picture>` tag serves dark + light logo variants (`grep -n "prefers-color-scheme" README.md`)
- [ ] All three badges present in original order: License, Claude Code, Discord (`grep -n "img.shields.io" README.md`)
- [ ] Legitimacy anchor links are the real Anthropic URLs, not placeholders (`grep -n "platform.claude.com\|anthropic.com/engineering" README.md`)
- [ ] `assets/demo.gif` plays and is non-trivial size (already checked Task 5 Step 3)
- [ ] CTA links (`#install`, `#how-it-works`) anchor to sections that exist
- [ ] Code fences balanced (already checked Task 7 Step 2)
- [ ] `case-study.md` has no unresolved internal-only references (already checked Step 1 above)
- [ ] Infographic SVG green/red bars — N/A, this design uses check/x icons instead of bars, confirm both render (open `assets/infographic-before-after.svg` directly in a browser)
- [ ] `.superpowers/` present in `.gitignore` (`grep -n "^\.superpowers/$" .gitignore`)
- [ ] No fabricated numbers anywhere in README.md or case-study.md (manual read-through)

- [ ] **Step 3: Run the existing test suite to confirm no regressions from unrelated changes**

Run: `npm test`
Expected: all tests pass (this task touches no application code, so this should be unaffected — this step exists purely as a safety net).

- [ ] **Step 4: Push**

```bash
git push
```

Expected: all commits from Tasks 1–7 land on `main`.
```
