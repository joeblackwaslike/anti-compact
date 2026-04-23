---
name: handoff
description: Generate a structured session handoff prompt, or manage precompact automation (auto/on/off). Run with no args to generate a handoff for the current session. Run `auto` to enable automatic handoffs that block /compact.
allowed-tools: ['Bash', 'Read', 'Edit']
---

You are running `/handoff`. The subcommand determines the workflow:

- **No args** — generate a handoff for the current session and display it
- **`auto`** — enable precompact automation in Claude Code settings
- **`on`** — same as `auto`
- **`off`** — disable precompact automation

Determine which subcommand was used from the arguments to this command invocation, then execute the matching workflow below.

---

## Workflow: no args (generate handoff)

### Phase 1 — Locate the session transcript

Find the most recently modified JSONL file for the current project:

```bash
PROJECT_DIR=$(pwd | sed 's|/|-|g' | sed 's|^-||')
TRANSCRIPT=$(ls -t ~/.claude/projects/${PROJECT_DIR}/*.jsonl 2>/dev/null | head -1)
echo "Transcript: ${TRANSCRIPT}"
```

If no transcript is found, report: "No session transcript found for this project directory." and stop.

### Phase 2 — Generate the handoff

Pipe the transcript to the hook in handoff-only mode:

```bash
echo "{\"transcript_path\":\"${TRANSCRIPT}\"}" | \
  ANTI_COMPACT_HANDOFF_ONLY=1 node "$(pwd)/hooks/precompact-handoff.mjs"
```

Or if running from outside the plugin directory, locate the hook via the plugin root:

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-$(pwd)}"

echo "{\"transcript_path\":\"${TRANSCRIPT}\"}" | \
  ANTI_COMPACT_HANDOFF_ONLY=1 node "${PLUGIN_DIR}/hooks/precompact-handoff.mjs"
```

If the hook is not found, fall back to generating a manual summary:

Summarize the current session using your own context. Include:

- Original goal and overall task
- Key decisions made and WHY (rationale, not just outcome)
- Current state: what is done, in progress, and blocked
- Exact commands, file paths, issue IDs — never generalize these
- Mistakes encountered and their solutions
- Next concrete steps

Present the result in a fenced code block so the user can copy and paste it.

### Phase 3 — Present the result

Display the output in a clearly labeled section:

```
## Session Handoff

Paste the block below as your first message in a new session to resume:

[fenced block with handoff content]
```

---

## Workflow: `auto` or `on` (enable precompact automation)

Enable the precompact hook by adding `ANTI_COMPACT=1` to the PreCompact hook command in `~/.claude/settings.json`.

### Phase 1 — Read current settings

```bash
cat ~/.claude/settings.json
```

### Phase 2 — Check for existing PreCompact entry

Look for a `PreCompact` key in the `hooks` object.

**If a PreCompact entry exists and already has `ANTI_COMPACT=1`:**
Report: "Precompact automation is already enabled." and stop.

**If a PreCompact entry exists but lacks the env var:**
Edit the hook command to prepend `ANTI_COMPACT=1 ` to the existing `node ...` command.

**If no PreCompact entry exists:**
Add one. Determine the plugin root from the existing hooks (look at the path used in `SessionStart` or `PreToolUse` hooks) or fall back to `${CLAUDE_PLUGIN_ROOT}`.

The PreCompact block to add:

```json
"PreCompact": [
  {
    "matcher": "",
    "hooks": [
      {
        "type": "command",
        "command": "ANTI_COMPACT=1 node \"<PLUGIN_ROOT>/hooks/precompact-handoff.mjs\"",
        "timeout": 60
      }
    ]
  }
]
```

Replace `<PLUGIN_ROOT>` with the detected plugin path.

### Phase 3 — Write the updated settings

Edit `~/.claude/settings.json` with the change. Then confirm:

```
Precompact automation enabled.
/compact will now be intercepted — a handoff will be generated and compaction blocked.
To disable: /handoff off
```

---

## Workflow: `off` (disable precompact automation)

### Phase 1 — Read current settings

```bash
cat ~/.claude/settings.json
```

### Phase 2 — Find and update the PreCompact entry

Look for a `PreCompact` hook command that includes `ANTI_COMPACT=1`.

**If found:** Remove the `ANTI_COMPACT=1 ` prefix from the command string. If removing it leaves the hook functional, keep the entry. If the entry was added entirely by this plugin (i.e., it only exists because of precompact automation), offer to remove the whole entry.

**If not found:** Report: "Precompact automation is not currently enabled." and stop.

### Phase 3 — Confirm

```
Precompact automation disabled.
/compact will now run normally.
To re-enable: /handoff on
```
