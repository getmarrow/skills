# Marrow skills

Agent skills for Marrow, the approval and proof layer for AI coding agents. They follow the [Agent Skills](https://agentskills.io/specification) format and install with the `skills` CLI into Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode, Claude Code and the other agents it supports.

## Install

```bash
npx skills add getmarrow/skills
```

The CLI detects your agents and asks where to install. To choose them up front, for example Codex and Cursor in this project: `npx skills add getmarrow/skills -a codex -a cursor`. Add `-g` to install for your user instead of the project.

The `skills` CLI is a third-party tool with its own anonymous usage telemetry. Set `DISABLE_TELEMETRY=1` (or `DO_NOT_TRACK=1`) to turn it off. These skills send nothing themselves.

## Skills

| Skill | What it gives the agent |
| --- | --- |
| [`marrow`](skills/marrow/SKILL.md) | When to call Marrow, how holds and approvals work, the setup steps for each host (shown to the owner, run by the owner), and the update and removal commands |

A skill is instructions only. It does not install hooks, an MCP server or packages. Marrow's hooks come from `MARROW_API_KEY=<your_key> npx -y @getmarrow/install@latest activate`, which the owner runs in a terminal; in Claude Code and Cursor, use the plugin instead:

```text
/plugin marketplace add getmarrow/plugins
/plugin install marrow@getmarrow
```

That is Claude Code. In Cursor, install Marrow from Settings → Plugins.

## Versions

Setup and verification use the canonical `@getmarrow/install@latest activate` and `doctor` commands. The wrapper and uninstall commands name an exact version (`@getmarrow/install@0.1.70`, which pins `@getmarrow/mcp` 3.9.102). They change only in a reviewed release of this repository, together with the `@getmarrow/install` release. Run `node tools/check.cjs` before a release.
