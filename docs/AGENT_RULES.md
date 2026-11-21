# Agent rules

Use these rules whenever an agent does work that the `drawio-engineering` MCP already covers. The same policy is in this repository's `CLAUDE.md`.

## Goal

Jobs this MCP owns go through this MCP, so setups and methods stay consistent and the tool improves over time.

## Rules

1. **MCP first, always.** Use this MCP's tools for:
- RF, electrical, PCB, and EMC diagrams this MCP exposes
- Calling the Draw.io CLI when this MCP can do the job
2. **Never silently bypass.** If an MCP call fails, do not fall back to bash or a vendor CLI and carry on. Stop, capture the exact error and inputs (redact secrets), and find the root cause in this MCP.
3. **Patch this MCP.** Fix it on a branch: a config change, or a code fix with a test that reproduces the failure. Open a PR, restart the MCP if needed, and retry the original step through the MCP.
4. **Temporary bypass only with a record.** If the work is time-critical and the fix cannot land now, a one-off bash fallback is allowed only if you say so explicitly in your report and log it in [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) (or open an issue) with the failing call, then come back to fix it.
5. **Keep methods consistent.** Reuse this MCP's existing tools and options; extend the MCP rather than inlining a one-off script in a session.
6. **Plain bash is fine** for local files, git, builds, and work this MCP does not cover.

## Report

State which MCP tools were used, any failure and the fix PR, and any bypass with its issue or known-issues entry.
