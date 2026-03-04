# drawio-engineering-mcp Expansion Design

**Date:** 2026-03-03
**Status:** Approved

## Problem

Phase 1 MVP deployed with 4 tools and 30 RF stencil symbols. Browser error on test: `clibs` data URI (25KB encoded) exceeds browser URL limit (~8KB). Need to fix hosting, then expand to full engineering diagram platform.

## Design Decisions

1. **Stencil hosting:** GitHub Pages from `/docs` folder on the repo
2. **Screenshot markup:** Claude vision analyzes image, then `markup_schematic` tool renders image as background layer with redline annotation overlay in draw.io
3. **Build order:** Generator-first (Approach A) — fix bug, then highest-value tools first, grow stencil library alongside tools
4. **Architecture:** Modular tools in `src/tools/`, generators in `src/generators/`, stencils in `docs/stencils/`

## Tool Inventory (10 tools)

| # | Tool | Type | Phase |
|---|------|------|-------|
| 1 | `open_drawio_xml` | Passthrough | Done |
| 2 | `open_drawio_csv` | Passthrough | Done |
| 3 | `open_drawio_mermaid` | Passthrough | Done |
| 4 | `open_drawio_engineering` | Passthrough + stencils | Fix in Phase 1.5 |
| 5 | `create_rf_block_diagram` | Generator | Phase 2 |
| 6 | `create_emc_test_setup` | Generator | Phase 3 |
| 7 | `create_pcb_stackup` | Generator | Phase 4 |
| 8 | `markup_schematic` | Image + annotation | Phase 5 |
| 9 | `read_drawio` | Parser | Phase 6 |
| 10 | `export_drawio` | Headless export | Phase 6 |

## Stencil Library (240 symbols across 12 files)

```
docs/stencils/
├── rf-amplifiers-mixers.xml      (16 symbols)
├── rf-filters-attenuators.xml    (17 symbols)
├── rf-passive-components.xml     (14 symbols)
├── rf-sources-oscillators.xml    (10 symbols)
├── rf-switches-detectors.xml     (15 symbols)
├── rf-antennas-txlines.xml       (20 symbols)
├── ee-power-ics.xml              (20 symbols)
├── ee-connectors.xml             (14 symbols)
├── ee-test-equipment-emc.xml     (18 symbols)
├── pcb-stackup-vias.xml          (30 symbols)
├── wireless-telecom.xml          (28 symbols)
└── general-engineering.xml       (38 symbols)
```

## Generator Architecture

### create_rf_block_diagram
- Input: JSON array of signal chain blocks with type, label, RF params
- Layout: Left-to-right main chain, injection sources below with dashed connections
- Optional cumulative gain/NF annotation row
- Uses built-in mxGraph electrical shapes with consistent color coding

### create_emc_test_setup
- Input: JSON spec (standard, setup type, equipment list)
- Templates: CISPR 25 RE/CE, ISO 11452-2 RI, ISO 11452-4 CI
- Layout: Chamber/bench cross-section with proper distances

### create_pcb_stackup
- Input: JSON layer stack (copper, prepreg, core with thicknesses)
- Output: Cross-section diagram with material callouts

### markup_schematic
- Input: Image file path + annotation array [{x, y, type, text}]
- Output: draw.io diagram with image as locked background, annotations on foreground
- Annotation types: redline_circle, revision_cloud, delta_callout, arrow, text_note

### read_drawio
- Input: .drawio file path
- Output: Structured JSON (shapes, labels, positions, connections)
- Dep: fast-xml-parser

### export_drawio
- Input: XML + format (svg/png)
- Output: File path to exported image
- Dep: puppeteer-core (optional)

## File Structure

```
drawio-engineering-mcp/
├── package.json
├── LICENSE
├── docs/
│   ├── plans/
│   └── stencils/              (GitHub Pages served)
│       ├── rf-amplifiers-mixers.xml
│       └── ... (12 files)
├── src/
│   ├── index.js               (MCP server entry)
│   ├── core/
│   │   ├── compression.js
│   │   ├── browser.js
│   │   ├── xml-builder.js     (mxGraphModel XML utilities)
│   │   └── xml-parser.js      (for read_drawio)
│   ├── tools/
│   │   ├── open-xml.js
│   │   ├── open-csv.js
│   │   ├── open-mermaid.js
│   │   ├── open-engineering.js
│   │   ├── create-rf-block-diagram.js
│   │   ├── create-emc-test-setup.js
│   │   ├── create-pcb-stackup.js
│   │   ├── markup-schematic.js
│   │   ├── read-drawio.js
│   │   └── export-drawio.js
│   ├── generators/
│   │   ├── rf-signal-chain.js
│   │   ├── emc-setup.js
│   │   ├── pcb-stackup.js
│   │   └── layout.js          (shared auto-layout)
│   ├── stencils/
│   │   └── rf-blocks.xml      (legacy MVP, migrated to docs/)
│   └── data/
│       ├── rf-components.json
│       ├── emc-standards.json
│       └── pcb-materials.json
```

## Color Conventions

| Element | Color |
|---------|-------|
| RF signal paths | Blue (#0000FF) |
| DC power rails | Red (#FF0000) |
| Ground / return | Green (#009900) |
| Digital signals | Purple (#660099) |
| Controlled impedance | Orange (#FF6600) |
| Annotations | Dark gray (#333333) |
| Warnings | Yellow (#FFCC00) |

## Future Tools (post Phase 6)

- Network topology with RF/EE equipment icons
- Power distribution trees
- Test setup wiring diagrams
- Antenna radiation pattern overlays
- Mechanical enclosure cross-sections
