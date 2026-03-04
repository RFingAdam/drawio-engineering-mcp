const STENCIL_BASE_URL =
  "https://raw.githubusercontent.com/RFingAdam/drawio-engineering-mcp/main/docs/stencils";

const STENCIL_LIBRARIES = {
  "rf-blocks": { file: "rf-blocks.xml", label: "RF Blocks" },
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
    "RF/electrical engineering stencil libraries in the sidebar. The stencil library " +
    "includes common RF components (LNA, PA, mixer, filters, attenuator, switch, " +
    "coupler, antenna, oscillator, etc.) ready to drag-and-drop. " +
    "Use this instead of open_drawio_xml when creating RF signal chains, " +
    "EMC test setups, or electrical engineering block diagrams. " +
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
          enum: ["rf-blocks"],
        },
        description:
          'Which stencil libraries to load. Default: ["rf-blocks"]. ' +
          "Available: rf-blocks (RF amplifiers, mixers, filters, switches, antennas, etc.)",
        default: ["rf-blocks"],
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
    const requestedLibs = args?.stencils || ["rf-blocks"];
    const clibs = getStencilUrlParam(requestedLibs);
    if (clibs) {
      return { clibs };
    }
    return {};
  },
};
