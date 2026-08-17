# How It Works

## Reading the transcript

The hook reads the session's JSONL transcript and separates real conversation content from
injected system context (hook attachments, system reminders). It counts characters from user
and assistant message content plus attachment records to estimate token usage — this is more
accurate than raw file size, which is inflated by hook injection records.

Token estimate:

```
approxTokens = (msgChars + attachChars) / 4
```

`PreCompact` fires at Claude Code's auto-compact threshold — the `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`
env var (1–100), defaulting to ~83.5% when unset — so the window size is inferred from that
threshold rather than read directly:

```
windowTokens = approxTokens / (pct / 100)
```

## Generating the handoff

The conversation text is piped to an isolated `claude -p` call with a system prompt (passed via
`--system-prompt`, not concatenated into the conversation text) instructing the model to produce
a structured handoff covering:

- Original task and overall goal
- Key decisions made and why (rationale, not just outcome)
- Current state — what's done, in progress, blocked
- Exact commands, file paths, and issue IDs (never generalized)
- Mistakes encountered and their solutions
- Next concrete steps

That call is isolated from the invoking session:

- `--setting-sources ''` — the subprocess loads no hooks, plugins, or settings-sourced MCP
  servers, so it can't re-trigger this same `PreCompact` hook (or any other hook) on itself.
- `--model sonnet` — pinned explicitly rather than left to whatever default the environment
  resolves.
- `--no-session-persistence` — the handoff-generation call doesn't pollute session history.
- The subprocess env is reduced to an allowlist (`PATH`, `HOME`, `USER`, `LOGNAME`, `SHELL`,
  `LANG`, `LC_ALL`, `TMPDIR`) rather than inheriting the full parent environment — notably
  excluding `ANTHROPIC_API_KEY`/`ANTHROPIC_BASE_URL`, so a stray exported proxy var in the
  caller's shell can't redirect the call or its auth.

The hook uses `spawn` with an async `close` handler rather than `spawnSync`, because `claude -p`
performs post-response cleanup after printing its output — this causes `spawnSync` to hang for
the full timeout budget even after the response has already arrived. The async handler resolves
as soon as `close` fires, before that hang would occur, with a hard kill timer as a backstop.

If the `claude` binary can't be resolved, or the call fails or times out, the hook falls back to
a structured extraction (active issues, recent commits, conversation entries) instead of failing
the hook entirely.

## Limitations

- The `claude -p` call typically takes 20–40 seconds. The hook has a 45-second internal kill
  timeout and a 60-second hook timeout (`.claude-plugin/plugin.json`). On very slow hardware or
  under heavy load, the fallback handoff may fire instead of the full one.
- The token estimate is an approximation (`chars ÷ 4`). Actual token usage may differ from what
  the hook reports.
- The inferred window size assumes the default `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` (~83.5%) unless
  that env var is set — the hook reads it at run time, but if it's unavailable at that point (or
  changes mid-session) the reported window size will be approximate.
- This feature currently only works in Claude Code. Gemini CLI and Codex do not have a
  `PreCompact` hook equivalent.
- The `claude` binary must be resolvable — via `PATH`, a known fallback location, or the
  `ANTI_COMPACT_CLAUDE_BIN` override. If it can't be found, the hook falls back to structured
  extraction.
