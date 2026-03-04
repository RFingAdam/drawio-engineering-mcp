/**
 * PCB Stackup Cross-Section Diagram Generator
 *
 * Generates a draw.io mxGraphModel XML string showing a cross-section view
 * of a PCB stackup. Each layer is rendered as a horizontal rectangle stacked
 * vertically with labels, thickness, and material properties.
 */

import {
  resetIdCounter,
  createDiagram,
  cell,
} from "../core/xml-builder.js";

import pcbMaterials from "../data/pcb-materials.json" with { type: "json" };

// --- Layout constants ---

const PCB_LAYOUT = {
  MARGIN_LEFT: 160,
  MARGIN_TOP: 80,
  MARGIN_RIGHT: 200,
  TITLE_Y: 20,
  STACKUP_START_Y: 90,
  BOARD_W: 300,

  // Minimum rendered height for thin layers (soldermask, copper)
  MIN_LAYER_H: 8,
  // Scale factor: mm -> pixels for layer height
  THICKNESS_SCALE: 120,

  // Styles
  TITLE_STYLE:
    "text;html=1;fontSize=16;fontStyle=1;align=center;verticalAlign=middle;whiteSpace=wrap;",
  LEFT_LABEL_STYLE:
    "text;html=1;fontSize=10;fontStyle=1;align=right;verticalAlign=middle;whiteSpace=wrap;",
  RIGHT_LABEL_STYLE:
    "text;html=1;fontSize=9;fontColor=#666666;align=left;verticalAlign=middle;whiteSpace=wrap;",
  TOTAL_THICKNESS_STYLE:
    "text;html=1;fontSize=11;fontStyle=1;fontColor=#CC0000;align=center;verticalAlign=middle;whiteSpace=wrap;",
  DIMENSION_BRACKET_STYLE:
    "fillColor=none;strokeColor=#CC0000;strokeWidth=1.5;fontSize=0;",

  // Layer type styles
  SOLDERMASK_STYLE:
    "fillColor=#009900;strokeColor=#006600;fontStyle=0;fontSize=8;fontColor=#FFFFFF;whiteSpace=wrap;html=1;",
  COPPER_SIGNAL_STYLE:
    "fillColor=#FF6666;strokeColor=#CC3333;fontStyle=1;fontSize=9;fontColor=#FFFFFF;whiteSpace=wrap;html=1;",
  COPPER_GND_STYLE:
    "fillColor=#6666FF;strokeColor=#3333CC;fontStyle=1;fontSize=9;fontColor=#FFFFFF;whiteSpace=wrap;html=1;",
  COPPER_PWR_STYLE:
    "fillColor=#FF9933;strokeColor=#CC6600;fontStyle=1;fontSize=9;fontColor=#FFFFFF;whiteSpace=wrap;html=1;",
  PREPREG_STYLE:
    "fillColor=#FFFFCC;strokeColor=#CCCC66;fontStyle=0;fontSize=9;fontColor=#666666;whiteSpace=wrap;html=1;",
  CORE_STYLE:
    "fillColor=#E6E6E6;strokeColor=#AAAAAA;fontStyle=0;fontSize=9;fontColor=#666666;whiteSpace=wrap;html=1;",
};

/**
 * Determine the style for a copper layer based on its name.
 *
 * @param {string} name - Layer name (e.g. "L2 GND", "L3 PWR", "L1 Signal")
 * @returns {string} mxGraph style string
 */
function getCopperStyle(name) {
  const upper = (name || "").toUpperCase();
  if (upper.includes("GND") || upper.includes("GROUND")) {
    return PCB_LAYOUT.COPPER_GND_STYLE;
  }
  if (upper.includes("PWR") || upper.includes("POWER") || upper.includes("VCC")) {
    return PCB_LAYOUT.COPPER_PWR_STYLE;
  }
  return PCB_LAYOUT.COPPER_SIGNAL_STYLE;
}

/**
 * Get the style for a layer type.
 *
 * @param {object} layer - Layer descriptor
 * @returns {string} mxGraph style string
 */
function getLayerStyle(layer) {
  switch (layer.type) {
    case "soldermask":
      // Allow custom soldermask color
      if (layer.color && layer.color !== "#009900") {
        return PCB_LAYOUT.SOLDERMASK_STYLE.replace("#009900", layer.color);
      }
      return PCB_LAYOUT.SOLDERMASK_STYLE;
    case "copper":
      return getCopperStyle(layer.name);
    case "prepreg":
      return PCB_LAYOUT.PREPREG_STYLE;
    case "core":
      return PCB_LAYOUT.CORE_STYLE;
    default:
      return PCB_LAYOUT.CORE_STYLE;
  }
}

/**
 * Compute the rendered height for a layer in pixels.
 *
 * @param {object} layer - Layer descriptor
 * @returns {number} Height in pixels
 */
function getLayerHeight(layer) {
  let thickness_mm;

  if (layer.type === "copper") {
    const weight = layer.weight || "1oz";
    thickness_mm = pcbMaterials.copper_weights[weight] || 0.035;
  } else {
    thickness_mm = layer.thickness_mm || 0.1;
  }

  const scaled = thickness_mm * PCB_LAYOUT.THICKNESS_SCALE;
  return Math.max(scaled, PCB_LAYOUT.MIN_LAYER_H);
}

/**
 * Get the actual thickness in mm for a layer.
 *
 * @param {object} layer - Layer descriptor
 * @returns {number} Thickness in mm
 */
function getLayerThickness(layer) {
  if (layer.type === "copper") {
    const weight = layer.weight || "1oz";
    return pcbMaterials.copper_weights[weight] || 0.035;
  }
  return layer.thickness_mm || 0;
}

/**
 * Build the right-side annotation text for a layer.
 *
 * @param {object} layer - Layer descriptor
 * @returns {string} Annotation text
 */
function getLayerAnnotation(layer) {
  const parts = [];

  const thickness = getLayerThickness(layer);
  if (thickness > 0) {
    parts.push(`${thickness.toFixed(thickness < 0.1 ? 4 : 3)} mm`);
  }

  if (layer.type === "copper" && layer.weight) {
    parts.push(layer.weight);
  }

  if (layer.material) {
    const mat = pcbMaterials.materials[layer.material];
    if (mat) {
      parts.push(`${mat.name} (Dk=${mat.dk}, Df=${mat.df})`);
    }
  }

  return parts.join("  |  ");
}

/**
 * Build the left-side label for a layer.
 *
 * @param {object} layer - Layer descriptor
 * @returns {string} Layer name/label
 */
function getLayerLabel(layer) {
  if (layer.name) return layer.name;

  switch (layer.type) {
    case "soldermask":
      return "Soldermask";
    case "prepreg":
      return "Prepreg";
    case "core":
      return "Core";
    case "copper":
      return "Copper";
    default:
      return layer.type;
  }
}

/**
 * Generate the complete PCB stackup diagram.
 *
 * @param {object} opts
 * @param {string} [opts.template] - Template key from pcb-materials.json
 * @param {Array} [opts.layers] - Custom layer array (used if template is "custom" or not provided)
 * @param {string} [opts.title] - Diagram title
 * @param {boolean} [opts.show_dimensions=true] - Show thickness annotations
 * @param {number} [opts.board_width_mm] - Board width in mm (display only)
 * @returns {string} mxGraphModel XML
 */
export function generatePcbStackup({
  template,
  layers: customLayers,
  title,
  show_dimensions = true,
  board_width_mm,
}) {
  resetIdCounter();

  // Resolve layers from template or custom input
  let layers;
  let templateName;

  if (template && template !== "custom" && pcbMaterials.templates[template]) {
    const tmpl = pcbMaterials.templates[template];
    layers = tmpl.layers;
    templateName = tmpl.name;
  } else if (customLayers && customLayers.length > 0) {
    layers = customLayers;
    templateName = "Custom Stackup";
  } else {
    throw new Error(
      `No layers specified. Provide a template (${Object.keys(pcbMaterials.templates).join(", ")}) or custom layers array.`
    );
  }

  const cells = [];
  const boardW = PCB_LAYOUT.BOARD_W;
  const diagramTitle = title || templateName;

  // Compute total diagram width for centering title
  const totalWidth = PCB_LAYOUT.MARGIN_LEFT + boardW + PCB_LAYOUT.MARGIN_RIGHT;

  // --- Title ---
  cells.push(
    cell({
      value: diagramTitle,
      style: PCB_LAYOUT.TITLE_STYLE,
      x: 0,
      y: PCB_LAYOUT.TITLE_Y,
      w: totalWidth,
      h: 30,
    })
  );

  // --- Board width annotation ---
  if (board_width_mm && show_dimensions) {
    cells.push(
      cell({
        value: `Board width: ${board_width_mm} mm`,
        style: "text;html=1;fontSize=10;fontColor=#666666;fontStyle=2;align=center;verticalAlign=middle;whiteSpace=wrap;",
        x: 0,
        y: PCB_LAYOUT.TITLE_Y + 30,
        w: totalWidth,
        h: 20,
      })
    );
  }

  // --- Render layers top to bottom ---
  let cursorY = PCB_LAYOUT.STACKUP_START_Y;
  let totalThickness = 0;
  const stackTopY = cursorY;

  for (const layer of layers) {
    const layerH = getLayerHeight(layer);
    const style = getLayerStyle(layer);
    const layerLabel = getLayerLabel(layer);

    // Layer rectangle
    const inlineLabel = layer.type === "soldermask" ? "SM" : "";
    cells.push(
      cell({
        value: inlineLabel,
        style: style,
        x: PCB_LAYOUT.MARGIN_LEFT,
        y: cursorY,
        w: boardW,
        h: layerH,
      })
    );

    // Left label
    cells.push(
      cell({
        value: layerLabel,
        style: PCB_LAYOUT.LEFT_LABEL_STYLE,
        x: 0,
        y: cursorY,
        w: PCB_LAYOUT.MARGIN_LEFT - 10,
        h: layerH,
      })
    );

    // Right annotation (thickness, material properties)
    if (show_dimensions) {
      const annotation = getLayerAnnotation(layer);
      if (annotation) {
        cells.push(
          cell({
            value: annotation,
            style: PCB_LAYOUT.RIGHT_LABEL_STYLE,
            x: PCB_LAYOUT.MARGIN_LEFT + boardW + 10,
            y: cursorY,
            w: PCB_LAYOUT.MARGIN_RIGHT - 20,
            h: layerH,
          })
        );
      }
    }

    totalThickness += getLayerThickness(layer);
    cursorY += layerH;
  }

  const stackBottomY = cursorY;

  // --- Total thickness annotation (far right bracket) ---
  if (show_dimensions) {
    const bracketX = PCB_LAYOUT.MARGIN_LEFT + boardW + PCB_LAYOUT.MARGIN_RIGHT - 30;

    // Top bracket tick
    cells.push(
      cell({
        value: "",
        style: "fillColor=#CC0000;strokeColor=#CC0000;",
        x: bracketX,
        y: stackTopY,
        w: 15,
        h: 2,
      })
    );

    // Vertical line
    cells.push(
      cell({
        value: "",
        style: "fillColor=#CC0000;strokeColor=#CC0000;",
        x: bracketX + 7,
        y: stackTopY,
        w: 2,
        h: stackBottomY - stackTopY,
      })
    );

    // Bottom bracket tick
    cells.push(
      cell({
        value: "",
        style: "fillColor=#CC0000;strokeColor=#CC0000;",
        x: bracketX,
        y: stackBottomY - 2,
        w: 15,
        h: 2,
      })
    );

    // Total thickness text
    cells.push(
      cell({
        value: `Total:\n${totalThickness.toFixed(3)} mm`,
        style: PCB_LAYOUT.TOTAL_THICKNESS_STYLE,
        x: bracketX + 18,
        y: (stackTopY + stackBottomY) / 2 - 18,
        w: 80,
        h: 36,
      })
    );
  }

  return createDiagram({ cells });
}
