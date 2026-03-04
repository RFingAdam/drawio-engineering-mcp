/**
 * RF Signal Chain Block Diagram Generator
 *
 * Generates a draw.io mxGraphModel XML string from a declarative JSON
 * description of an RF signal chain. Supports main chain blocks laid
 * out left-to-right, injection sources (e.g. LO) placed below their
 * target, signal flow arrows, and cumulative gain/NF annotations
 * computed using the Friis formula.
 */

import {
  resetIdCounter,
  createDiagram,
  cell,
  edge,
} from "../core/xml-builder.js";

import {
  LAYOUT,
  getShapeStyle,
  getBlockSize,
} from "./layout.js";

import rfDefaults from "../data/rf-components.json" with { type: "json" };

/**
 * Build a display label for a block.
 * If a sublabel is provided, it appears below the main label in smaller text.
 */
function buildLabel(block) {
  const label = block.label || rfDefaults.defaults[block.type]?.label || block.type.toUpperCase();
  if (block.sublabel) {
    return `${label}\n<font style="font-size:9px">${block.sublabel}</font>`;
  }
  return label;
}

/**
 * Compute cumulative gain and noise figure along the main chain
 * using the Friis formula for cascaded noise figure:
 *
 *   NF_total = NF_1 + (NF_2 - 1)/G_1 + (NF_3 - 1)/(G_1*G_2) + ...
 *
 * All values in dB on input, converted to linear for calculation,
 * then back to dB for display.
 *
 * @param {Array} mainChain - Array of block objects in signal order
 * @returns {Array<{ gain_db: number, nf_db: number }>} Per-stage cumulative values
 */
function computeCumulative(mainChain) {
  const results = [];
  let cumulativeGainLinear = 1; // running product of linear gains
  let cumulativeNfLinear = 1; // running Friis NF (linear)

  for (let i = 0; i < mainChain.length; i++) {
    const block = mainChain[i];
    const defaults = rfDefaults.defaults[block.type] || {};
    const gainDb = block.gain_db ?? defaults.gain_db ?? 0;
    const nfDb = block.nf_db ?? defaults.nf_db ?? 0;

    const gainLin = Math.pow(10, gainDb / 10);
    const nfLin = Math.pow(10, nfDb / 10);

    if (i === 0) {
      cumulativeGainLinear = gainLin;
      cumulativeNfLinear = nfLin;
    } else {
      // Friis: add (F_n - 1) / (G_1 * G_2 * ... * G_{n-1})
      cumulativeNfLinear += (nfLin - 1) / cumulativeGainLinear;
      cumulativeGainLinear *= gainLin;
    }

    results.push({
      gain_db: 10 * Math.log10(cumulativeGainLinear),
      nf_db: 10 * Math.log10(cumulativeNfLinear),
    });
  }

  return results;
}

/**
 * Generate the complete RF block diagram.
 *
 * @param {object} opts
 * @param {Array} opts.chain - Array of block descriptors
 * @param {string} [opts.title] - Diagram title
 * @param {boolean} [opts.show_cumulative=false] - Show cumulative gain/NF annotations
 * @param {boolean} [opts.signal_flow_arrows=true] - Draw arrows between main chain blocks
 * @returns {string} mxGraphModel XML
 */
export function generateRfBlockDiagram({
  chain = [],
  title,
  show_cumulative = false,
  signal_flow_arrows = true,
}) {
  resetIdCounter();

  const cells = [];

  // Separate main chain blocks from injection sources
  const mainChain = chain.filter((b) => !b.inject_to);
  const injections = chain.filter((b) => b.inject_to);

  // --- Title ---
  if (title) {
    // Estimate total chain width to center the title
    let totalWidth = LAYOUT.MARGIN_LEFT;
    for (const block of mainChain) {
      const { w } = getBlockSize(block.type);
      totalWidth += w + LAYOUT.BLOCK_H_SPACING;
    }

    cells.push(
      cell({
        value: title,
        style: LAYOUT.TITLE_STYLE,
        x: 0,
        y: LAYOUT.TITLE_Y,
        w: totalWidth,
        h: 30,
      })
    );
  }

  // --- Main chain blocks (left to right) ---
  let cursorX = LAYOUT.MARGIN_LEFT;
  const mainCellMap = new Map(); // label -> { cellId, x, y, w, h }

  const mainCells = []; // ordered array of placed main cells

  for (const block of mainChain) {
    const { w, h } = getBlockSize(block.type);
    const style = getShapeStyle(block.type);
    const label = buildLabel(block);
    const y = LAYOUT.CHAIN_Y;

    const c = cell({
      value: label,
      style,
      x: cursorX,
      y,
      w,
      h,
    });

    cells.push(c);

    const blockLabel = block.label || rfDefaults.defaults[block.type]?.label || block.type.toUpperCase();
    mainCellMap.set(blockLabel, { cellId: c.cellId, x: cursorX, y, w, h });
    mainCells.push({ cellId: c.cellId, x: cursorX, y, w, h, block });

    cursorX += w + LAYOUT.BLOCK_H_SPACING;
  }

  // --- Signal flow arrows between adjacent main chain blocks ---
  if (signal_flow_arrows) {
    for (let i = 0; i < mainCells.length - 1; i++) {
      const src = mainCells[i];
      const tgt = mainCells[i + 1];
      cells.push(
        edge({
          style: LAYOUT.ARROW_STYLE,
          source: src.cellId,
          target: tgt.cellId,
        })
      );
    }
  }

  // --- Injection sources (LO, etc.) ---
  for (const inj of injections) {
    const targetInfo = mainCellMap.get(inj.inject_to);
    if (!targetInfo) continue; // skip if target not found

    const { w: injW, h: injH } = getBlockSize(inj.type);
    const style = getShapeStyle(inj.type);
    const label = buildLabel(inj);

    // Center the injection block below its target
    const injX = targetInfo.x + (targetInfo.w - injW) / 2;
    const injY = targetInfo.y + LAYOUT.INJECTION_Y_OFFSET;

    const injCell = cell({
      value: label,
      style,
      x: injX,
      y: injY,
      w: injW,
      h: injH,
    });

    cells.push(injCell);

    // Dashed LO arrow from injection source up to target
    cells.push(
      edge({
        style: LAYOUT.LO_ARROW_STYLE,
        source: injCell.cellId,
        target: targetInfo.cellId,
      })
    );
  }

  // --- Cumulative gain/NF annotations ---
  if (show_cumulative && mainChain.length > 0) {
    const cumulative = computeCumulative(mainChain);

    for (let i = 0; i < mainCells.length; i++) {
      const mc = mainCells[i];
      const cum = cumulative[i];

      const gainStr = cum.gain_db >= 0
        ? `+${cum.gain_db.toFixed(1)}`
        : cum.gain_db.toFixed(1);

      const annotationText = `G: ${gainStr} dB\nNF: ${cum.nf_db.toFixed(1)} dB`;

      cells.push(
        cell({
          value: annotationText,
          style: LAYOUT.ANNOTATION_STYLE,
          x: mc.x,
          y: mc.y + mc.h + LAYOUT.ANNOTATION_Y_OFFSET,
          w: mc.w,
          h: 30,
        })
      );
    }
  }

  return createDiagram({ cells });
}
