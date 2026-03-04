/**
 * EMC Test Setup Diagram Generator
 *
 * Generates a draw.io mxGraphModel XML string showing a cross-section view
 * of an EMC test setup. Supports CISPR 25 (RE/CE) and ISO 11452 (RI/BCI)
 * templates with equipment layout, cable connections, and distance annotations.
 */

import {
  resetIdCounter,
  createDiagram,
  cell,
  edge,
} from "../core/xml-builder.js";

import emcStandards from "../data/emc-standards.json" with { type: "json" };

// --- Layout constants ---

const EMC_LAYOUT = {
  MARGIN_LEFT: 60,
  MARGIN_TOP: 80,
  TITLE_Y: 20,
  TITLE_STYLE:
    "text;html=1;fontSize=16;fontStyle=1;align=center;verticalAlign=middle;whiteSpace=wrap;",
  NOTES_STYLE:
    "text;html=1;fontSize=10;fontColor=#666666;fontStyle=2;align=center;verticalAlign=top;whiteSpace=wrap;",
  ANNOTATION_STYLE:
    "text;html=1;fontSize=9;fontColor=#333333;align=center;verticalAlign=middle;whiteSpace=wrap;",
  DIMENSION_STYLE:
    "endArrow=block;endFill=1;startArrow=block;startFill=1;strokeWidth=1;strokeColor=#CC0000;dashed=1;dashPattern=4 4;",
  CABLE_STYLE:
    "endArrow=none;strokeWidth=1.5;strokeColor=#333333;rounded=1;exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;",
  CABLE_STYLE_HORIZ:
    "endArrow=none;strokeWidth=1.5;strokeColor=#333333;rounded=1;",

  // Ground plane
  GROUND_PLANE_Y: 480,
  GROUND_PLANE_W: 700,
  GROUND_PLANE_H: 20,
  GROUND_PLANE_STYLE:
    "fillColor=#CCCCCC;strokeColor=#999999;fontSize=10;fontStyle=0;whiteSpace=wrap;html=1;",

  // EUT table
  TABLE_Y: 320,
  TABLE_W: 140,
  TABLE_H: 140,
  TABLE_STYLE:
    "fillColor=none;strokeColor=#666666;strokeWidth=2;fontSize=9;fontColor=#666666;verticalAlign=bottom;whiteSpace=wrap;html=1;",

  // EUT
  EUT_W: 100,
  EUT_H: 50,
  EUT_STYLE:
    "fillColor=#DAE8FC;strokeColor=#6C8EBF;fontStyle=1;fontSize=11;whiteSpace=wrap;html=1;",

  // Antenna
  ANTENNA_W: 40,
  ANTENNA_H: 50,
  ANTENNA_STYLE:
    "shape=mxgraph.electrical.signal_sources.signal_transducer;fillColor=#F5F5F5;strokeColor=#666666;fontStyle=1;fontSize=10;whiteSpace=wrap;html=1;",

  // Antenna mast
  MAST_W: 6,
  MAST_STYLE:
    "fillColor=#999999;strokeColor=#666666;fontSize=0;whiteSpace=wrap;html=1;",

  // Test equipment boxes
  EQUIP_W: 90,
  EQUIP_H: 45,
  EQUIP_X: 560,
  EQUIP_START_Y: 120,
  EQUIP_SPACING: 65,

  // Equipment-specific styles
  SA_STYLE:
    "fillColor=#E1D5E7;strokeColor=#9673A6;fontStyle=1;fontSize=10;whiteSpace=wrap;html=1;rounded=1;",
  SIG_GEN_STYLE:
    "fillColor=#FFF2CC;strokeColor=#D6B656;fontStyle=1;fontSize=10;whiteSpace=wrap;html=1;rounded=1;",
  PA_STYLE:
    "shape=mxgraph.electrical.signal_sources.amplifier;fillColor=#D5E8D4;strokeColor=#82B366;fontStyle=1;fontSize=10;whiteSpace=wrap;html=1;",
  PA_BOX_STYLE:
    "fillColor=#D5E8D4;strokeColor=#82B366;fontStyle=1;fontSize=10;whiteSpace=wrap;html=1;rounded=1;",
  PWR_METER_STYLE:
    "fillColor=#F8CECC;strokeColor=#B85450;fontStyle=1;fontSize=10;whiteSpace=wrap;html=1;rounded=1;",
  LISN_STYLE:
    "fillColor=#FFE6CC;strokeColor=#D79B00;fontStyle=1;fontSize=10;whiteSpace=wrap;html=1;rounded=1;",
  BCI_STYLE:
    "fillColor=#FFE6CC;strokeColor=#D79B00;fontStyle=1;fontSize=10;whiteSpace=wrap;html=1;",
};

// Equipment display labels and styles
const EQUIPMENT_INFO = {
  eut: { label: "EUT", style: EMC_LAYOUT.EUT_STYLE },
  eut_table: { label: "Test Table\n0.8m", style: EMC_LAYOUT.TABLE_STYLE },
  antenna: { label: "ANT", style: EMC_LAYOUT.ANTENNA_STYLE },
  antenna_mast: { label: "", style: EMC_LAYOUT.MAST_STYLE },
  spectrum_analyzer: { label: "Spectrum\nAnalyzer", style: EMC_LAYOUT.SA_STYLE },
  signal_generator: { label: "Signal\nGenerator", style: EMC_LAYOUT.SIG_GEN_STYLE },
  power_amplifier: { label: "Power\nAmplifier", style: EMC_LAYOUT.PA_BOX_STYLE },
  power_meter: { label: "Power\nMeter", style: EMC_LAYOUT.PWR_METER_STYLE },
  lisn: { label: "LISN", style: EMC_LAYOUT.LISN_STYLE },
  bci_probe: { label: "BCI\nProbe", style: EMC_LAYOUT.BCI_STYLE },
  ground_plane: { label: "Ground Plane", style: EMC_LAYOUT.GROUND_PLANE_STYLE },
};

/**
 * Render a distance dimension annotation between two x-coordinates at a given y.
 *
 * @param {Array} cells - Array to push cells into
 * @param {number} x1 - Left x coordinate
 * @param {number} x2 - Right x coordinate
 * @param {number} y - Y coordinate for the dimension line
 * @param {string} label - Dimension text
 */
function addDimensionH(cells, x1, x2, y, label) {
  // Dimension line (edge with arrows at both ends)
  const leftPoint = cell({
    value: "",
    style: "shape=point;size=0;fillColor=none;strokeColor=none;",
    x: x1,
    y: y,
    w: 1,
    h: 1,
    connectable: 0,
  });
  const rightPoint = cell({
    value: "",
    style: "shape=point;size=0;fillColor=none;strokeColor=none;",
    x: x2,
    y: y,
    w: 1,
    h: 1,
    connectable: 0,
  });

  cells.push(leftPoint, rightPoint);

  cells.push(
    edge({
      style: EMC_LAYOUT.DIMENSION_STYLE,
      source: leftPoint.cellId,
      target: rightPoint.cellId,
    })
  );

  // Label in the middle
  const midX = (x1 + x2) / 2 - 30;
  cells.push(
    cell({
      value: label,
      style: "text;html=1;fontSize=9;fontColor=#CC0000;fontStyle=1;align=center;verticalAlign=middle;whiteSpace=wrap;fillColor=#FFFFFF;",
      x: midX,
      y: y - 12,
      w: 60,
      h: 20,
    })
  );
}

/**
 * Generate the complete EMC test setup diagram.
 *
 * @param {object} opts
 * @param {string} opts.template - Template key from emc-standards.json
 * @param {object} [opts.equipment_overrides] - Override equipment labels
 * @param {string} [opts.title] - Diagram title
 * @param {boolean} [opts.show_distances=true] - Show distance annotations
 * @returns {string} mxGraphModel XML
 */
export function generateEmcTestSetup({
  template,
  equipment_overrides = {},
  title,
  show_distances = true,
}) {
  resetIdCounter();

  const tmpl = emcStandards.templates[template];
  if (!tmpl) {
    throw new Error(
      `Unknown EMC template: "${template}". Available: ${Object.keys(emcStandards.templates).join(", ")}`
    );
  }

  const equipment = tmpl.equipment;
  const distances = tmpl.distances || {};
  const cells = [];

  // Determine diagram width
  const diagramWidth = 760;

  // --- Title ---
  const diagramTitle = title || tmpl.name;
  cells.push(
    cell({
      value: diagramTitle,
      style: EMC_LAYOUT.TITLE_STYLE,
      x: 0,
      y: EMC_LAYOUT.TITLE_Y,
      w: diagramWidth,
      h: 30,
    })
  );

  // --- Notes ---
  cells.push(
    cell({
      value: tmpl.notes,
      style: EMC_LAYOUT.NOTES_STYLE,
      x: 0,
      y: EMC_LAYOUT.TITLE_Y + 32,
      w: diagramWidth,
      h: 20,
    })
  );

  // --- Ground plane ---
  const gpX = (diagramWidth - EMC_LAYOUT.GROUND_PLANE_W) / 2;
  let groundPlaneCell = null;
  if (equipment.includes("ground_plane")) {
    groundPlaneCell = cell({
      value: EQUIPMENT_INFO.ground_plane.label,
      style: EMC_LAYOUT.GROUND_PLANE_STYLE,
      x: gpX,
      y: EMC_LAYOUT.GROUND_PLANE_Y,
      w: EMC_LAYOUT.GROUND_PLANE_W,
      h: EMC_LAYOUT.GROUND_PLANE_H,
    });
    cells.push(groundPlaneCell);
  }

  // --- EUT table (if present) ---
  const tableX = EMC_LAYOUT.MARGIN_LEFT + 80;
  let eutTableCell = null;
  if (equipment.includes("eut_table")) {
    const tableLabel = equipment_overrides.eut_table || EQUIPMENT_INFO.eut_table.label;
    eutTableCell = cell({
      value: tableLabel,
      style: EMC_LAYOUT.TABLE_STYLE,
      x: tableX,
      y: EMC_LAYOUT.TABLE_Y,
      w: EMC_LAYOUT.TABLE_W,
      h: EMC_LAYOUT.TABLE_H,
    });
    cells.push(eutTableCell);
  }

  // --- EUT ---
  let eutCell = null;
  if (equipment.includes("eut")) {
    const eutLabel = equipment_overrides.eut || EQUIPMENT_INFO.eut.label;
    const eutX = equipment.includes("eut_table")
      ? tableX + (EMC_LAYOUT.TABLE_W - EMC_LAYOUT.EUT_W) / 2
      : EMC_LAYOUT.MARGIN_LEFT + 100;
    const eutY = equipment.includes("eut_table")
      ? EMC_LAYOUT.TABLE_Y - EMC_LAYOUT.EUT_H + 10
      : EMC_LAYOUT.GROUND_PLANE_Y - 80;

    eutCell = cell({
      value: eutLabel,
      style: EMC_LAYOUT.EUT_STYLE,
      x: eutX,
      y: eutY,
      w: EMC_LAYOUT.EUT_W,
      h: EMC_LAYOUT.EUT_H,
    });
    cells.push(eutCell);
  }

  // --- Antenna and mast (if present) ---
  const antennaBaseX = 360;
  let antennaCell = null;
  if (equipment.includes("antenna")) {
    // Mast
    if (equipment.includes("antenna_mast")) {
      const mastH = 160;
      const mastY = EMC_LAYOUT.GROUND_PLANE_Y - mastH;
      cells.push(
        cell({
          value: "",
          style: EMC_LAYOUT.MAST_STYLE,
          x: antennaBaseX + (EMC_LAYOUT.ANTENNA_W - EMC_LAYOUT.MAST_W) / 2,
          y: mastY,
          w: EMC_LAYOUT.MAST_W,
          h: mastH,
        })
      );

      // Height annotation
      if (show_distances && distances.antenna_height_range_m) {
        const range = distances.antenna_height_range_m;
        cells.push(
          cell({
            value: `${range[0]}m - ${range[1]}m`,
            style: "text;html=1;fontSize=9;fontColor=#CC0000;fontStyle=2;align=left;verticalAlign=middle;whiteSpace=wrap;",
            x: antennaBaseX + EMC_LAYOUT.ANTENNA_W + 5,
            y: mastY + mastH / 2 - 10,
            w: 70,
            h: 20,
          })
        );
      }
    }

    // Antenna symbol on top of mast
    const antennaY = equipment.includes("antenna_mast")
      ? EMC_LAYOUT.GROUND_PLANE_Y - 160 - EMC_LAYOUT.ANTENNA_H
      : EMC_LAYOUT.GROUND_PLANE_Y - 120;

    const antennaLabel = equipment_overrides.antenna || EQUIPMENT_INFO.antenna.label;
    antennaCell = cell({
      value: antennaLabel,
      style: EMC_LAYOUT.ANTENNA_STYLE,
      x: antennaBaseX,
      y: antennaY,
      w: EMC_LAYOUT.ANTENNA_W,
      h: EMC_LAYOUT.ANTENNA_H,
    });
    cells.push(antennaCell);
  }

  // --- BCI probe (if present) ---
  let bciCell = null;
  if (equipment.includes("bci_probe")) {
    const bciLabel = equipment_overrides.bci_probe || EQUIPMENT_INFO.bci_probe.label;
    // Place BCI probe on the cable harness between EUT and ground plane
    const bciX = eutCell
      ? eutCell.x + EMC_LAYOUT.EUT_W + 40
      : EMC_LAYOUT.MARGIN_LEFT + 220;
    const bciY = EMC_LAYOUT.GROUND_PLANE_Y - 100;

    bciCell = cell({
      value: bciLabel,
      style: EMC_LAYOUT.BCI_STYLE,
      x: bciX,
      y: bciY,
      w: 50,
      h: 30,
    });
    cells.push(bciCell);

    // Harness line from EUT through BCI to right
    if (eutCell) {
      cells.push(
        edge({
          style: "endArrow=none;strokeWidth=2;strokeColor=#666666;",
          source: eutCell.cellId,
          target: bciCell.cellId,
        })
      );
    }
  }

  // --- LISN (if present) ---
  let lisnCell = null;
  if (equipment.includes("lisn")) {
    const lisnLabel = equipment_overrides.lisn || EQUIPMENT_INFO.lisn.label;
    // Place LISN to the left of EUT, near ground plane
    const lisnX = EMC_LAYOUT.MARGIN_LEFT;
    const lisnY = EMC_LAYOUT.GROUND_PLANE_Y - 70;

    lisnCell = cell({
      value: lisnLabel,
      style: EMC_LAYOUT.LISN_STYLE,
      x: lisnX,
      y: lisnY,
      w: EMC_LAYOUT.EQUIP_W,
      h: EMC_LAYOUT.EQUIP_H,
    });
    cells.push(lisnCell);

    // Cable from LISN to EUT
    if (eutCell) {
      cells.push(
        edge({
          style: "endArrow=none;strokeWidth=1.5;strokeColor=#333333;rounded=1;",
          source: lisnCell.cellId,
          target: eutCell.cellId,
        })
      );
    }
  }

  // --- Test equipment rack (right side) ---
  const rackEquipment = equipment.filter((e) =>
    ["spectrum_analyzer", "signal_generator", "power_amplifier", "power_meter"].includes(e)
  );

  const equipCells = {};
  let equipIdx = 0;
  for (const equipType of rackEquipment) {
    const info = EQUIPMENT_INFO[equipType];
    const label = equipment_overrides[equipType] || info.label;
    const y = EMC_LAYOUT.EQUIP_START_Y + equipIdx * EMC_LAYOUT.EQUIP_SPACING;

    const equipCell = cell({
      value: label,
      style: info.style,
      x: EMC_LAYOUT.EQUIP_X,
      y: y,
      w: EMC_LAYOUT.EQUIP_W,
      h: EMC_LAYOUT.EQUIP_H,
    });
    cells.push(equipCell);
    equipCells[equipType] = equipCell;
    equipIdx++;
  }

  // --- Cables connecting equipment ---
  // Connect based on template type
  if (template === "cispr25_re") {
    // SA <-> Antenna
    if (equipCells.spectrum_analyzer && antennaCell) {
      cells.push(
        edge({
          style: EMC_LAYOUT.CABLE_STYLE_HORIZ,
          source: equipCells.spectrum_analyzer.cellId,
          target: antennaCell.cellId,
        })
      );
    }
    // LISN <-> SA (monitoring path)
    if (lisnCell && equipCells.spectrum_analyzer) {
      cells.push(
        edge({
          style: "endArrow=none;strokeWidth=1;strokeColor=#999999;dashed=1;dashPattern=4 4;rounded=1;",
          source: lisnCell.cellId,
          target: equipCells.spectrum_analyzer.cellId,
        })
      );
    }
  } else if (template === "cispr25_ce") {
    // SA <-> LISN
    if (equipCells.spectrum_analyzer && lisnCell) {
      cells.push(
        edge({
          style: EMC_LAYOUT.CABLE_STYLE_HORIZ,
          source: equipCells.spectrum_analyzer.cellId,
          target: lisnCell.cellId,
        })
      );
    }
  } else if (template === "iso11452_2_ri") {
    // Signal path: Sig Gen -> PA -> Power Meter -> Antenna
    const sigPath = ["signal_generator", "power_amplifier", "power_meter"];
    for (let i = 0; i < sigPath.length - 1; i++) {
      const src = equipCells[sigPath[i]];
      const tgt = equipCells[sigPath[i + 1]];
      if (src && tgt) {
        cells.push(
          edge({
            style: "endArrow=block;endFill=1;strokeWidth=1.5;strokeColor=#333333;rounded=1;",
            source: src.cellId,
            target: tgt.cellId,
          })
        );
      }
    }
    // PA/Power meter -> Antenna
    const lastEquip = equipCells.power_meter || equipCells.power_amplifier;
    if (lastEquip && antennaCell) {
      cells.push(
        edge({
          style: "endArrow=block;endFill=1;strokeWidth=1.5;strokeColor=#333333;rounded=1;",
          source: lastEquip.cellId,
          target: antennaCell.cellId,
        })
      );
    }
  } else if (template === "iso11452_4_ci") {
    // Signal path: Sig Gen -> PA -> Power Meter -> BCI probe
    const sigPath = ["signal_generator", "power_amplifier", "power_meter"];
    for (let i = 0; i < sigPath.length - 1; i++) {
      const src = equipCells[sigPath[i]];
      const tgt = equipCells[sigPath[i + 1]];
      if (src && tgt) {
        cells.push(
          edge({
            style: "endArrow=block;endFill=1;strokeWidth=1.5;strokeColor=#333333;rounded=1;",
            source: src.cellId,
            target: tgt.cellId,
          })
        );
      }
    }
    // Power meter -> BCI probe
    if (equipCells.power_meter && bciCell) {
      cells.push(
        edge({
          style: "endArrow=block;endFill=1;strokeWidth=1.5;strokeColor=#333333;rounded=1;",
          source: equipCells.power_meter.cellId,
          target: bciCell.cellId,
        })
      );
    }
  }

  // --- Distance annotations ---
  if (show_distances) {
    const dimY = EMC_LAYOUT.GROUND_PLANE_Y + 50;

    if (distances.antenna_to_eut_m && eutCell && antennaCell) {
      const eutCenterX = eutCell.x + EMC_LAYOUT.EUT_W / 2;
      const antCenterX = antennaCell.x + EMC_LAYOUT.ANTENNA_W / 2;
      addDimensionH(cells, eutCenterX, antCenterX, dimY, `${distances.antenna_to_eut_m} m`);
    }

    if (distances.lisn_to_eut_m && lisnCell && eutCell) {
      const lisnCenterX = lisnCell.x + EMC_LAYOUT.EQUIP_W / 2;
      const eutCenterX = eutCell.x + EMC_LAYOUT.EUT_W / 2;
      addDimensionH(cells, lisnCenterX, eutCenterX, dimY, `${distances.lisn_to_eut_m} m`);
    }

    if (distances.probe_to_eut_m && bciCell && eutCell) {
      const bciCenterX = bciCell.x + 25;
      const eutCenterX = eutCell.x + EMC_LAYOUT.EUT_W / 2;
      addDimensionH(cells, eutCenterX, bciCenterX, dimY, `${distances.probe_to_eut_m} m`);
    }
  }

  return createDiagram({ cells });
}
