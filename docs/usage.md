# Usage

A practical walkthrough: building an RF receiver block diagram, then
exporting it for a design review packet. For the full tool reference,
see [Tools](tools.md).

---

## Scenario: design-review packet for a 2.4 GHz receiver

You're about to walk into a design review for a 2.4 GHz Bluetooth
receiver. You need: (1) an annotated RF block diagram with Friis
cascade math, (2) a 6-layer PCB stackup cross-section, (3) a CISPR 25
radiated-emissions test setup diagram for the lab plan.

## Setup

```bash
git clone https://github.com/RFingAdam/drawio-engineering-mcp.git
cd drawio-engineering-mcp
npm install
```

Register with Claude Desktop:

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

Restart your MCP client.

## Step 1 — RF block diagram with cascade

Ask the assistant:

> *"Create a 2.4 GHz Bluetooth receiver block diagram: chip antenna,
> SAW BPF, LNA (15 dB gain, 1.2 dB NF), I/Q demodulator with PLL LO,
> baseband LPF, ADC. Show cumulative gain and noise figure."*

The agent calls `create_rf_block_diagram` with:

```json
{
  "frequency_ghz": 2.45,
  "blocks": [
    { "type": "antenna",  "name": "Chip ANT",   "gain_db": 0,   "nf_db": 0 },
    { "type": "filter",   "name": "SAW BPF",    "gain_db": -1.5,"nf_db": 1.5 },
    { "type": "lna",      "name": "LNA",        "gain_db": 15,  "nf_db": 1.2 },
    { "type": "mixer",    "name": "I/Q Demod",  "gain_db": -8,  "nf_db": 9 },
    { "type": "filter",   "name": "BB LPF",     "gain_db": -1,  "nf_db": 1 },
    { "type": "adc",      "name": "ADC",        "gain_db": 0,   "nf_db": 0 }
  ]
}
```

draw.io opens with the chain laid out left-to-right, each block
labeled, and a cascade table annotating cumulative gain (`+3.5 dB` at
the ADC input) and noise figure (`2.6 dB` system NF via Friis).

## Step 2 — PCB stackup cross-section

> *"Generate a 6-layer 1.6 mm PCB stackup with Rogers 4003C for the RF
> layer pair and FR-4 for the rest."*

`create_pcb_stackup` returns a color-coded cross-section with material
Dk / Df annotations:

```
Top    | Cu 35 µm | signal (RF)
Prepreg| RO4003C  | 0.2 mm   Dk=3.55 Df=0.0027
L2     | Cu 35 µm | RF ground
Core   | FR-4     | 0.4 mm   Dk=4.4  Df=0.02
...
```

## Step 3 — CISPR 25 EMC test setup

> *"Show me a CISPR 25 radiated emissions test setup for a wireless
> receiver module."*

`create_emc_test_setup` with `template="cispr25_re"` opens draw.io
with the standard CISPR 25 ALSE diagram: ground plane, DUT location,
biconical / log-periodic antenna at 1 m, LISN, harness routing,
absorber wall positions — all labeled per the standard.

## Step 4 — Export everything to SVG

> *"Export all three diagrams to SVG into ./review/."*

The agent calls `export_drawio` three times. You drop the resulting
SVGs into the design-review deck.

---

## What just happened

In four prompts you've gone from "design review tomorrow" to three
production-quality engineering diagrams with the math already annotated
on them. The Friis cascade, the stackup material properties, and the
CISPR 25 setup geometry are all encoded in the generators — you don't
have to remember which way the antenna points or which Df FR-4 uses.

- For more tools: [Tool reference](tools.md)
- For how this fits in the suite: [Architecture](architecture.md)
- For sibling MCPs that compose with this one: [eng-mcp-suite catalog](https://github.com/RFingAdam/eng-mcp-suite#whats-included)
