# Architecture

How `drawio-engineering-mcp` is built, and how it composes with the rest
of [eng-mcp-suite](https://github.com/RFingAdam/eng-mcp-suite).

## Internal layout

```
┌──────────────────────────────────────────────────────────────────┐
│  User-facing surfaces                                            │
│  ┌────────────────┐                       ┌──────────────────┐  │
│  │  MCP server    │                       │  draw.io browser │  │
│  │  (Node.js)     │ ── pako deflate ───►  │  app (URL hash)  │  │
│  └────────────────┘                       └──────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────────┐
│  Orchestration                                                   │
│  • core/compression.js   — pako + base64 URL builder             │
│  • core/browser.js       — cross-platform browser opener         │
│  • core/xml-builder.js   — fluent mxGraphModel XML builder       │
└──────────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────────┐
│  Generators + stencils                                           │
│  • generators/rf-signal-chain.js  — Friis cascade layout         │
│  • generators/emc-setup.js        — CISPR / ISO templates        │
│  • generators/pcb-stackup.js      — cross-section rendering      │
│  • docs/stencils/                 — 13 XML stencil libraries     │
└──────────────────────────────────────────────────────────────────┘
```

The server is pure Node.js. It assembles mxGraphModel XML in memory,
pako-deflates and base64-encodes it into a draw.io URL hash, then opens
the resulting URL in the user's default browser. No headless browser is
required at runtime — only at export time, where puppeteer is optional
for PNG output.

## Source layout

```
drawio-engineering-mcp/
├── src/
│   ├── index.js                       ← MCP server entry point
│   ├── core/
│   │   ├── compression.js             ← pako deflate + base64 URL
│   │   ├── browser.js                 ← cross-platform browser opener
│   │   └── xml-builder.js             ← fluent mxGraphModel XML builder
│   ├── tools/
│   │   ├── open-xml.js                ← open_drawio_xml
│   │   ├── open-csv.js                ← open_drawio_csv
│   │   ├── open-mermaid.js            ← open_drawio_mermaid
│   │   ├── open-engineering.js        ← open_drawio_engineering
│   │   ├── create-rf-block-diagram.js
│   │   ├── create-emc-test-setup.js
│   │   ├── create-pcb-stackup.js
│   │   ├── markup-schematic.js
│   │   ├── read-drawio.js
│   │   └── export-drawio.js
│   ├── generators/
│   │   ├── rf-signal-chain.js         ← RF cascade layout + Friis
│   │   ├── emc-setup.js               ← EMC test setup generation
│   │   ├── pcb-stackup.js             ← PCB cross-section
│   │   └── layout.js                  ← shared layout utilities
│   └── data/
│       ├── rf-components.json         ← default gain / NF / P1dB
│       ├── emc-standards.json         ← CISPR / ISO templates
│       └── pcb-materials.json         ← Dk / Df for FR-4, Rogers, …
├── docs/
│   └── stencils/                      ← 13 XML stencil library files
├── package.json
└── LICENSE                            ← Apache 2.0
```

## Position in eng-mcp-suite

`drawio-engineering-mcp` sits in the **visualization** layer of the
engineering MCP stack — it doesn't compute or measure, it draws what
upstream MCPs decide. Other MCPs pass it cascade data, stackup
definitions, or CISPR method identifiers; this MCP renders them.

```
        ┌─────────────────────────────────────┐
        │   AI agent (Claude Code / Desktop)  │
        └──────┬──────────────┬───────────────┘
               │              │ via MCP
   ┌───────────▼────┐  ┌──────▼─────────────────┐
   │ mcp-emc-regs    │  │ drawio-engineering-mcp │ ← visualization
   │ mcp-pcb-emcopilot│  │ (this MCP)             │
   │ lineforge       │  └────────────────────────┘
   └─────────────────┘
       feeds data
```

### Consumes (this MCP accepts input from)…

- **mcp-emc-regulations** — CISPR / ISO method identifiers feed
  `create_emc_test_setup`.
- **mcp-pcb-emcopilot** — stackup + materials decisions feed
  `create_pcb_stackup`.
- **lineforge** — transmission-line geometry can be visualized inside
  a stackup cross-section.

### Feeds (this MCP produces output that)…

- Design-review packets and lab plans (SVG / PNG export).

### Workflow bundles that include this MCP

| Bundle              | Role of this MCP                                                       |
| ------------------- | ---------------------------------------------------------------------- |
| `emc-compliance`    | EMC test-setup diagram generator (CISPR / ISO templates)               |
| `pcb-review`        | PCB stackup cross-section + schematic markup                           |
| `rf-design`         | RF block diagram with Friis cascade math                               |

See the [suite manifest](https://github.com/RFingAdam/eng-mcp-suite/blob/main/manifest.yaml)
for full bundle definitions.

---

## Design decisions

- **URL-hash transport, not headless browser.** Drawing happens
  client-side in draw.io; the server just produces a URL. Keeps the
  runtime light and avoids puppeteer for the common case.
- **Stencils are XML, not images.** Every stencil is a parametric XML
  shape so it scales cleanly, is editable in draw.io, and round-trips
  through `read_drawio`.
- **Generators are JSON-first.** Every generator takes a JSON
  description, not free text. An LLM produces the JSON; the generator
  produces the diagram. Keeps the layout logic deterministic.
- **Built on `@drawio/mcp`.** Upstream provides the editor MCP basics;
  this fork adds the 10 engineering-specific tools and the 269-symbol
  stencil set on top.
