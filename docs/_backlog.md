# Backlog

- Investigate reducing `claude -p` handoff latency (currently 20–40s against a 45s internal
  kill timer / 60s hook timeout).
- Replace the `chars / 4` token estimate with a real tokenizer for more accurate reporting.
- Evaluate Gemini CLI / Codex equivalents for `PreCompact` so this feature isn't Claude-Code-only.
- Improve `claude` binary discovery beyond `PATH` + the hardcoded nvm fallback path.
