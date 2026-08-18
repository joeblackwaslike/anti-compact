# Backlog

- Investigate reducing `claude -p` handoff latency (currently 20–40s against a 45s internal
  kill timer / 60s hook timeout).
- Replace the `chars / 4` token estimate with a real tokenizer for more accurate reporting.
- Evaluate Gemini CLI / Codex equivalents for `PreCompact` so this feature isn't Claude-Code-only.
- Improve `claude` binary discovery beyond `PATH` + the hardcoded nvm fallback path.


---

Investigate impact on agent autonomy.

**Resolved (this session):** what happens when `PreCompact` keeps getting blocked was assumed to
be "the agent just keeps going indefinitely, losing context." That assumption was wrong — per
Claude Code's own hooks docs, a block only "prolongs the session safely" when auto-compact fired
proactively. If it ever fires reactively (recovering from a context-limit error the API already
returned), blocking it surfaces that error and hard-fails the current turn instead, with no field
in the hook's input to tell the two cases apart. Fixed by a safety valve: `hooks/lib/state.mjs`
tracks consecutive blocks per session against a non-growing transcript and fails open (lets
compaction through, visibly) after 3 consecutive blocks or an estimated 95% usage, instead of
risking a silent crash. See `hooks/precompact-handoff.mjs` and `docs/how-it-works.md`'s "Safety
valve" section.

**Still open:** the safety valve only prevents the hard-crash — it does not solve the underlying
"a human must be present to paste the handoff into a fresh session" problem for unattended/
autonomous agents. How can agents autonomously create a new session and transfer the handoff
themselves? The long-term fix is being tracked in the cc-vscode-ext repo (`SessionRelayManager`)
— see that repo's own `docs/session-relay-design.md` and its beads issue tracker. `ctx-tree`
remains a possible complementary mitigation (delays hitting the threshold by offloading tool
output, doesn't address conversation-history growth itself) — evaluation of that is tracked
separately, not part of this fix.

