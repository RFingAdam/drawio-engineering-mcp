import { generateEmcTestSetup } from "../generators/emc-setup.js";

export const createEmcTestSetupTool = {
  name: "create_emc_test_setup",
  description:
    "Generates an EMC test setup cross-section diagram from a template and opens it in draw.io. " +
    "Shows equipment layout with ground plane, EUT on table, antenna on mast, and test instruments.\n\n" +
    "Available templates:\n" +
    "  cispr25_re: CISPR 25 Radiated Emissions - semi-anechoic chamber, antenna 1m from EUT, 150 kHz - 2.5 GHz\n" +
    "  cispr25_ce: CISPR 25 Conducted Emissions - LISN on each power line, 150 kHz - 108 MHz\n" +
    "  iso11452_2_ri: ISO 11452-2 Radiated Immunity - absorber-lined enclosure, 200 MHz - 18 GHz\n" +
    "  iso11452_4_ci: ISO 11452-4 Conducted Immunity (BCI) - BCI clamp on harness, 1 MHz - 400 MHz\n\n" +
    "Each template includes standard equipment, distances, and cable connections. " +
    "Equipment labels can be overridden. Distance annotations are shown by default.",
  inputSchema: {
    type: "object",
    properties: {
      template: {
        type: "string",
        enum: ["cispr25_re", "cispr25_ce", "iso11452_2_ri", "iso11452_4_ci"],
        description: "EMC test standard template to use",
      },
      title: {
        type: "string",
        description: "Diagram title (defaults to template name)",
      },
      show_distances: {
        type: "boolean",
        description:
          "Show distance annotations between equipment. Default: true",
      },
      equipment_overrides: {
        type: "object",
        description:
          "Override default equipment labels. Keys are equipment names " +
          "(eut, antenna, spectrum_analyzer, signal_generator, power_amplifier, " +
          "power_meter, lisn, bci_probe), values are custom label strings.",
        additionalProperties: { type: "string" },
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
   * Generate the EMC test setup diagram XML.
   * @param {object} args - Tool arguments
   * @returns {string} mxGraphModel XML
   */
  generate(args) {
    return generateEmcTestSetup({
      template: args.template,
      equipment_overrides: args.equipment_overrides || {},
      title: args.title,
      show_distances: args.show_distances ?? true,
    });
  },
};
