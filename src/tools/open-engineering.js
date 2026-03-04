import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load stencil libraries at module init
const STENCIL_DIR = join(__dirname, "..", "stencils");

function loadStencilLibrary(filename) {
  try {
    return readFileSync(join(STENCIL_DIR, filename), "utf-8");
  } catch (e) {
    console.error(`Warning: Could not load stencil ${filename}: ${e.message}`);
    return null;
  }
}

const STENCIL_LIBRARIES = {
  "rf-blocks": { file: "rf-blocks.xml", label: "RF Blocks" },
};

/**
 * Injects mxlibrary stencils into diagram XML so they appear
 * in the draw.io sidebar when the diagram opens.
 *
 * draw.io supports embedding libraries via the `libs` URL parameter
 * or by including them in the XML itself. We use the URL parameter
 * approach with `clibs` for custom libraries.
 *
 * For the MVP, we inject the stencil content directly into the
 * diagram XML as an extra page/metadata that draw.io can parse.
 * Actually, the simplest reliable approach: we pass the stencil
 * data as a separate JSON structure alongside the diagram.
 */
function getStencilUrlParam(requestedLibs) {
  // For MVP: load stencils and generate a data URI that draw.io can consume
  // The clibs parameter accepts semicolon-separated library URLs
  // We'll use the data: URI scheme to embed inline
  const libs = [];

  for (const libName of requestedLibs) {
    const libInfo = STENCIL_LIBRARIES[libName];
    if (!libInfo) continue;

    const content = loadStencilLibrary(libInfo.file);
    if (content) {
      // draw.io clibs=U<url> format accepts data URIs
      const encoded = encodeURIComponent(content);
      libs.push(`Udata:application/xml,${encoded}`);
    }
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
