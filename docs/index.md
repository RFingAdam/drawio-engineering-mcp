# drawio-engineering-mcp

**Engineering diagrams in draw.io: RF block diagrams, PCB stackups, and EMC test setups generated from structured prompts.**
**Drive it from your IDE, terminal, or AI agent and skip the manual stencil-dragging.**

---

## What it is

A Node.js MCP server that gives an AI agent the ability to create, view,
and analyze engineering diagrams in [draw.io](https://app.diagrams.net).
Extends the [official draw.io MCP](https://github.com/jgraph/drawio-mcp)
with **10 tools** and **269 drag-and-drop engineering symbols** across
RF, PCB, EMC, wireless, electrical, and general engineering.

## Install

```bash
git clone https://github.com/RFingAdam/drawio-engineering-mcp.git
cd drawio-engineering-mcp
npm install
```

## First call

=== "MCP"

    Add to `claude_desktop_config.json`:

    ```json
    {
      "mcpServers": {
        "drawio-engineering": {
          "command": "node",
          "args": ["/path/to/drawio-engineering-mcp/src/index.js"]
        }
      }
    }
    ```

    Then ask your assistant:

    > *"Create an RF receiver signal chain with antenna, SAW filter, LNA, mixer with PLL LO, IF filter, and ADC. Show cumulative gain and noise figure."*

=== "Claude Code"

    ```bash
    claude mcp add drawio-engineering -s user -- \
      node /path/to/drawio-engineering-mcp/src/index.js
    ```

## Where to next

- [Tool reference](tools.md). Every MCP tool with arguments
- [Usage examples](usage.md): practical end-to-end walkthroughs
- [Architecture](architecture.md): how this MCP fits inside eng-mcp-suite

---

!!! note "Part of eng-mcp-suite"
    This MCP server is part of [eng-mcp-suite](https://github.com/RFingAdam/eng-mcp-suite),
    an umbrella of engineering MCP servers across RF, EMC, PCB, signal
    integrity, EM simulation, and lab test. Same brand, same docs
    structure, designed to compose.
