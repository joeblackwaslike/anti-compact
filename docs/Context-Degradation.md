## Context Degradation

The 80% auto-compact trigger isn't the degradation point — it's the *recovery* trigger. The actual quality curve is different:

**~50-60%** — This is where context rot begins to set in: as token count grows, accuracy and recall degrade. Not catastrophic, but measurable. Long debugging threads, exploratory back-and-forth, and accumulated tool output are the main culprits.

**~70-75%** — Practical "consider compacting now" zone. Bad compacts happen when the model can't predict the direction your work is going — and due to context rot, the model is at its least intelligent point when autocompact fires. Compacting earlier means the summary is better quality.

**~80-83.5%** — Default auto-compact fires. The `remaining_percentage` field in StatusLine includes the 16.5% autocompact buffer, so at 25% remaining you actually have ~8.5% before compaction.

**The env var you want:** `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` accepts values 1–100 and directly controls when auto-compaction triggers.  Default is ~83.5.  This is global and applied uniformly.  Setting it to 70 triggers compaction earlier with more working space remaining, at the cost of less room before the first compaction fires.

## Optimal Handoff Strategy

The practical options at any decision point: `/compact` (lossy but automatic), `/clear` + manual brief (clean but requires you to write it), subagents (delegate a chunk to a fresh context and pull back only the result), or `/rewind` to jump back to a prior message.

The community consensus that's emerging: proactive clearing at ~50% + structured recovery beats lossy auto-compaction — you get better context fidelity because backup preserves exact details that summarization loses.

Practically for your workflow:

- **Task boundary handoff** — compact after completing any distinct phase of work, not reactively after quality drops. Running it after quality has degraded means the compressed summary may include confused outputs alongside the good ones.
- **Manual `/compact` with steering** — you can pass instructions like `/compact focus on the auth refactor, drop the test debugging` to bias what survives.
- **`/clear` + brief for cross-domain switches** — when you're pivoting to something unrelated, writing down what matters and starting clean beats a lossy summary of mixed context.

Given you're on Max with 1M context, the compaction threshold moves dramatically — you get significantly more usable space before compaction triggers, though the discipline still matters for quality. The practical answer: treat **~50% as a soft "consider compacting" signal** and **natural task completion as the mandatory trigger**, regardless of percentage.


## Context awareness in Claude Sonnet 4.6, Sonnet 4.5, and Haiku 4.5
Claude Sonnet 4.6, Claude Sonnet 4.5, and Claude Haiku 4.5 feature context awareness. This capability lets these models track their remaining context window (i.e. "token budget") throughout a conversation. This enables Claude to execute tasks and manage context more effectively by understanding how much space it has to work. Claude is trained to use this context precisely, persisting in the task until the very end rather than guessing how many tokens remain. For a model, lacking context awareness is like competing in a cooking show without a clock. Claude 4.5+ models change this by explicitly informing the model about its remaining context, so it can take maximum advantage of the available tokens.

### How it works:

At the start of a conversation, Claude receives information about its total context window:

```xml
<budget:token_budget>1000000</budget:token_budget>
```

The budget is set to 1M tokens (200k for models with a smaller context window).

After each tool call, Claude receives an update on remaining capacity:

```xml
<system_warning>Token usage: 35000/1000000; 965000 remaining</system_warning>
```

This awareness helps Claude determine how much capacity remains for work and enables more effective execution on long-running tasks. Image tokens are included in these budgets.

### Benefits:

Context awareness is particularly valuable for:

* Long-running agent sessions that require sustained focus
* Multi-context-window workflows where state transitions matter
* Complex tasks requiring careful token management

> For agents that span multiple sessions, design your state artifacts so that context recovery is fast when a new session starts. The [memory tool's multi-session pattern](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool#multi-session-software-development-pattern) walks through a concrete approach. See also [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents).

For prompting guidance on leveraging context awareness, see the [prompting best practices guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#context-awareness-and-multi-window-workflows).



context window management levers:
- env var `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: int between 1-100 setting the percentage of tokens to be used for auto-compaction. Default is ~83.5.  This is global and applied uniformly.
