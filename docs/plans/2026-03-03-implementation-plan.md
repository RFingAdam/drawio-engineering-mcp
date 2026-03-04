# drawio-engineering-mcp Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the drawio-engineering-mcp from 4 tools / 30 stencils to 10 tools / 240 stencils with auto-layout generators, screenshot markup, and file I/O.

**Architecture:** Modular MCP server with tool definitions in `src/tools/`, auto-layout generators in `src/generators/`, stencil libraries hosted via GitHub raw URLs (public repo) in `docs/stencils/`, and shared XML builder utilities in `src/core/`. Each generator tool takes structured JSON input and produces complete mxGraphModel XML.

**Tech Stack:** Node.js ES modules, @modelcontextprotocol/sdk, pako (compression), fast-xml-parser (read_drawio), puppeteer-core (export_drawio, optional)

**Repo:** `~/projects/github/drawio-engineering-mcp`

**Symbols spec:** `~/projects/github/lte-throughput-tester/docs/drawio-engineering-symbols-spec.md`

---

## Task 1: Make Repo Public + Fix Stencil Hosting

GitHub Pages requires a paid plan for private repos. The repo is Apache-2.0 licensed with no sensitive content, so making it public is the simplest fix. Then raw.githubusercontent.com URLs work for stencil loading.

**Files:**
- Modify: `src/tools/open-engineering.js` (replace data URI with raw GitHub URL)
- Move: `src/stencils/rf-blocks.xml` -> `docs/stencils/rf-blocks.xml`

**Step 1: Make repo public**

```bash
cd ~/projects/github/drawio-engineering-mcp
gh repo edit --visibility public
```

**Step 2: Create docs/stencils/ and move the stencil file**

```bash
mkdir -p docs/stencils
mv src/stencils/rf-blocks.xml docs/stencils/rf-blocks.xml
rmdir src/stencils
```

**Step 3: Update open-engineering.js to use raw GitHub URLs**

Replace the entire `getStencilUrlParam` function and the `loadStencilLibrary` function. Remove the `fs`/`path` imports. The new approach uses raw.githubusercontent.com URLs in the `clibs` parameter:

```javascript
// Replace everything above the openEngineeringTool export with:

const STENCIL_BASE_URL = "https://raw.githubusercontent.com/RFingAdam/drawio-engineering-mcp/main/docs/stencils";

const STENCIL_LIBRARIES = {
  "rf-blocks": { file: "rf-blocks.xml", label: "RF Blocks" },
};

function getStencilUrlParam(requestedLibs) {
  const libs = [];
  for (const libName of requestedLibs) {
    const libInfo = STENCIL_LIBRARIES[libName];
    if (!libInfo) continue;
    libs.push(`U${STENCIL_BASE_URL}/${libInfo.file}`);
  }
  return libs.length > 0 ? libs.join(";") : null;
}
```

**Step 4: Push and verify raw URL works**

```bash
git add -A && git commit -m "Fix stencil hosting: use raw GitHub URLs instead of data URIs"
git push
# Verify:
curl -s -o /dev/null -w "%{http_code}" "https://raw.githubusercontent.com/RFingAdam/drawio-engineering-mcp/main/docs/stencils/rf-blocks.xml"
# Expected: 200
```

**Step 5: Test open_drawio_engineering**

Restart Claude session. Call `open_drawio_engineering` with minimal XML. Verify draw.io opens and the RF Blocks stencil library appears in the sidebar.

**Step 6: Commit**

```bash
git add -A
git commit -m "fix: use raw GitHub URLs for stencil hosting instead of data URIs

Data URIs exceeded browser URL length limit (~8KB). Raw GitHub URLs
are short and reliable for public repos.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

---

## Task 2: Create XML Builder Utility

Shared utility for all generator tools to produce mxGraphModel XML without hand-writing XML strings.

**Files:**
- Create: `src/core/xml-builder.js`

**Step 1: Write xml-builder.js**

This module provides a fluent API for building draw.io XML diagrams:

```javascript
// src/core/xml-builder.js

let nextId = 2; // 0 and 1 are reserved for root cells

export function resetIdCounter() {
  nextId = 2;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function createDiagram({ cells = [], width = 800, height = 600 } = {}) {
  resetIdCounter();
  const cellsXml = cells.map(c => cellToXml(c)).join("\n    ");
  return `<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    ${cellsXml}
  </root>
</mxGraphModel>`;
}

export function cell({ value = "", style = "", x = 0, y = 0, w = 80, h = 60, vertex = true, parent = "1", id = null }) {
  const cellId = id || String(nextId++);
  return { cellId, value, style, x, y, w, h, vertex, edge: false, parent };
}

export function edge({ value = "", style = "endArrow=block;endFill=1;strokeWidth=2;", source, target, parent = "1", id = null, points = [] }) {
  const cellId = id || String(nextId++);
  return { cellId, value, style, source, target, edge: true, vertex: false, parent, points };
}

function cellToXml(c) {
  if (c.edge) {
    let pointsXml = "";
    if (c.points && c.points.length > 0) {
      const pts = c.points.map(p => `<mxPoint x="${p.x}" y="${p.y}"/>`).join("");
      pointsXml = `<Array as="points">${pts}</Array>`;
    }
    return `<mxCell id="${c.cellId}" value="${escapeXml(c.value)}" style="${escapeXml(c.style)}" edge="1" parent="${c.parent}"${c.source ? ` source="${c.source}"` : ""}${c.target ? ` target="${c.target}"` : ""}>
      <mxGeometry relative="1" as="geometry">${pointsXml}</mxGeometry>
    </mxCell>`;
  }
  return `<mxCell id="${c.cellId}" value="${escapeXml(c.value)}" style="${escapeXml(c.style)}" vertex="1" parent="${c.parent}">
      <mxGeometry x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" as="geometry"/>
    </mxCell>`;
}
```

**Step 2: Verify it runs**

```bash
cd ~/projects/github/drawio-engineering-mcp
node -e "import { createDiagram, cell, edge } from './src/core/xml-builder.js'; const c1 = cell({value:'A',x:0,y:0}); const c2 = cell({value:'B',x:200,y:0}); const e1 = edge({source:c1.cellId,target:c2.cellId}); console.log(createDiagram({cells:[c1,c2,e1]}));"
```

Expected: Valid mxGraphModel XML output with 2 cells and 1 edge.

**Step 3: Commit**

```bash
git add src/core/xml-builder.js
git commit -m "feat: add XML builder utility for diagram generation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Build RF Signal Chain Generator

The core auto-layout engine for `create_rf_block_diagram`.

**Files:**
- Create: `src/generators/rf-signal-chain.js`
- Create: `src/generators/layout.js`
- Create: `src/data/rf-components.json`

**Step 1: Create shared layout utilities**

```javascript
// src/generators/layout.js

// Standard spacing for left-to-right signal chain layout
export const LAYOUT = {
  BLOCK_H_SPACING: 40,      // horizontal gap between blocks
  BLOCK_V_OFFSET: 120,      // vertical offset for injection sources (LO, clock)
  INJECT_V_GAP: 30,         // gap between main chain and injection row
  TITLE_Y: 20,              // title Y position
  CHAIN_Y: 100,             // main chain Y position
  ANNOTATION_Y_OFFSET: 80,  // cumulative annotation row below chain
  MARGIN_LEFT: 60,          // left margin
  MARGIN_TOP: 40,           // top margin
};

// Color conventions from design doc
export const COLORS = {
  amplifier:    { fill: "#d5e8d4", stroke: "#82b366" },  // green
  pa:           { fill: "#f8cecc", stroke: "#b85450" },  // red
  driver:       { fill: "#fff2cc", stroke: "#d6b656" },  // yellow
  filter:       { fill: "#dae8fc", stroke: "#6c8ebf" },  // blue
  mixer:        { fill: "#e1d5e7", stroke: "#9673a6" },  // purple
  oscillator:   { fill: "#e1d5e7", stroke: "#9673a6" },  // purple
  switch:       { fill: "#fff2cc", stroke: "#d6b656" },  // yellow
  attenuator:   { fill: "#f5f5f5", stroke: "#666666" },  // gray
  converter:    { fill: "#dae8fc", stroke: "#6c8ebf" },  // blue
  antenna:      { fill: "#d5e8d4", stroke: "#82b366" },  // green
  detector:     { fill: "#f5f5f5", stroke: "#666666" },  // gray
  passive:      { fill: "#f5f5f5", stroke: "#666666" },  // gray
  custom:       { fill: "#f5f5f5", stroke: "#333333" },  // dark gray
};

// Map block types to visual categories
export function getColorForType(type) {
  const map = {
    antenna: "antenna", lna: "amplifier", amplifier: "amplifier",
    pa: "pa", driver: "driver", buffer: "amplifier",
    bpf: "filter", lpf: "filter", hpf: "filter", notch: "filter",
    mixer: "mixer", iq_mixer: "mixer",
    vco: "oscillator", oscillator: "oscillator", pll: "oscillator",
    synthesizer: "oscillator", dds: "oscillator",
    attenuator: "attenuator", dsa: "attenuator",
    spdt: "switch", sp4t: "switch", switch: "switch",
    adc: "converter", dac: "converter",
    detector: "detector", log_det: "detector",
    coupler: "passive", splitter: "passive", combiner: "passive",
    circulator: "passive", isolator: "passive",
    balun: "passive", duplexer: "passive", diplexer: "passive",
    custom: "custom",
  };
  return COLORS[map[type] || "custom"];
}

// Map block types to draw.io shape styles
export function getShapeStyle(type) {
  const color = getColorForType(type);
  const base = `fillColor=${color.fill};strokeColor=${color.stroke};strokeWidth=2;fontSize=11;fontStyle=1;`;

  switch (type) {
    case "antenna":
      return `shape=mxgraph.electrical.signal_sources.signal_transducer;${base}`;
    case "lna": case "amplifier": case "pa": case "driver": case "buffer":
      return `shape=mxgraph.electrical.signal_sources.amplifier;flipH=0;${base}`;
    case "mixer": case "iq_mixer":
      return `ellipse;whiteSpace=wrap;${base}fontSize=16;`;
    case "bpf": case "lpf": case "hpf": case "notch":
      return `rounded=1;whiteSpace=wrap;arcSize=20;${base}`;
    case "adc":
      return `shape=trapezoid;whiteSpace=wrap;perimeter=trapezoidPerimeter;fixedSize=1;size=10;${base}`;
    case "dac":
      return `shape=trapezoid;whiteSpace=wrap;perimeter=trapezoidPerimeter;fixedSize=1;size=10;flipH=1;${base}`;
    case "vco": case "oscillator": case "pll": case "synthesizer": case "dds":
      return `ellipse;whiteSpace=wrap;${base}`;
    case "attenuator": case "dsa":
      return `rounded=1;whiteSpace=wrap;arcSize=15;${base}`;
    case "coupler": case "splitter": case "combiner":
      return `rounded=1;whiteSpace=wrap;arcSize=15;${base}`;
    case "circulator": case "isolator":
      return `ellipse;whiteSpace=wrap;${base}`;
    case "balun": case "duplexer": case "diplexer":
      return `rounded=1;whiteSpace=wrap;arcSize=15;${base}`;
    case "spdt": case "sp4t": case "switch":
      return `rounded=1;whiteSpace=wrap;arcSize=15;${base}`;
    case "detector": case "log_det":
      return `rounded=1;whiteSpace=wrap;arcSize=20;${base}`;
    default:
      return `rounded=1;whiteSpace=wrap;${base}`;
  }
}

// Get default dimensions for a block type
export function getBlockSize(type) {
  switch (type) {
    case "antenna":        return { w: 50, h: 60 };
    case "lna": case "amplifier": case "pa": case "driver": case "buffer":
                           return { w: 80, h: 60 };
    case "mixer": case "iq_mixer":
                           return { w: 60, h: 60 };
    case "bpf": case "lpf": case "hpf": case "notch":
                           return { w: 70, h: 40 };
    case "adc": case "dac":
                           return { w: 70, h: 40 };
    case "vco": case "oscillator":
                           return { w: 60, h: 50 };
    case "pll": case "synthesizer": case "dds":
                           return { w: 80, h: 40 };
    case "attenuator": case "dsa":
                           return { w: 60, h: 35 };
    case "coupler":        return { w: 60, h: 40 };
    case "splitter": case "combiner":
                           return { w: 60, h: 50 };
    case "circulator": case "isolator":
                           return { w: 50, h: 50 };
    case "balun":          return { w: 60, h: 40 };
    case "duplexer": case "diplexer":
                           return { w: 80, h: 50 };
    case "spdt": case "sp4t": case "switch":
                           return { w: 60, h: 40 };
    case "detector": case "log_det":
                           return { w: 60, h: 35 };
    default:               return { w: 80, h: 50 };
  }
}
```

**Step 2: Create RF component defaults**

```json
// src/data/rf-components.json
{
  "defaults": {
    "lna":        { "label": "LNA",  "gain_db": 20,  "nf_db": 1.5 },
    "pa":         { "label": "PA",   "gain_db": 30,  "p1db_dbm": 28 },
    "amplifier":  { "label": "AMP",  "gain_db": 15 },
    "driver":     { "label": "DRV",  "gain_db": 15 },
    "bpf":        { "label": "BPF",  "gain_db": -2 },
    "lpf":        { "label": "LPF",  "gain_db": -1 },
    "hpf":        { "label": "HPF",  "gain_db": -1.5 },
    "notch":      { "label": "Notch","gain_db": -1 },
    "mixer":      { "label": "X",    "gain_db": -7,  "nf_db": 7 },
    "attenuator": { "label": "ATT",  "gain_db": -6 },
    "dsa":        { "label": "DSA",  "gain_db": -3 },
    "adc":        { "label": "ADC" },
    "dac":        { "label": "DAC" },
    "vco":        { "label": "VCO" },
    "oscillator": { "label": "LO" },
    "pll":        { "label": "PLL" },
    "antenna":    { "label": "ANT" },
    "coupler":    { "label": "CPL",  "gain_db": -10 },
    "splitter":   { "label": "SPL",  "gain_db": -3 },
    "combiner":   { "label": "CMB",  "gain_db": -3 },
    "circulator": { "label": "CIR",  "gain_db": -0.5 },
    "isolator":   { "label": "ISO",  "gain_db": -1 },
    "balun":      { "label": "Balun","gain_db": -0.5 },
    "duplexer":   { "label": "DUP",  "gain_db": -2 },
    "diplexer":   { "label": "DPX",  "gain_db": -1.5 },
    "switch":     { "label": "SW",   "gain_db": -1 },
    "spdt":       { "label": "SPDT", "gain_db": -0.8 },
    "sp4t":       { "label": "SP4T", "gain_db": -1.2 },
    "detector":   { "label": "DET" },
    "custom":     { "label": "BLK" }
  }
}
```

**Step 3: Create the RF signal chain generator**

```javascript
// src/generators/rf-signal-chain.js

import { createDiagram, cell, edge } from "../core/xml-builder.js";
import { LAYOUT, getShapeStyle, getBlockSize } from "./layout.js";
import rfDefaults from "../data/rf-components.json" with { type: "json" };

export function generateRfBlockDiagram({ chain, title, show_cumulative = false, signal_flow_arrows = true }) {
  const cells = [];
  const mainChainBlocks = [];
  const injectionBlocks = [];

  // Separate main chain blocks from injection sources
  for (const block of chain) {
    if (block.inject_to) {
      injectionBlocks.push(block);
    } else {
      mainChainBlocks.push(block);
    }
  }

  // Add title
  if (title) {
    const titleCell = cell({
      value: title,
      style: "text;html=1;fontSize=16;fontStyle=1;align=center;verticalAlign=middle;",
      x: LAYOUT.MARGIN_LEFT,
      y: LAYOUT.MARGIN_TOP,
      w: 600,
      h: 30,
    });
    cells.push(titleCell);
  }

  // Layout main chain left-to-right
  let xPos = LAYOUT.MARGIN_LEFT;
  const chainY = title ? LAYOUT.CHAIN_Y : LAYOUT.MARGIN_TOP + 20;
  const blockCells = new Map(); // label -> cellId for injection connections

  for (let i = 0; i < mainChainBlocks.length; i++) {
    const block = mainChainBlocks[i];
    const defaults = rfDefaults.defaults[block.type] || rfDefaults.defaults.custom;
    const label = block.label || defaults.label;
    const size = getBlockSize(block.type);
    const style = getShapeStyle(block.type);

    // Build multi-line label
    let displayLabel = label;
    if (block.sublabel) {
      displayLabel += `\n${block.sublabel}`;
    }

    // For mixer, use "X" as the display symbol
    if ((block.type === "mixer" || block.type === "iq_mixer") && !block.label) {
      displayLabel = "X";
    }

    const blockCell = cell({
      value: displayLabel,
      style: style,
      x: xPos,
      y: chainY + (60 - size.h) / 2, // vertically center on chain line
      w: size.w,
      h: size.h,
    });

    blockCells.set(label, blockCell.cellId);
    cells.push(blockCell);

    // Add signal flow arrow to next block
    if (i < mainChainBlocks.length - 1 && signal_flow_arrows) {
      const nextSize = getBlockSize(mainChainBlocks[i + 1].type);
      const arrowCell = edge({
        style: "endArrow=block;endFill=1;strokeWidth=2;",
        source: blockCell.cellId,
        target: null, // will be set when next block is created
      });
      // Store for later source/target fixup
      arrowCell._nextIndex = i + 1;
      cells.push(arrowCell);
    }

    xPos += size.w + LAYOUT.BLOCK_H_SPACING;
  }

  // Fix up arrow targets (edges reference cells created in the loop)
  const mainCellIds = cells.filter(c => c.vertex && c.style !== "text;html=1;fontSize=16;fontStyle=1;align=center;verticalAlign=middle;").map(c => c.cellId);
  for (const c of cells) {
    if (c.edge && c._nextIndex !== undefined) {
      c.target = mainCellIds[c._nextIndex];
      delete c._nextIndex;
    }
  }

  // Layout injection sources below main chain
  for (const injBlock of injectionBlocks) {
    const defaults = rfDefaults.defaults[injBlock.type] || rfDefaults.defaults.custom;
    const label = injBlock.label || defaults.label;
    const size = getBlockSize(injBlock.type);
    const style = getShapeStyle(injBlock.type);
    const targetCellId = blockCells.get(injBlock.inject_to);

    // Find target block x position
    const targetCell = cells.find(c => c.cellId === targetCellId);
    const injX = targetCell ? targetCell.x + (targetCell.w - size.w) / 2 : LAYOUT.MARGIN_LEFT;
    const injY = chainY + 60 + LAYOUT.INJECT_V_GAP;

    let displayLabel = label;
    if (injBlock.sublabel) {
      displayLabel += `\n${injBlock.sublabel}`;
    }

    const injCell = cell({
      value: displayLabel,
      style: style,
      x: injX,
      y: injY,
      w: size.w,
      h: size.h,
    });
    cells.push(injCell);

    // Dashed arrow from injection source up to target
    if (targetCellId) {
      const injEdge = edge({
        value: "LO",
        style: "endArrow=block;endFill=1;strokeWidth=1.5;dashed=1;dashPattern=8 4;fontSize=10;",
        source: injCell.cellId,
        target: targetCellId,
      });
      cells.push(injEdge);
    }
  }

  // Cumulative gain/NF annotations
  if (show_cumulative) {
    let cumGain = 0;
    let cumNf = null;
    const annotY = chainY + 60 + (injectionBlocks.length > 0 ? LAYOUT.BLOCK_V_OFFSET + 20 : LAYOUT.ANNOTATION_Y_OFFSET);

    let aXPos = LAYOUT.MARGIN_LEFT;
    for (let i = 0; i < mainChainBlocks.length; i++) {
      const block = mainChainBlocks[i];
      const defaults = rfDefaults.defaults[block.type] || rfDefaults.defaults.custom;
      const gain = block.gain_db ?? defaults.gain_db ?? 0;
      const nf = block.nf_db ?? defaults.nf_db;
      const size = getBlockSize(block.type);

      cumGain += gain;

      // Friis formula for cumulative NF
      if (i === 0 && nf !== undefined) {
        cumNf = nf;
      } else if (nf !== undefined && cumNf !== null) {
        const prevGainLinear = Math.pow(10, (cumGain - gain) / 10);
        const nfLinear = Math.pow(10, nf / 10);
        const cumNfLinear = Math.pow(10, cumNf / 10);
        cumNf = 10 * Math.log10(cumNfLinear + (nfLinear - 1) / prevGainLinear);
      }

      let annotText = `G: ${cumGain >= 0 ? "+" : ""}${cumGain.toFixed(1)} dB`;
      if (cumNf !== null) {
        annotText += `\nNF: ${cumNf.toFixed(1)} dB`;
      }

      const annotCell = cell({
        value: annotText,
        style: "text;html=1;fontSize=9;align=center;verticalAlign=top;fontColor=#666666;",
        x: aXPos,
        y: annotY,
        w: size.w,
        h: 30,
      });
      cells.push(annotCell);

      aXPos += size.w + LAYOUT.BLOCK_H_SPACING;
    }
  }

  return createDiagram({ cells });
}
```

**Step 4: Verify generator runs**

```bash
cd ~/projects/github/drawio-engineering-mcp
node -e "
import { generateRfBlockDiagram } from './src/generators/rf-signal-chain.js';
const xml = generateRfBlockDiagram({
  title: 'Test RX Chain',
  chain: [
    { type: 'antenna', label: 'ANT' },
    { type: 'bpf', label: 'BPF1', gain_db: -2 },
    { type: 'lna', label: 'LNA', gain_db: 20, nf_db: 1.2 },
    { type: 'mixer', label: 'MIX', gain_db: -7, inject_to: null },
    { type: 'oscillator', label: 'LO1', sublabel: '1200 MHz', inject_to: 'MIX' },
    { type: 'adc', label: 'ADC' }
  ],
  show_cumulative: true
});
console.log(xml);
"
```

Expected: Valid mxGraphModel XML with positioned blocks, arrows, and annotations.

**Step 5: Commit**

```bash
git add src/generators/ src/data/
git commit -m "feat: add RF signal chain generator with auto-layout

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Build create_rf_block_diagram Tool

Wire the generator into an MCP tool and register it.

**Files:**
- Create: `src/tools/create-rf-block-diagram.js`
- Modify: `src/index.js` (add import and registration)
- Modify: `src/index.js` (refactor handler to support tools that generate their own content)

**Step 1: Create the tool definition**

```javascript
// src/tools/create-rf-block-diagram.js

import { generateRfBlockDiagram } from "../generators/rf-signal-chain.js";

export const createRfBlockDiagramTool = {
  name: "create_rf_block_diagram",
  description:
    "Creates an RF signal chain block diagram from a JSON description. " +
    "Specify blocks in order (left to right) with type, label, and RF parameters. " +
    "Injection sources (LO, clock) are placed below the main chain with dashed connections. " +
    "Supported block types: antenna, lna, pa, amplifier, driver, buffer, bpf, lpf, hpf, notch, " +
    "mixer, iq_mixer, vco, oscillator, pll, synthesizer, dds, attenuator, dsa, adc, dac, " +
    "coupler, splitter, combiner, circulator, isolator, balun, duplexer, diplexer, " +
    "spdt, sp4t, switch, detector, log_det, custom. " +
    "For injection sources (e.g., LO feeding a mixer), set inject_to to the label of the target block.",
  inputSchema: {
    type: "object",
    properties: {
      chain: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", description: "Block type (lna, bpf, mixer, etc.)" },
            label: { type: "string", description: "Display label (e.g., 'LNA1')" },
            sublabel: { type: "string", description: "Second line (e.g., part number 'SKY67151')" },
            gain_db: { type: "number", description: "Gain in dB (negative for loss)" },
            nf_db: { type: "number", description: "Noise figure in dB" },
            p1db_dbm: { type: "number", description: "Output P1dB in dBm" },
            freq_mhz: { type: "string", description: "Frequency or range (e.g., '700-960')" },
            inject_to: { type: "string", description: "Label of the target block this injects into (for LO, clock sources)" },
          },
          required: ["type"],
        },
        description: "Ordered signal chain blocks from left to right. Injection sources (with inject_to) are placed below.",
      },
      title: { type: "string", description: "Diagram title" },
      show_cumulative: { type: "boolean", description: "Show cumulative gain/NF below the chain. Default: false" },
      signal_flow_arrows: { type: "boolean", description: "Show directional arrows between blocks. Default: true" },
      auto_open: { type: "boolean", description: "Open in draw.io browser. Default: true. Set false to return XML only." },
    },
    required: ["chain"],
  },
  type: "xml",
  isGenerator: true,
  generate(args) {
    return generateRfBlockDiagram({
      chain: args.chain,
      title: args.title,
      show_cumulative: args.show_cumulative ?? false,
      signal_flow_arrows: args.signal_flow_arrows ?? true,
    });
  },
};
```

**Step 2: Update index.js to handle generator tools**

The current handler assumes all tools take a `content` parameter. Generator tools produce their own content. Refactor the `CallToolRequestSchema` handler:

In `src/index.js`, add the import:
```javascript
import { createRfBlockDiagramTool } from "./tools/create-rf-block-diagram.js";
```

Update `allTools`:
```javascript
const allTools = [openXmlTool, openCsvTool, openMermaidTool, openEngineeringTool, createRfBlockDiagramTool];
```

Refactor the handler to support both passthrough and generator tools:
```javascript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const tool = toolMap.get(name);
    if (!tool) {
      return {
        content: [{ type: "text", text: `Error: Unknown tool "${name}"` }],
        isError: true,
      };
    }

    let xmlContent;

    if (tool.isGenerator) {
      // Generator tools produce their own XML content
      xmlContent = tool.generate(args);

      if (args?.auto_open === false) {
        return {
          content: [{ type: "text", text: xmlContent }],
        };
      }
    } else {
      // Passthrough tools require content parameter
      xmlContent = args?.content;
      if (!xmlContent) {
        return {
          content: [{ type: "text", text: "Error: content parameter is required" }],
          isError: true,
        };
      }
    }

    const lightbox = args?.lightbox === true;
    const darkArg = args?.dark;
    const dark = darkArg === "true" ? true : darkArg === "false" ? false : "auto";
    const extraParams = tool.getExtraParams ? tool.getExtraParams(args) : {};

    const url = generateDrawioUrl(xmlContent, tool.type, { lightbox, dark, extraParams });
    openBrowser(url);

    let responseText = `Draw.io Editor URL:\n${url}\n\nThe diagram has been opened in your default browser.`;
    if (name === "open_drawio_engineering" && extraParams.clibs) {
      responseText += "\n\nEngineering stencil libraries have been loaded in the sidebar.";
    }
    if (tool.isGenerator) {
      responseText += "\n\nGenerated XML:\n" + xmlContent;
    }

    return {
      content: [{ type: "text", text: responseText }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});
```

**Step 3: Test end-to-end**

```bash
cd ~/projects/github/drawio-engineering-mcp
timeout 3 node src/index.js 2>&1 || true
# Expected: "drawio-engineering-mcp server running on stdio" then timeout
```

**Step 4: Commit**

```bash
git add src/tools/create-rf-block-diagram.js src/index.js
git commit -m "feat: add create_rf_block_diagram MCP tool

JSON signal chain input -> auto-layout RF block diagram in draw.io.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Expand Stencil Library (30 -> 240 symbols)

Build the full stencil library per `~/projects/github/lte-throughput-tester/docs/drawio-engineering-symbols-spec.md`. Split into 12 XML files in `docs/stencils/`.

**Files:**
- Create: `docs/stencils/rf-amplifiers-mixers.xml` (16 symbols)
- Create: `docs/stencils/rf-filters-attenuators.xml` (17 symbols)
- Create: `docs/stencils/rf-passive-components.xml` (14 symbols)
- Create: `docs/stencils/rf-sources-oscillators.xml` (10 symbols)
- Create: `docs/stencils/rf-switches-detectors.xml` (15 symbols)
- Create: `docs/stencils/rf-antennas-txlines.xml` (20 symbols)
- Create: `docs/stencils/ee-power-ics.xml` (20 symbols)
- Create: `docs/stencils/ee-connectors.xml` (14 symbols)
- Create: `docs/stencils/ee-test-equipment-emc.xml` (18 symbols)
- Create: `docs/stencils/pcb-stackup-vias.xml` (30 symbols)
- Create: `docs/stencils/wireless-telecom.xml` (28 symbols)
- Create: `docs/stencils/general-engineering.xml` (38 symbols)
- Modify: `src/tools/open-engineering.js` (update STENCIL_LIBRARIES with all 12 entries)

**Implementation note:** Each file follows the `<mxlibrary>[...]</mxlibrary>` format. Each symbol is an mxGraphModel XML fragment wrapped in the JSON array. Use draw.io's built-in electrical shapes where available (e.g., `shape=mxgraph.electrical.resistors.resistor_1` for resistors) and styled primitives (rounded rectangles, triangles, ellipses) for RF-specific blocks. Follow the symbols spec for visual descriptions.

**Step 1:** Create all 12 stencil files. Each symbol entry needs: `xml` (escaped mxGraphModel), `w`, `h`, `title`, `aspect`. Reference the symbols spec for exact visual descriptions.

**Step 2:** Update `open-engineering.js` STENCIL_LIBRARIES:

```javascript
const STENCIL_LIBRARIES = {
  "rf-amplifiers-mixers":    { file: "rf-amplifiers-mixers.xml",    label: "RF Amplifiers & Mixers" },
  "rf-filters-attenuators":  { file: "rf-filters-attenuators.xml",  label: "RF Filters & Attenuators" },
  "rf-passive-components":   { file: "rf-passive-components.xml",   label: "RF Passive Components" },
  "rf-sources-oscillators":  { file: "rf-sources-oscillators.xml",  label: "RF Sources & Oscillators" },
  "rf-switches-detectors":   { file: "rf-switches-detectors.xml",   label: "RF Switches & Detectors" },
  "rf-antennas-txlines":     { file: "rf-antennas-txlines.xml",     label: "RF Antennas & TX Lines" },
  "ee-power-ics":            { file: "ee-power-ics.xml",            label: "EE Power & ICs" },
  "ee-connectors":           { file: "ee-connectors.xml",           label: "EE Connectors" },
  "ee-test-equipment-emc":   { file: "ee-test-equipment-emc.xml",   label: "Test Equipment & EMC" },
  "pcb-stackup-vias":        { file: "pcb-stackup-vias.xml",        label: "PCB Stackup & Vias" },
  "wireless-telecom":        { file: "wireless-telecom.xml",        label: "Wireless & Telecom" },
  "general-engineering":     { file: "general-engineering.xml",      label: "General Engineering" },
  "rf-blocks":               { file: "rf-blocks.xml",               label: "RF Blocks (Legacy)" },
};
```

Update the `stencils` input schema enum to include all library names.

**Step 3:** Push and verify raw URLs work for each file.

**Step 4: Commit**

```bash
git add docs/stencils/ src/tools/open-engineering.js
git commit -m "feat: expand stencil library to 240 symbols across 12 files

Covers RF, EE, PCB/SI, wireless/telecom, and general engineering.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

---

## Task 6: Build create_emc_test_setup Tool

Generator tool for EMC test setup diagrams (CISPR 25, ISO 11452, etc.).

**Files:**
- Create: `src/generators/emc-setup.js`
- Create: `src/tools/create-emc-test-setup.js`
- Create: `src/data/emc-standards.json`
- Modify: `src/index.js` (register tool)

**Step 1: Create EMC standards data**

```json
// src/data/emc-standards.json
{
  "templates": {
    "cispr25_re": {
      "name": "CISPR 25 Radiated Emissions",
      "equipment": ["eut", "eut_table", "antenna", "antenna_mast", "spectrum_analyzer", "lisn", "ground_plane"],
      "distances": { "antenna_to_eut_m": 1.0, "eut_height_m": 0.05, "antenna_height_range_m": [1, 4] },
      "notes": "Semi-anechoic chamber. Antenna 1m from EUT. 150 kHz to 2.5 GHz."
    },
    "cispr25_ce": {
      "name": "CISPR 25 Conducted Emissions",
      "equipment": ["eut", "lisn", "spectrum_analyzer", "ground_plane"],
      "distances": { "lisn_to_eut_m": 0.2 },
      "notes": "LISN on each power line. 150 kHz to 108 MHz."
    },
    "iso11452_2_ri": {
      "name": "ISO 11452-2 Radiated Immunity",
      "equipment": ["eut", "eut_table", "antenna", "signal_generator", "power_amplifier", "power_meter", "ground_plane"],
      "distances": { "antenna_to_eut_m": 1.0 },
      "notes": "Absorber-lined shielded enclosure. 200 MHz to 18 GHz."
    },
    "iso11452_4_ci": {
      "name": "ISO 11452-4 Conducted Immunity (BCI)",
      "equipment": ["eut", "bci_probe", "signal_generator", "power_amplifier", "power_meter", "ground_plane"],
      "distances": { "probe_to_eut_m": 0.15 },
      "notes": "BCI clamp on harness. 1 MHz to 400 MHz."
    }
  }
}
```

**Step 2: Create the EMC setup generator**

The generator reads the template, lays out equipment in a cross-section view (ground plane at bottom, EUT on table, antenna on mast, instruments on the side), with proper distance annotations.

```javascript
// src/generators/emc-setup.js
import { createDiagram, cell, edge } from "../core/xml-builder.js";
import emcData from "../data/emc-standards.json" with { type: "json" };
// ... layout logic for each template type
```

**Step 3: Create the tool, register in index.js, test, commit**

Same pattern as Task 4.

---

## Task 7: Build create_pcb_stackup Tool

Generator tool for PCB cross-section stackup diagrams.

**Files:**
- Create: `src/generators/pcb-stackup.js`
- Create: `src/tools/create-pcb-stackup.js`
- Create: `src/data/pcb-materials.json`
- Modify: `src/index.js` (register tool)

**Step 1: Create PCB materials data**

```json
// src/data/pcb-materials.json
{
  "materials": {
    "fr4": { "name": "FR-4", "dk": 4.2, "df": 0.02 },
    "rogers_4003c": { "name": "Rogers 4003C", "dk": 3.55, "df": 0.0027 },
    "rogers_4350b": { "name": "Rogers 4350B", "dk": 3.66, "df": 0.0037 },
    "megtron6": { "name": "Megtron 6", "dk": 3.71, "df": 0.002 },
    "isola_370hr": { "name": "Isola 370HR", "dk": 3.92, "df": 0.025 }
  },
  "copper_weights": {
    "0.5oz": 0.0175,
    "1oz": 0.035,
    "2oz": 0.070
  },
  "templates": {
    "4layer": {
      "layers": [
        { "type": "copper", "name": "L1 Signal", "weight": "1oz" },
        { "type": "prepreg", "material": "fr4", "thickness_mm": 0.2 },
        { "type": "copper", "name": "L2 GND", "weight": "1oz" },
        { "type": "core", "material": "fr4", "thickness_mm": 0.8 },
        { "type": "copper", "name": "L3 PWR", "weight": "1oz" },
        { "type": "prepreg", "material": "fr4", "thickness_mm": 0.2 },
        { "type": "copper", "name": "L4 Signal", "weight": "1oz" }
      ]
    }
  }
}
```

**Step 2:** Create the PCB stackup generator. Renders a cross-section view with colored rectangles for each layer, annotations for thickness, Dk, and impedance.

**Step 3:** Create tool, register, test, commit. Same pattern as Tasks 4/6.

---

## Task 8: Build markup_schematic Tool

Tool for annotating schematic screenshots with engineering redlines.

**Files:**
- Create: `src/tools/markup-schematic.js`
- Modify: `src/index.js` (register tool)

**Step 1: Create the tool**

The tool:
1. Reads an image file from the provided path
2. Base64-encodes it
3. Creates an mxGraphModel with the image as a locked background layer
4. Adds annotation shapes (redline circles, revision clouds, callouts, arrows, text notes) on a foreground layer
5. Opens in draw.io

```javascript
// src/tools/markup-schematic.js
import { readFileSync } from "fs";
import { basename, extname } from "path";
import { createDiagram, cell, edge } from "../core/xml-builder.js";

export const markupSchematicTool = {
  name: "markup_schematic",
  description:
    "Opens a schematic screenshot in draw.io with engineering annotations overlaid. " +
    "The original image becomes a locked background layer. Annotations (redline circles, " +
    "revision clouds, delta callouts, arrows, text notes) are placed on a foreground layer. " +
    "Use this to mark up existing schematics with proposed changes, issues, or review comments.",
  inputSchema: {
    type: "object",
    properties: {
      image_path: {
        type: "string",
        description: "Absolute path to the schematic image file (PNG, JPG, etc.)",
      },
      annotations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["redline_circle", "revision_cloud", "delta_callout", "arrow", "text_note"],
              description: "Annotation type",
            },
            x: { type: "number", description: "X position (pixels from left)" },
            y: { type: "number", description: "Y position (pixels from top)" },
            w: { type: "number", description: "Width (for circles/clouds)" },
            h: { type: "number", description: "Height (for circles/clouds)" },
            text: { type: "string", description: "Annotation text" },
            target_x: { type: "number", description: "Arrow target X (for arrows)" },
            target_y: { type: "number", description: "Arrow target Y (for arrows)" },
            color: { type: "string", description: "Annotation color. Default: #FF0000 (red)" },
          },
          required: ["type", "x", "y"],
        },
        description: "Array of annotations to overlay on the schematic",
      },
      title: { type: "string", description: "Optional title for the markup" },
      image_width: { type: "number", description: "Display width of the image. Default: auto-detect or 800" },
      image_height: { type: "number", description: "Display height of the image. Default: auto-detect or 600" },
    },
    required: ["image_path", "annotations"],
  },
  type: "xml",
  isGenerator: true,
  generate(args) {
    const { image_path, annotations, title, image_width = 800, image_height = 600 } = args;

    // Read and base64-encode the image
    const imageData = readFileSync(image_path);
    const ext = extname(image_path).slice(1).toLowerCase();
    const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    const base64 = imageData.toString("base64");
    const dataUri = `data:${mimeType};base64,${base64}`;

    const cells = [];

    // Background image (locked layer)
    const imgCell = cell({
      value: "",
      style: `shape=image;image=${dataUri};imageAspect=0;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;`,
      x: 0,
      y: title ? 40 : 0,
      w: image_width,
      h: image_height,
    });
    cells.push(imgCell);

    // Title
    if (title) {
      cells.push(cell({
        value: title,
        style: "text;html=1;fontSize=14;fontStyle=1;align=left;verticalAlign=middle;",
        x: 0, y: 0, w: 400, h: 30,
      }));
    }

    // Annotations
    const offsetY = title ? 40 : 0;
    for (const ann of annotations) {
      const color = ann.color || "#FF0000";
      const x = ann.x;
      const y = ann.y + offsetY;

      switch (ann.type) {
        case "redline_circle":
          cells.push(cell({
            value: ann.text || "",
            style: `ellipse;whiteSpace=wrap;fillColor=none;strokeColor=${color};strokeWidth=3;fontColor=${color};fontSize=10;fontStyle=1;`,
            x, y, w: ann.w || 60, h: ann.h || 60,
          }));
          break;
        case "revision_cloud":
          cells.push(cell({
            value: ann.text || "",
            style: `shape=mxgraph.basic.cloud_callout;fillColor=none;strokeColor=${color};strokeWidth=2;fontColor=${color};fontSize=10;fontStyle=1;`,
            x, y, w: ann.w || 120, h: ann.h || 80,
          }));
          break;
        case "delta_callout":
          cells.push(cell({
            value: `\u0394 ${ann.text || ""}`,
            style: `shape=callout;whiteSpace=wrap;fillColor=#FFF2CC;strokeColor=${color};strokeWidth=2;fontColor=#333333;fontSize=10;fontStyle=1;perimeter=calloutPerimeter;size=10;position=0.5;position2=1;base=20;`,
            x, y, w: ann.w || 140, h: ann.h || 60,
          }));
          break;
        case "arrow":
          cells.push(edge({
            value: ann.text || "",
            style: `endArrow=open;strokeColor=${color};strokeWidth=3;fontColor=${color};fontSize=10;fontStyle=1;`,
            source: null,
            target: null,
            points: [{ x, y }, { x: ann.target_x || x + 100, y: ann.target_y || y }],
          }));
          break;
        case "text_note":
          cells.push(cell({
            value: ann.text || "",
            style: `text;html=1;fillColor=#FFF2CC;strokeColor=${color};strokeWidth=1;fontColor=#333333;fontSize=10;fontStyle=0;rounded=1;arcSize=10;`,
            x, y, w: ann.w || 150, h: ann.h || 40,
          }));
          break;
      }
    }

    return createDiagram({ cells });
  },
};
```

**Step 2:** Register in index.js, test, commit. Same pattern.

---

## Task 9: Build read_drawio Tool

Parse `.drawio` files and return structured JSON.

**Files:**
- Create: `src/core/xml-parser.js`
- Create: `src/tools/read-drawio.js`
- Modify: `src/index.js` (register tool)
- Modify: `package.json` (add `fast-xml-parser` dependency)

**Step 1: Install dependency**

```bash
cd ~/projects/github/drawio-engineering-mcp
npm install fast-xml-parser
```

**Step 2: Create XML parser**

```javascript
// src/core/xml-parser.js
import { XMLParser } from "fast-xml-parser";
import { readFileSync } from "fs";
import pako from "pako";

export function parseDrawioFile(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const parsed = parser.parse(raw);

  // .drawio files wrap mxGraphModel in <mxfile><diagram>
  // The diagram content may be compressed
  const mxfile = parsed.mxfile;
  if (!mxfile) {
    // Might be raw mxGraphModel
    return extractCells(parsed);
  }

  const diagrams = Array.isArray(mxfile.diagram) ? mxfile.diagram : [mxfile.diagram];
  const result = [];

  for (const diagram of diagrams) {
    const name = diagram["@_name"] || "Page";
    let content = diagram["#text"] || diagram.mxGraphModel;

    if (typeof content === "string") {
      // Compressed content: base64 -> inflate -> URL-decode
      try {
        const binary = Buffer.from(content, "base64");
        const inflated = pako.inflateRaw(binary, { to: "string" });
        const decoded = decodeURIComponent(inflated);
        const innerParsed = parser.parse(decoded);
        result.push({ name, ...extractCells(innerParsed) });
      } catch {
        result.push({ name, cells: [], error: "Could not decompress diagram content" });
      }
    } else {
      result.push({ name, ...extractCells({ mxGraphModel: content }) });
    }
  }

  return result;
}

function extractCells(parsed) {
  const model = parsed.mxGraphModel;
  if (!model) return { cells: [] };

  const root = model.root;
  if (!root) return { cells: [] };

  const rawCells = Array.isArray(root.mxCell) ? root.mxCell : [root.mxCell].filter(Boolean);

  const cells = rawCells
    .filter(c => c["@_id"] !== "0" && c["@_id"] !== "1")
    .map(c => {
      const geo = c.mxGeometry || {};
      return {
        id: c["@_id"],
        value: c["@_value"] || "",
        style: c["@_style"] || "",
        vertex: c["@_vertex"] === "1",
        edge: c["@_edge"] === "1",
        source: c["@_source"] || null,
        target: c["@_target"] || null,
        x: parseFloat(geo["@_x"]) || 0,
        y: parseFloat(geo["@_y"]) || 0,
        width: parseFloat(geo["@_width"]) || 0,
        height: parseFloat(geo["@_height"]) || 0,
      };
    });

  return { cells };
}
```

**Step 3: Create the tool**

```javascript
// src/tools/read-drawio.js
import { parseDrawioFile } from "../core/xml-parser.js";

export const readDrawioTool = {
  name: "read_drawio",
  description:
    "Reads and parses a .drawio file, returning structured JSON with all shapes, " +
    "labels, positions, styles, and connections. Use this to understand an existing " +
    "diagram before modifying it or to extract information from diagrams.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Absolute path to the .drawio file",
      },
    },
    required: ["file_path"],
  },
  isReader: true,
  read(args) {
    return parseDrawioFile(args.file_path);
  },
};
```

**Step 4:** Register in index.js. The handler needs a new branch for `isReader` tools that return JSON instead of opening a browser:

```javascript
if (tool.isReader) {
  const result = tool.read(args);
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}
```

**Step 5:** Test with any `.drawio` file, commit.

---

## Task 10: Build export_drawio Tool

Headless export of draw.io diagrams to SVG/PNG.

**Files:**
- Create: `src/tools/export-drawio.js`
- Modify: `src/index.js` (register tool)
- Modify: `package.json` (add `puppeteer-core` as optional dependency)

**Step 1: Install optional dependency**

```bash
cd ~/projects/github/drawio-engineering-mcp
npm install puppeteer-core
```

**Step 2: Create the tool**

```javascript
// src/tools/export-drawio.js
import { writeFileSync } from "fs";
import { compressData } from "../core/compression.js";

export const exportDrawioTool = {
  name: "export_drawio",
  description:
    "Exports a draw.io diagram to SVG or PNG file. Requires puppeteer/Chrome to be installed. " +
    "Takes diagram XML content and an output file path. Returns the path to the exported file.",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The draw.io XML content in mxGraphModel format",
      },
      output_path: {
        type: "string",
        description: "Absolute path for the output file (e.g., /tmp/diagram.svg)",
      },
      format: {
        type: "string",
        enum: ["svg", "png"],
        description: "Export format. Default: svg",
      },
    },
    required: ["content", "output_path"],
  },
  isExporter: true,
  async export(args) {
    const { content, output_path, format = "svg" } = args;

    let puppeteer;
    try {
      puppeteer = await import("puppeteer-core");
    } catch {
      try {
        puppeteer = await import("puppeteer");
      } catch {
        throw new Error("puppeteer or puppeteer-core is required for export. Install with: npm install puppeteer");
      }
    }

    const compressed = compressData(content);
    const createObj = JSON.stringify({ type: "xml", compressed: true, data: compressed });
    const url = `https://app.diagrams.net/?embed=1&spin=1&proto=json#create=${encodeURIComponent(createObj)}`;

    const browser = await puppeteer.default.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

      // Wait for draw.io to render
      await page.waitForTimeout(3000);

      if (format === "svg") {
        // Extract SVG from the draw.io canvas
        const svgContent = await page.evaluate(() => {
          const svg = document.querySelector("svg.geDiagramContainer");
          return svg ? svg.outerHTML : null;
        });
        if (svgContent) {
          writeFileSync(output_path, svgContent);
        } else {
          throw new Error("Could not extract SVG from draw.io");
        }
      } else {
        // PNG screenshot
        await page.screenshot({ path: output_path, fullPage: true });
      }
    } finally {
      await browser.close();
    }

    return output_path;
  },
};
```

**Step 3:** Register in index.js with async handler support. The handler needs:

```javascript
if (tool.isExporter) {
  const outputPath = await tool.export(args);
  return {
    content: [{ type: "text", text: `Exported diagram to: ${outputPath}` }],
  };
}
```

**Step 4:** Test, commit.

---

## Task 11: Final Integration, Push, and Verify

**Files:**
- Modify: `src/index.js` (ensure all 10 tools registered)
- Modify: `package.json` (verify all deps)

**Step 1: Verify all tools are registered**

```bash
cd ~/projects/github/drawio-engineering-mcp
node -e "
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// Quick count of imports
const toolFiles = ['open-xml','open-csv','open-mermaid','open-engineering','create-rf-block-diagram','create-emc-test-setup','create-pcb-stackup','markup-schematic','read-drawio','export-drawio'];
console.log('Expected tools:', toolFiles.length);
"
```

**Step 2: Test MCP server starts with all tools**

```bash
timeout 3 node src/index.js 2>&1 || true
# Expected: "drawio-engineering-mcp server running on stdio"
```

**Step 3: Update Claude MCP config (if needed)**

```bash
claude mcp list 2>&1 | grep drawio
# If not present:
claude mcp add drawio-engineering -s user -- node ~/projects/github/drawio-engineering-mcp/src/index.js
```

**Step 4: Push everything**

```bash
git push
```

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete expansion to 10 tools, 240 symbols

Phase 1.5: Fix stencil hosting via public GitHub raw URLs
Phase 2: create_rf_block_diagram (JSON -> auto-layout RF chain)
Phase 3: create_emc_test_setup (CISPR/ISO template generator)
Phase 4: create_pcb_stackup (PCB cross-section generator)
Phase 5: markup_schematic (image + redline annotations)
Phase 6: read_drawio + export_drawio (file I/O)
Stencils: 30 -> 240 symbols across 12 library files

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

**Step 6: Verify in new Claude session**

1. Start new Claude Code session
2. Confirm all 10 tools appear
3. Test `create_rf_block_diagram` with a simple chain
4. Test `open_drawio_engineering` with stencils from GitHub raw URL
5. Test `markup_schematic` with a sample screenshot
