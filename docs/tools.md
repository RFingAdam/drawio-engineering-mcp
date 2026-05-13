# Tools

`drawio-engineering-mcp` exposes 10 MCP tools. Tools are registered
under the `drawio-engineering` namespace when the server is loaded by an
MCP client. Tool source lives in
[`src/tools/`](https://github.com/RFingAdam/drawio-engineering-mcp/tree/main/src/tools).

## Tool index

| Tool                       | Category          | Purpose                                                                 |
| -------------------------- | ----------------- | ----------------------------------------------------------------------- |
| [`open_drawio_xml`](#open_drawio_xml)               | Viewer / editor | Open draw.io with raw XML content                  |
| [`open_drawio_csv`](#open_drawio_csv)               | Viewer / editor | Open draw.io with CSV data                         |
| [`open_drawio_mermaid`](#open_drawio_mermaid)       | Viewer / editor | Open draw.io with Mermaid syntax                   |
| [`open_drawio_engineering`](#open_drawio_engineering) | Viewer / editor | Open draw.io with engineering stencils sidebar |
| [`create_rf_block_diagram`](#create_rf_block_diagram) | Generator   | RF signal chain with Friis cascade                 |
| [`create_emc_test_setup`](#create_emc_test_setup)   | Generator       | CISPR / ISO EMC test setup                         |
| [`create_pcb_stackup`](#create_pcb_stackup)         | Generator       | PCB cross-section stackup                          |
| [`markup_schematic`](#markup_schematic)             | Generator       | Annotate schematic screenshots                     |
| [`read_drawio`](#read_drawio)                       | Analysis        | Parse `.drawio` to structured JSON                 |
| [`export_drawio`](#export_drawio)                   | Analysis        | Export to SVG / PNG                                |

---

## `open_drawio_xml`

Open draw.io with raw mxGraph XML content.

**Arguments**

| Name   | Type   | Default | Description                          |
| ------ | ------ | ------- | ------------------------------------ |
| `xml`  | string | —       | mxGraphModel XML to render           |

---

## `open_drawio_csv`

Open draw.io with CSV node data.

**Arguments**

| Name    | Type   | Default | Description                                  |
| ------- | ------ | ------- | -------------------------------------------- |
| `csv`   | string | —       | CSV body with header row                     |
| `style` | string | `"default"` | Built-in style profile to apply         |

---

## `open_drawio_mermaid`

Open draw.io with Mermaid diagram syntax.

**Arguments**

| Name      | Type   | Default | Description                                  |
| --------- | ------ | ------- | -------------------------------------------- |
| `mermaid` | string | —       | Mermaid diagram source                       |

---

## `open_drawio_engineering`

Open draw.io with one or more engineering stencil libraries loaded in
the sidebar.

**Arguments**

| Name       | Type             | Default          | Description                                            |
| ---------- | ---------------- | ---------------- | ------------------------------------------------------ |
| `stencils` | `string[]`       | all 13 libraries | Library IDs to load (e.g. `"rf-blocks"`)               |

See the [stencils list](#stencil-libraries) below.

---

## `create_rf_block_diagram`

Generate an RF signal chain diagram with auto-layout and Friis cascade
annotations (gain, NF, P1dB cascade).

**Arguments**

| Name              | Type        | Default | Description                                              |
| ----------------- | ----------- | ------- | -------------------------------------------------------- |
| `blocks`          | `Block[]`   | —       | Array of `{ type, name, gain_db, nf_db, p1db_dbm }` rows |
| `frequency_ghz`   | number      | —       | Operating frequency for label                            |
| `show_cascade`    | boolean     | `true`  | Annotate cumulative gain / NF                            |

---

## `create_emc_test_setup`

Generate a CISPR / ISO EMC test setup diagram from a template.

**Arguments**

| Name        | Type   | Default | Description                                                 |
| ----------- | ------ | ------- | ----------------------------------------------------------- |
| `template`  | string | —       | `"cispr25_re"`, `"cispr25_ce"`, `"iso11452_2_ri"`, `"iso11452_4_ci"` |
| `dut_name`  | string | `"DUT"` | Device-under-test label                                     |
| `distance_m`| number | template default | Antenna distance in meters                          |

---

## `create_pcb_stackup`

Generate a PCB cross-section stackup with material properties and
impedance annotations.

**Arguments**

| Name        | Type        | Default | Description                                       |
| ----------- | ----------- | ------- | ------------------------------------------------- |
| `layers`    | `Layer[]`   | —       | Array of `{ name, type, thickness_um, material }` |
| `materials` | `Material[]` | from layers | Material definitions (Dk, Df, Tg)            |

Built-in 4-layer, 6-layer, 8-layer templates. Materials supported out of
the box: FR-4, Rogers 4003C / 4350B, Megtron 6, Isola I-Tera.

---

## `markup_schematic`

Overlay annotations (redlines, revision clouds, callouts) on a schematic
screenshot. The image is placed as a locked background layer in draw.io.

**Arguments**

| Name           | Type             | Default | Description                                        |
| -------------- | ---------------- | ------- | -------------------------------------------------- |
| `image_path`   | string           | —       | Path to schematic image (PNG / JPG / SVG)          |
| `annotations`  | `Annotation[]`   | —       | Array of `{ type, x, y, text, color }` rows        |

---

## `read_drawio`

Parse a `.drawio` file into structured JSON (shapes, edges, styles).

**Arguments**

| Name        | Type   | Default | Description                          |
| ----------- | ------ | ------- | ------------------------------------ |
| `file_path` | string | —       | Path to `.drawio` file               |

**Returns**

| Field    | Type         | Description                                          |
| -------- | ------------ | ---------------------------------------------------- |
| `shapes` | `Shape[]`    | Each shape with `id`, `style`, `geometry`, `value`   |
| `edges`  | `Edge[]`     | Each edge with `source`, `target`, `style`           |

---

## `export_drawio`

Export a `.drawio` file to SVG (or PNG with puppeteer installed).

**Arguments**

| Name        | Type   | Default | Description                          |
| ----------- | ------ | ------- | ------------------------------------ |
| `file_path` | string | —       | Path to `.drawio` file               |
| `format`    | string | `"svg"` | `"svg"` or `"png"`                   |
| `output`    | string | input.{ext} | Output path                      |

---

## Stencil libraries

| Library ID                | Symbols | One-line                                                                  |
| ------------------------- | ------- | ------------------------------------------------------------------------- |
| `rf-blocks`               | 30      | Core RF blocks                                                            |
| `rf-amplifiers-mixers`    | 16      | Amplifier variants + mixers                                               |
| `rf-filters-attenuators`  | 17      | BPF / LPF / HPF / notch + DSA / step / variable atten                     |
| `rf-passive-components`   | 14      | Circulators, isolators, couplers, hybrids, baluns                         |
| `rf-sources-oscillators`  | 10      | Crystal, TCXO, OCXO, VCO, PLL, DDS, synthesizer                           |
| `rf-switches-detectors`   | 15      | SPxT switches, T/R, power detector, ADC, DAC                              |
| `rf-antennas-txlines`     | 20      | Dipole, patch, horn, array, MIMO, coax, microstrip, waveguide             |
| `ee-power-ics`            | 20      | LDO, buck, boost, flyback, SoC, FPGA, MCU, packaging                      |
| `ee-connectors`           | 14      | SMA, U.FL, N-type, BNC, USB-C, RJ45, headers                              |
| `ee-test-equipment-emc`   | 18      | Spectrum analyzer, VNA, scope, LISN, CDN, chamber                         |
| `pcb-stackup-vias`        | 30      | Copper / prepreg / core, vias (through / blind / buried / micro), impedance traces |
| `wireless-telecom`        | 27      | Wi-Fi, BLE, LTE, NR, LoRa, Zigbee, Thread, protocol badges, modulation    |
| `general-engineering`     | 38      | System blocks, rack diagrams, cables, thermal, R/L/C/transformer          |

Total: **269 symbols across 13 libraries**.
