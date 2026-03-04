import { generatePcbStackup } from "../generators/pcb-stackup.js";

export const createPcbStackupTool = {
  name: "create_pcb_stackup",
  description:
    "Generates a PCB stackup cross-section diagram and opens it in draw.io. " +
    "Shows each layer as a color-coded horizontal rectangle with labels and material properties.\n\n" +
    "Available templates:\n" +
    "  4layer: Standard 4-Layer (L1 Signal / L2 GND / L3 PWR / L4 Signal, FR-4)\n" +
    "  6layer: Standard 6-Layer (L1 Signal / L2 GND / L3-L4 Signal / L5 PWR / L6 Signal, FR-4)\n" +
    "  custom: Provide your own layers array\n\n" +
    "Layer types and colors:\n" +
    "  copper: Signal (red), GND (blue), PWR (orange) - weight in oz\n" +
    "  prepreg: Light yellow with material properties (Dk, Df)\n" +
    "  core: Light gray with material properties (Dk, Df)\n" +
    "  soldermask: Green (outer surfaces)\n\n" +
    "Available materials: fr4, rogers_4003c, rogers_4350b, megtron6, isola_370hr\n" +
    "Copper weights: 0.5oz (17.5um), 1oz (35um), 2oz (70um)",
  inputSchema: {
    type: "object",
    properties: {
      template: {
        type: "string",
        enum: ["4layer", "6layer", "custom"],
        description: "PCB stackup template. Use 'custom' with the layers parameter for custom stackups.",
      },
      layers: {
        type: "array",
        description:
          "Custom layer array (used when template is 'custom'). " +
          "Each layer has type, and type-specific properties.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["soldermask", "copper", "prepreg", "core"],
              description: "Layer type",
            },
            name: {
              type: "string",
              description: "Layer name/label (e.g. 'L1 Signal', 'L2 GND')",
            },
            thickness_mm: {
              type: "number",
              description: "Layer thickness in mm (for prepreg, core, soldermask)",
            },
            material: {
              type: "string",
              enum: ["fr4", "rogers_4003c", "rogers_4350b", "megtron6", "isola_370hr"],
              description: "Dielectric material (for prepreg/core layers)",
            },
            weight: {
              type: "string",
              enum: ["0.5oz", "1oz", "2oz"],
              description: "Copper weight (for copper layers). Default: 1oz",
            },
            color: {
              type: "string",
              description: "Custom color hex for soldermask (e.g. '#009900')",
            },
          },
          required: ["type"],
        },
      },
      title: {
        type: "string",
        description: "Diagram title (defaults to template name)",
      },
      show_dimensions: {
        type: "boolean",
        description:
          "Show thickness and material property annotations. Default: true",
      },
      board_width_mm: {
        type: "number",
        description: "Board width in mm (annotation only, does not affect layer width)",
      },
      auto_open: {
        type: "boolean",
        description:
          "Automatically open the diagram in draw.io. Set to false to return XML only. Default: true",
      },
    },
    required: ["template"],
  },
  type: "xml",
  isGenerator: true,

  /**
   * Generate the PCB stackup diagram XML.
   * @param {object} args - Tool arguments
   * @returns {string} mxGraphModel XML
   */
  generate(args) {
    return generatePcbStackup({
      template: args.template,
      layers: args.layers,
      title: args.title,
      show_dimensions: args.show_dimensions ?? true,
      board_width_mm: args.board_width_mm,
    });
  },
};
