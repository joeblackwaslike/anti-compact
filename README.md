# anti-compact

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/works%20with-Claude%20Code-ea580c)](https://claude.ai/code)
[![Discord](https://img.shields.io/discord/1486035859747897414?logo=discord&label=Discord&color=5865F2)](https://discord.gg/Fjc9zYHZyV)

> Your context is about to be thrown away. Keep the part that mattered.

A Claude Code plugin that intercepts `/compact` and generates a structured session handoff instead of letting Claude discard your context.

## Install

```bash
claude plugin marketplace add joeblackwaslike/agent-marketplace
claude plugin install anti-compact
```

## The Problem

Claude Code's `/compact` command summarizes and compresses your session to free up context window space. The summary is lossy — key decisions, rationale, file paths, issue IDs, and the exact state of in-progress work get dropped. When you resume, the agent is missing the context it needs to continue effectively.

## What This Does

When `/compact` is triggered, anti-compact:

1. **Intercepts the compaction** before it runs
2. **Generates a structured handoff** — a dense, copy-pasteable block capturing everything that matters: original goal, key decisions with rationale, current state, exact file paths and commands, mistakes and fixes, and next steps
3. **Blocks the lossy compaction** so nothing is thrown away
4. **Lets you paste the handoff** into a fresh session to resume with full context

See [docs/how-it-works.md](docs/how-it-works.md) for implementation details.

## Install

```sh
/plugin install anti-compact@joeblackwaslike
```

Requires [joeblackwaslike's marketplace](https://github.com/joeblackwaslike/agent-marketplace):

```sh
/plugin marketplace add joeblackwaslike/agent-marketplace
/plugin install anti-compact@joeblackwaslike
```

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

From now on, every `/compact` call will be intercepted — a handoff is generated and compaction is blocked.

### Disable automatic interception

```
/anti-compact:handoff off
```

`/compact` returns to normal behavior.

## Requirements

- Node.js >= 22.5
- Claude Code with `claude -p` available in PATH (used to generate the handoff via the API)

## License

MIT
