# drawio-engineering-mcp

[![MCP](https://img.shields.io/badge/MCP-compatible-blue?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiLz48bGluZSB4MT0iOSIgeTE9IjMiIHgyPSI5IiB5Mj0iMjEiLz48L3N2Zz4=)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/license-Apache%202.0-green)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![draw.io](https://img.shields.io/badge/draw.io-editor-orange?logo=diagramsdotnet)](https://app.diagrams.net)

A [Model Context Protocol](https://modelcontextprotocol.io) server that gives Claude (and other LLMs) the ability to create, view, and analyze engineering diagrams in [draw.io](https://app.diagrams.net). Built on top of the [official draw.io MCP](https://github.com/jgraph/drawio-mcp), extended with **10 tools** and **269 drag-and-drop engineering symbols** covering RF, electrical, PCB, EMC, wireless, and general engineering.

## Quick Start

### 1. Install

```bash
git clone https://github.com/RFingAdam/drawio-engineering-mcp.git
cd drawio-engineering-mcp
npm install
```

### 2. Add to Claude Code

```bash
claude mcp add drawio-engineering -s user -- node /path/to/drawio-engineering-mcp/src/index.js
```

### 3. Add to Claude Desktop

Add to your `claude_desktop_config.json`:

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

### 4. Verify

Start a new Claude session. You should see 10 tools available:

```
open_drawio_xml, open_drawio_csv, open_drawio_mermaid, open_drawio_engineering,
create_rf_block_diagram, create_emc_test_setup, create_pcb_stackup,
markup_schematic, read_drawio, export_drawio
```

---

## Tools

### Viewer / Editor Tools

| Tool | Description |
|------|-------------|
| `open_drawio_xml` | Open draw.io with XML content |
| `open_drawio_csv` | Open draw.io with CSV data |
| `open_drawio_mermaid` | Open draw.io with Mermaid syntax |
| `open_drawio_engineering` | Open draw.io with 269 engineering stencils loaded in sidebar |

### Generator Tools

| Tool | Description |
|------|-------------|
| `create_rf_block_diagram` | Auto-layout RF signal chain from JSON (gain/NF cascade, Friis formula) |
| `create_emc_test_setup` | CISPR 25 / ISO 11452 EMC test setup diagrams from templates |
| `create_pcb_stackup` | PCB cross-section stackup diagrams (4-layer, 6-layer, custom) |
| `markup_schematic` | Annotate schematic screenshots with redlines, revision clouds, callouts |

### Analysis Tools

| Tool | Description |
|------|-------------|
| `read_drawio` | Parse `.drawio` files into structured JSON (shapes, edges, styles) |
| `export_drawio` | Export diagrams to SVG (or PNG with puppeteer) |

---

## Usage Examples

### RF Signal Chain

Ask Claude:
> "Create an RF receiver signal chain with antenna, SAW filter, LNA, mixer with PLL LO, IF filter, and ADC. Show cumulative gain and noise figure."

The `create_rf_block_diagram` tool generates a color-coded, auto-laid-out diagram with Friis cascade annotations.

### EMC Test Setup

> "Show me a CISPR 25 radiated emissions test setup"

Uses `create_emc_test_setup` with the `cispr25_re` template. Also supports `cispr25_ce`, `iso11452_2_ri`, and `iso11452_4_ci`.

### PCB Stackup

> "Generate a 6-layer PCB stackup with Rogers 4003C for the RF layers"

The `create_pcb_stackup` tool renders color-coded cross-sections with material properties and impedance annotations.

### Engineering Diagrams with Stencils

> "Open draw.io with the RF and PCB stencils loaded — I need to draw an antenna matching network"

Uses `open_drawio_engineering` which loads stencil libraries into the draw.io sidebar for drag-and-drop.

### Schematic Markup

> "Here's a screenshot of my schematic. Circle the decoupling caps that need to be moved closer to the IC, and add a note about the missing ferrite bead."

The `markup_schematic` tool overlays annotations on the image as a locked background layer.

---

## Stencil Libraries

269 symbols across 13 libraries, automatically loaded in the draw.io sidebar:

| Library | Symbols | Contents |
|---------|---------|----------|
| `rf-blocks` | 30 | Core RF blocks (LNA, PA, mixer, filter, switch, antenna, etc.) |
| `rf-amplifiers-mixers` | 16 | Amplifier variants (LNA, PA, VGA, driver, buffer, log, limiting) + mixers |
| `rf-filters-attenuators` | 17 | BPF, LPF, HPF, notch, cavity, SAW, BAW, DSA, step/variable atten |
| `rf-passive-components` | 14 | Circulators, isolators, directional couplers, Wilkinson, hybrid, balun |
| `rf-sources-oscillators` | 10 | Crystal, TCXO, OCXO, VCO, PLL, DDS, synthesizer |
| `rf-switches-detectors` | 15 | SPDT, SP4T, transfer, T/R, power detector, ADC, DAC |
| `rf-antennas-txlines` | 20 | Dipole, patch, horn, array, MIMO, coax, microstrip, waveguide |
| `ee-power-ics` | 20 | LDO, buck, boost, flyback, battery, SoC, FPGA, MCU, QFN, BGA |
| `ee-connectors` | 14 | SMA, U.FL, N-type, BNC, USB-C, RJ45, pin header, B2B |
| `ee-test-equipment-emc` | 18 | Spectrum analyzer, VNA, scope, LISN, CDN, anechoic chamber |
| `pcb-stackup-vias` | 30 | Copper/prepreg/core layers, through/blind/buried/micro vias, impedance traces |
| `wireless-telecom` | 27 | WiFi, BLE, LTE, 5G NR, LoRa, Zigbee, Thread, protocol badges, OFDM, QAM |
| `general-engineering` | 38 | System blocks, rack diagrams, cables, thermal management, R/L/C/transformer |

### Loading Specific Libraries

By default, all libraries load. To load only specific ones:

```json
{
  "stencils": ["rf-blocks", "ee-connectors", "pcb-stackup-vias"]
}
```

---

## Project Structure

```
drawio-engineering-mcp/
├── src/
│   ├── index.js                    # MCP server entry point
│   ├── core/
│   │   ├── compression.js          # pako deflate + base64 URL generation
│   │   ├── browser.js              # Cross-platform browser opener
│   │   └── xml-builder.js          # Fluent XML builder for mxGraphModel
│   ├── tools/
│   │   ├── open-xml.js             # open_drawio_xml
│   │   ├── open-csv.js             # open_drawio_csv
│   │   ├── open-mermaid.js         # open_drawio_mermaid
│   │   ├── open-engineering.js     # open_drawio_engineering (stencil loader)
│   │   ├── create-rf-block-diagram.js
│   │   ├── create-emc-test-setup.js
│   │   ├── create-pcb-stackup.js
│   │   ├── markup-schematic.js
│   │   ├── read-drawio.js
│   │   └── export-drawio.js
│   ├── generators/
│   │   ├── rf-signal-chain.js      # RF cascade layout + Friis calculations
│   │   ├── emc-setup.js            # EMC test setup diagram generation
│   │   ├── pcb-stackup.js          # PCB cross-section rendering
│   │   └── layout.js               # Shared layout utilities
│   └── data/
│       ├── rf-components.json      # Default gain/NF/P1dB for RF components
│       ├── emc-standards.json      # CISPR/ISO template definitions
│       └── pcb-materials.json      # Dk/Df for FR-4, Rogers, Megtron, etc.
├── docs/
│   └── stencils/                   # 13 XML stencil library files (269 symbols)
├── package.json
├── LICENSE                         # Apache 2.0
└── README.md
```

## Based On

Extended from the [official draw.io MCP server](https://github.com/jgraph/drawio-mcp) (`@drawio/mcp`) by JGraph Ltd.

## License

[Apache 2.0](LICENSE)
