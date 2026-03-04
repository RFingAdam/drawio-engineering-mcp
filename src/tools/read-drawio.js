import { readFileSync } from "fs";
import { XMLParser } from "fast-xml-parser";

/**
 * Parse an mxGraphModel XML string into structured shape/edge data.
 *
 * @param {string} xml - mxGraphModel XML content
 * @returns {object} Parsed diagram data
 */
function parseMxGraphModel(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: false,
    isArray: (name) => name === "mxCell" || name === "mxPoint",
  });

  const parsed = parser.parse(xml);
  const root = parsed?.mxGraphModel?.root || parsed?.mxfile?.diagram?.mxGraphModel?.root;

  if (!root) {
    // Try mxfile format (compressed .drawio files)
    const mxfile = parsed?.mxfile;
    if (mxfile?.diagram) {
      const diagramContent = typeof mxfile.diagram === "string"
        ? mxfile.diagram
        : mxfile.diagram?.["#text"];
      if (diagramContent) {
        return { raw_content: diagramContent, note: "Diagram content is compressed. Decompress with pako to parse further." };
      }
    }
    throw new Error("Could not find mxGraphModel root in the XML");
  }

  const cells = Array.isArray(root.mxCell) ? root.mxCell : [root.mxCell].filter(Boolean);

  const shapes = [];
  const edges = [];
  const layers = [];

  for (const c of cells) {
    const id = c.id;
    const parent = c.parent;
    const value = c.value || "";
    const style = c.style || "";

    // Skip root cells (id 0 and 1)
    if (id === "0") continue;
    if (id === "1" && parent === "0") {
      layers.push({ id, parent, value: value || "Default Layer" });
      continue;
    }

    // Parse geometry
    const geo = c.mxGeometry;
    const geometry = geo ? {
      x: geo.x != null ? Number(geo.x) : undefined,
      y: geo.y != null ? Number(geo.y) : undefined,
      width: geo.width != null ? Number(geo.width) : undefined,
      height: geo.height != null ? Number(geo.height) : undefined,
      relative: geo.relative === "1",
    } : undefined;

    // Parse waypoints
    let points;
    if (geo?.Array?.mxPoint) {
      const pts = Array.isArray(geo.Array.mxPoint) ? geo.Array.mxPoint : [geo.Array.mxPoint];
      points = pts.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
    }

    // Parse style into key-value pairs
    const styleProps = {};
    if (style) {
      for (const part of style.split(";")) {
        if (!part) continue;
        const eqIdx = part.indexOf("=");
        if (eqIdx > 0) {
          styleProps[part.slice(0, eqIdx)] = part.slice(eqIdx + 1);
        } else {
          styleProps[part] = true;
        }
      }
    }

    if (c.edge === "1") {
      edges.push({
        id,
        parent,
        value,
        style: styleProps,
        source: c.source,
        target: c.target,
        points,
      });
    } else if (c.vertex === "1") {
      shapes.push({
        id,
        parent,
        value,
        style: styleProps,
        geometry,
      });
    } else if (parent === "0") {
      layers.push({ id, parent, value: value || `Layer ${id}` });
    }
  }

  return { shapes, edges, layers };
}

export const readDrawioTool = {
  name: "read_drawio",
  description:
    "Reads and parses a .drawio or .xml diagram file, returning structured JSON with all shapes, " +
    "edges, and their properties (labels, positions, styles, connections). " +
    "Use this to analyze existing diagrams, extract component lists, or understand diagram structure " +
    "before making modifications. Supports both uncompressed mxGraphModel XML and .drawio file format.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Absolute path to the .drawio or .xml file to read",
      },
      include_style_details: {
        type: "boolean",
        description:
          "Include parsed style properties for each shape/edge. Default: true",
      },
      include_geometry: {
        type: "boolean",
        description:
          "Include position and size for each shape. Default: true",
      },
    },
    required: ["file_path"],
  },
  isReader: true,

  /**
   * Read and parse a .drawio file.
   * @param {object} args - Tool arguments
   * @returns {object} Parsed diagram data
   */
  read(args) {
    const {
      file_path,
      include_style_details = true,
      include_geometry = true,
    } = args;

    const content = readFileSync(file_path, "utf-8");
    const result = parseMxGraphModel(content);

    // If compressed content, return as-is with the note
    if (result.raw_content) {
      return result;
    }

    // Optionally strip details
    if (!include_style_details) {
      for (const s of result.shapes) delete s.style;
      for (const e of result.edges) delete e.style;
    }
    if (!include_geometry) {
      for (const s of result.shapes) delete s.geometry;
      for (const e of result.edges) delete e.points;
    }

    return {
      summary: {
        shapes: result.shapes.length,
        edges: result.edges.length,
        layers: result.layers.length,
      },
      ...result,
    };
  },
};
