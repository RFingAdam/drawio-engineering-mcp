const STENCIL_BASE_URL =
  "https://raw.githubusercontent.com/RFingAdam/drawio-engineering-mcp/main/docs/stencils";

const STENCIL_LIBRARIES = {
  "rf-blocks": { file: "rf-blocks.xml", label: "RF Blocks" },
  "rf-amplifiers-mixers": { file: "rf-amplifiers-mixers.xml", label: "RF Amplifiers & Mixers" },
  "rf-filters-attenuators": { file: "rf-filters-attenuators.xml", label: "RF Filters & Attenuators" },
  "rf-passive-components": { file: "rf-passive-components.xml", label: "RF Passive Components" },
  "rf-sources-oscillators": { file: "rf-sources-oscillators.xml", label: "RF Sources & Oscillators" },
  "rf-switches-detectors": { file: "rf-switches-detectors.xml", label: "RF Switches & Detectors" },
  "rf-antennas-txlines": { file: "rf-antennas-txlines.xml", label: "RF Antennas & TX Lines" },
  "ee-power-ics": { file: "ee-power-ics.xml", label: "EE Power & ICs" },
  "ee-connectors": { file: "ee-connectors.xml", label: "EE Connectors" },
  "ee-test-equipment-emc": { file: "ee-test-equipment-emc.xml", label: "Test Equipment & EMC" },
  "pcb-stackup-vias": { file: "pcb-stackup-vias.xml", label: "PCB Stackup & Vias" },
  "wireless-telecom": { file: "wireless-telecom.xml", label: "Wireless & Telecom" },
  "general-engineering": { file: "general-engineering.xml", label: "General Engineering" },
};

/**
 * Build the clibs URL parameter using raw GitHub URLs.
 *
 * draw.io accepts `clibs=U<url>` where <url> points to an XML stencil
 * library file. Multiple libraries are separated by semicolons.
 *
 * Previously we used data: URIs with the full XML encoded inline, but
 * that exceeded the ~8 KB browser URL length limit. Raw GitHub URLs
 * are short and reliable for public repos.
 */
function getStencilUrlParam(requestedLibs) {
  const libs = [];

  for (const libName of requestedLibs) {
    const libInfo = STENCIL_LIBRARIES[libName];
    if (!libInfo) continue;

    const url = `${STENCIL_BASE_URL}/${libInfo.file}`;
    libs.push(`U${url}`);
  }

  return libs.length > 0 ? libs.join(";") : null;
}

export const openEngineeringTool = {
  name: "open_drawio_engineering",
  description:
    "Opens the draw.io editor with engineering diagram XML and automatically loads " +
    "240+ engineering stencil libraries in the sidebar. Libraries cover RF components " +
    "(amplifiers, mixers, filters, switches, antennas, oscillators), electrical " +
    "(power ICs, connectors, test equipment), PCB (stackup layers, vias, impedance), " +
    "wireless/telecom (protocol badges, spectrum, modulation), and general engineering " +
    "(system blocks, rack diagrams, cables, thermal management, passive components). " +
    "Use this instead of open_drawio_xml when creating engineering block diagrams. " +
    "IMPORTANT: Do NOT use double hyphens (--) inside XML comments.",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description:
          "The draw.io XML content in mxGraphModel format. " +
          "This is the diagram content; engineering stencils are loaded automatically in the sidebar.",
      },
      stencils: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "rf-blocks",
            "rf-amplifiers-mixers",
            "rf-filters-attenuators",
            "rf-passive-components",
            "rf-sources-oscillators",
            "rf-switches-detectors",
            "rf-antennas-txlines",
            "ee-power-ics",
            "ee-connectors",
            "ee-test-equipment-emc",
            "pcb-stackup-vias",
            "wireless-telecom",
            "general-engineering",
          ],
        },
        description:
          "Which stencil libraries to load. Defaults to all libraries. " +
          "Available: rf-blocks, rf-amplifiers-mixers, rf-filters-attenuators, " +
          "rf-passive-components, rf-sources-oscillators, rf-switches-detectors, " +
          "rf-antennas-txlines, ee-power-ics, ee-connectors, ee-test-equipment-emc, " +
          "pcb-stackup-vias, wireless-telecom, general-engineering",
      },
      lightbox: {
        type: "boolean",
        description: "Open in lightbox mode (read-only view). Default: false",
      },
      dark: {
        type: "string",
        enum: ["auto", "true", "false"],
        description: "Dark mode setting. Default: auto",
      },
    },
    required: ["content"],
  },
  type: "xml",
  getExtraParams(args) {
    const requestedLibs = args?.stencils || Object.keys(STENCIL_LIBRARIES);
    const clibs = getStencilUrlParam(requestedLibs);
    if (clibs) {
      return { clibs };
    }
    return {};
  },
};
