import { generateRfBlockDiagram } from "../generators/rf-signal-chain.js";

export const createRfBlockDiagramTool = {
  name: "create_rf_block_diagram",
  description:
    "Generates an RF signal chain block diagram from a JSON description and opens it in draw.io. " +
    "Provide an array of blocks with type, label, and optional RF parameters. " +
    "The tool auto-layouts blocks left-to-right with signal flow arrows and color-coded shapes. " +
    "Injection sources (e.g. LO for a mixer) are placed below their target block with dashed arrows. " +
    "Supports cumulative gain and noise figure annotations using the Friis formula.\n\n" +
    "Supported block types:\n" +
    "  Amplifiers: lna, pa, amplifier, driver\n" +
    "  Filters: bpf, lpf, hpf, notch\n" +
    "  Mixer: mixer\n" +
    "  Attenuators: attenuator, dsa\n" +
    "  Converters: adc, dac\n" +
    "  Oscillators: vco, oscillator, pll\n" +
    "  Antenna: antenna\n" +
    "  Passive: coupler, splitter, combiner, circulator, isolator, balun, duplexer, diplexer\n" +
    "  Switches: switch, spdt, sp4t\n" +
    "  Other: detector, custom\n\n" +
    "Each block object in the chain array accepts:\n" +
    "  type (required): one of the types above\n" +
    "  label: display name (defaults to standard abbreviation)\n" +
    "  sublabel: smaller text below the label (e.g. frequency)\n" +
    "  gain_db: gain in dB (defaults from component database)\n" +
    "  nf_db: noise figure in dB (defaults from component database)\n" +
    "  inject_to: label of the main chain block this injects into (for LO sources, etc.)",
  inputSchema: {
    type: "object",
    properties: {
      chain: {
        type: "array",
        description:
          "Array of block objects describing the signal chain in order. " +
          "Blocks without inject_to form the main chain (left to right). " +
          "Blocks with inject_to are injection sources placed below their target.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "lna", "pa", "amplifier", "driver",
                "bpf", "lpf", "hpf", "notch",
                "mixer",
                "attenuator", "dsa",
                "adc", "dac",
                "vco", "oscillator", "pll",
                "antenna",
                "coupler", "splitter", "combiner",
                "circulator", "isolator", "balun",
                "duplexer", "diplexer",
                "switch", "spdt", "sp4t",
                "detector", "custom",
              ],
              description: "Block type",
            },
            label: {
              type: "string",
              description: "Display label (defaults to standard abbreviation for the type)",
            },
            sublabel: {
              type: "string",
              description: "Secondary label shown below main label (e.g. frequency)",
            },
            gain_db: {
              type: "number",
              description: "Gain in dB (negative for loss). Defaults from component database.",
            },
            nf_db: {
              type: "number",
              description: "Noise figure in dB. Defaults from component database.",
            },
            inject_to: {
              type: "string",
              description:
                "Label of the main chain block this source injects into. " +
                "When set, this block is placed below the target with a dashed arrow.",
            },
          },
          required: ["type"],
        },
      },
      title: {
        type: "string",
        description: "Diagram title displayed at the top",
      },
      show_cumulative: {
        type: "boolean",
        description:
          "Show cumulative gain and noise figure annotations below each main chain block (Friis formula). Default: false",
      },
      signal_flow_arrows: {
        type: "boolean",
        description:
          "Draw signal flow arrows between adjacent main chain blocks. Default: true",
      },
      auto_open: {
        type: "boolean",
        description:
          "Automatically open the diagram in draw.io. Set to false to return XML only. Default: true",
      },
    },
    required: ["chain"],
  },
  type: "xml",
  isGenerator: true,

  /**
   * Generate the RF block diagram XML.
   * @param {object} args - Tool arguments
   * @returns {string} mxGraphModel XML
   */
  generate(args) {
    return generateRfBlockDiagram({
      chain: args.chain || [],
      title: args.title,
      show_cumulative: args.show_cumulative ?? false,
      signal_flow_arrows: args.signal_flow_arrows ?? true,
    });
  },
};
