# anti-compact README & Visual Identity Overhaul

## Context

`anti-compact` is a small, single-hook Claude Code plugin: it intercepts `/compact`, generates a
structured session handoff via an isolated `claude -p` call, and blocks the lossy default
compaction. The current README is functional but not built to convert a first-time visitor —
no visual identity, no demo, a duplicated `## Install` heading, and messaging that assumes the
reader already knows what `/compact` and context compaction are. This repo is about to be pushed
for public traffic, real users, and social sharing (marketplace listing, Discord, potential
social posts), so the README and supporting assets need to do real conversion work: explain the
pain in under 10 seconds, show the fix, and get a visitor to install within 60 seconds.

This spec covers the messaging/visual-identity half of a two-phase plan (viralize → docify). A
follow-up spec will cover the hosted docs site (Mintlify/Docusaurus), reusing the visual identity
established here.

Unlike viralize's default template — built around a measurable token-reduction percentage —
anti-compact has no such number. Its value is qualitative: it prevents the model from silently
discarding decision context, file paths, and reasoning during auto-compaction. The design below
adapts the template accordingly: qualitative pain framing instead of a hero metric, no fabricated
bar-chart statistics.

## Brand & Visual Identity

**Logo:** wordmark-only (no icon mark). `anti-compact`, monospace bold (`ui-monospace, SF Mono,
Menlo, monospace`, weight 800, `letter-spacing: -1`), rendered as gradient-filled SVG text.

**Gradient (Guard: teal → blue):**
- Dark background (`#0d1117`): `#2dd4bf → #3b82f6`
- Light background (`#ffffff`): `#0f9488 → #1d4fd1`

**Tagline:** "Keep the part that mattered." — reused from the existing README blockquote, 29
characters, benefit-coded, no "A tool that..." framing.

**Assets:**
- `assets/logo-dark.svg` — wordmark in dark-background gradient, transparent background
- `assets/logo-light.svg` — wordmark in light-background gradient, transparent background
- Both referenced via a `<picture>` tag at the top of the README so GitHub's dark/light mode
  serves the correct variant automatically.

**SVG template (both variants, differing only in gradient stops and viewBox sizing to fit the
wordmark):**
```svg
<svg viewBox="0 0 340 60" width="340" height="60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mark" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="[STOP_1]"/>
      <stop offset="100%" stop-color="[STOP_2]"/>
    </linearGradient>
  </defs>
  <text x="4" y="42" font-family="ui-monospace,'SF Mono',Menlo,monospace"
        font-weight="800" font-size="32" fill="url(#mark)" letter-spacing="-1">anti-compact</text>
</svg>
```

## README Structure

Numbered sections, in order. Each row states the job and the exact content decision.

| # | Section | Content |
|---|---|---|
| 1 | Hero | `<picture>` logo (dark/light) + tagline blockquote + existing badges, unchanged order: License, works-with-Claude-Code, Discord |
| 2 | Legitimacy anchor | Orange-left-border callout linking Anthropic's context-awareness docs (`platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#context-awareness-and-multi-window-workflows`) and "Effective harnesses for long-running agents" (`anthropic.com/engineering/effective-harnesses-for-long-running-agents`) |
| 3 | Demo GIF | `assets/demo.gif` — two-act: `/compact` fires mid-task, decision lost → same task with anti-compact, blocked, handoff shown |
| 4 | CTA links | "[Install](#install) · [Usage](#usage)" |
| 5 | The pain | Brief beat defining `/compact`/context compaction for readers who don't already know it, then the mid-task pain scenario: deep in a debugging/refactor/migration task, `/compact` fires with no warning, the summary drops the exact file path or the reasoning behind a decision already made, forcing re-derivation of work already done |
| 6 | Before/after infographic | `assets/infographic-before-after.svg` — left panel "without anti-compact" (lossy summary, details visibly dropped), right panel "with anti-compact" (structured handoff, details preserved) |
| 7 | Architecture diagram | `assets/infographic-arch.svg` — `/compact` trigger → hook intercepts → isolated `claude -p` call (`--setting-sources ''`, `--system-prompt`, `--model sonnet`, scoped env) → structured handoff → block (exit 2) or allow (exit 0) depending on mode |
| 8 | Scenarios | 3 terminal/code examples: (a) auto-interception blocking `/compact` mid-session, (b) `/anti-compact:handoff` run on demand before a natural break, (c) pasting the handoff into a fresh session to resume exactly where you left off |
| 9 | Case study | `case-study.md` — reproducible qualitative before/after: run a long session, let `/compact` fire naturally, note what's lost from the summary; repeat the same session with anti-compact enabled, compare the two outputs side by side. No fabricated numbers. |
| 10 | Installation | Existing marketplace install commands, deduplicated (currently appears twice under two separate `## Install` headings — collapse to one) |
| 11 | Usage | Existing three-mode content (on-demand, auto-enable, disable), tightened |
| 12 | Requirements | Existing (Node ≥22.5, `claude` in PATH) |
| 13 | How it works | One-paragraph summary + link to `docs/how-it-works.md` (content unchanged, already written) |
| 14 | Tuning | One-paragraph summary + link to the `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` section in `docs/how-it-works.md` (already written) |
| 15 | Limitations | Pulled/linked from `docs/how-it-works.md`'s existing Limitations section — not duplicated in full, short summary + link |
| 16 | Roadmap | Pulled from `docs/_backlog.md`'s existing items, framed as a short "planned" list |
| 17 | License | "MIT — see [LICENSE](LICENSE)." one line |

Explicitly dropped from viralize's default template: the numeric metrics-savings bar chart
(Phase C's third infographic) — there is no real token/metric number to chart, and the design
review confirmed no fabricated statistic should be substituted.

## Assets To Build

| File | Purpose | Notes |
|---|---|---|
| `assets/logo-dark.svg` | Hero logo, dark backgrounds | Per SVG template above |
| `assets/logo-light.svg` | Hero logo, light backgrounds | Per SVG template above |
| `assets/infographic-before-after.svg` | Section 6 | Dark-themed (`#0d1117`), GitHub-renderable `<img>` |
| `assets/infographic-arch.svg` | Section 7 | Dark-themed, shows the isolated `claude -p` call boundary (dashed border) per the isolation hardening already shipped |
| `assets/demo-session.sh` | Fake terminal script for VHS recording | echo/sleep only, no real API calls |
| `assets/demo.tape` | VHS config | 1000×400px, Dracula theme, 24px padding, 0ms typing speed |
| `assets/demo.gif` | Section 3 | Recorded output of `demo-session.sh` via `vhs` (confirmed installed at `/opt/homebrew/bin/vhs`) |
| `case-study.md` | Section 9, repo root | Reproducible qualitative before/after, self-contained (no internal-only references) |

`.gitignore`: add `.superpowers/` (visual companion working files — already added this session).

## What Is NOT Changing

- Hook implementation (`hooks/precompact-handoff.mjs`, `hooks/lib/precompact.mjs`) and its tests
- `docs/how-it-works.md` content (only linked from the README, not rewritten)
- `docs/_backlog.md` content (only summarized into the Roadmap section, not rewritten)
- `.claude-plugin/plugin.json`, marketplace listing entry
- Env var names, command names, install commands

## Success Criteria

- A visitor with no prior knowledge of `/compact` or context compaction understands the pain
  within the first two sections (hero + pain beat) without needing outside context.
- The demo GIF shows the before/after without requiring the reader to read prose first.
- A visitor can reach a working `Install` command within 60 seconds of landing on the README.
- `case-study.md` is reproducible by a third party in under 5 minutes with no internal references
  back to this repo's private context.
- No fabricated numbers or statistics anywhere in the README or assets.
