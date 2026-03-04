/**
 * Layout constants and styling utilities for RF signal chain diagrams.
 */

/** Spacing and positioning constants */
export const LAYOUT = {
  BLOCK_H_SPACING: 40,
  CHAIN_Y: 100,
  MARGIN_LEFT: 60,
  MARGIN_TOP: 60,
  INJECTION_Y_OFFSET: 160,
  ANNOTATION_Y_OFFSET: 40,
  TITLE_Y: 20,
  ARROW_STYLE:
    "endArrow=block;endFill=1;strokeWidth=2;strokeColor=#333333;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;",
  LO_ARROW_STYLE:
    "endArrow=block;endFill=1;strokeWidth=1.5;strokeColor=#9933FF;dashed=1;dashPattern=8 4;exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;",
  TITLE_STYLE:
    "text;html=1;fontSize=16;fontStyle=1;align=center;verticalAlign=middle;whiteSpace=wrap;",
  ANNOTATION_STYLE:
    "text;html=1;fontSize=9;fontColor=#666666;align=center;verticalAlign=top;whiteSpace=wrap;",
};

/** Color definitions for each component category */
export const COLORS = {
  amplifier: { fill: "#D5E8D4", stroke: "#82B366" },
  filter: { fill: "#DAE8FC", stroke: "#6C8EBF" },
  mixer: { fill: "#E1D5E7", stroke: "#9673A6" },
  attenuator: { fill: "#FFF2CC", stroke: "#D6B656" },
  converter: { fill: "#F8CECC", stroke: "#B85450" },
  oscillator: { fill: "#E1D5E7", stroke: "#9673A6" },
  antenna: { fill: "#F5F5F5", stroke: "#666666" },
  passive: { fill: "#FFF2CC", stroke: "#D6B656" },
  switch: { fill: "#FFE6CC", stroke: "#D79B00" },
  detector: { fill: "#F8CECC", stroke: "#B85450" },
  custom: { fill: "#F5F5F5", stroke: "#333333" },
};

/** Map block type names to their color category */
const TYPE_TO_CATEGORY = {
  lna: "amplifier",
  pa: "amplifier",
  amplifier: "amplifier",
  driver: "amplifier",
  bpf: "filter",
  lpf: "filter",
  hpf: "filter",
  notch: "filter",
  mixer: "mixer",
  attenuator: "attenuator",
  dsa: "attenuator",
  adc: "converter",
  dac: "converter",
  vco: "oscillator",
  oscillator: "oscillator",
  pll: "oscillator",
  antenna: "antenna",
  coupler: "passive",
  splitter: "passive",
  combiner: "passive",
  circulator: "passive",
  isolator: "passive",
  balun: "passive",
  duplexer: "passive",
  diplexer: "passive",
  switch: "switch",
  spdt: "switch",
  sp4t: "switch",
  detector: "detector",
  custom: "custom",
};

/**
 * Get the fill/stroke color pair for a given block type.
 * @param {string} type - Block type name
 * @returns {{ fill: string, stroke: string }}
 */
export function getColorForType(type) {
  const category = TYPE_TO_CATEGORY[type] || "custom";
  return COLORS[category] || COLORS.custom;
}

/**
 * Get the default block dimensions for a given type.
 * @param {string} type
 * @returns {{ w: number, h: number }}
 */
export function getBlockSize(type) {
  switch (type) {
    case "antenna":
      return { w: 50, h: 60 };
    case "mixer":
      return { w: 60, h: 60 };
    case "adc":
    case "dac":
      return { w: 80, h: 50 };
    case "vco":
    case "oscillator":
      return { w: 60, h: 60 };
    case "pll":
      return { w: 80, h: 50 };
    case "duplexer":
    case "diplexer":
      return { w: 90, h: 50 };
    case "coupler":
    case "splitter":
    case "combiner":
      return { w: 80, h: 50 };
    default:
      return { w: 80, h: 50 };
  }
}

/**
 * Build the complete draw.io style string for a block type.
 * @param {string} type - Block type name
 * @returns {string} mxGraph style string
 */
export function getShapeStyle(type) {
  const { fill, stroke } = getColorForType(type);
  const base = `fillColor=${fill};strokeColor=${stroke};fontStyle=1;fontSize=11;whiteSpace=wrap;html=1;`;

  switch (type) {
    // Amplifier types: use mxGraph amplifier shape
    case "lna":
    case "pa":
    case "amplifier":
    case "driver":
      return `shape=mxgraph.electrical.signal_sources.amplifier;${base}`;

    // Mixer: ellipse with X
    case "mixer":
      return `ellipse;${base}`;

    // Filter types: rounded rectangle
    case "bpf":
    case "lpf":
    case "hpf":
    case "notch":
      return `rounded=1;${base}`;

    // ADC: trapezoid
    case "adc":
      return `shape=trapezoid;perimeter=trapezoidPerimeter;${base}`;

    // DAC: flipped trapezoid
    case "dac":
      return `shape=trapezoid;perimeter=trapezoidPerimeter;flipH=1;${base}`;

    // Antenna: signal transducer shape
    case "antenna":
      return `shape=mxgraph.electrical.signal_sources.signal_transducer;${base}`;

    // Oscillator/VCO: ellipse
    case "vco":
    case "oscillator":
      return `ellipse;${base}`;

    // PLL: rounded rectangle
    case "pll":
      return `rounded=1;${base}`;

    // Attenuator types: rounded rectangle
    case "attenuator":
    case "dsa":
      return `rounded=1;${base}`;

    // Switch types
    case "switch":
    case "spdt":
    case "sp4t":
      return `rounded=1;${base}`;

    // Passive components: rounded rectangle
    case "coupler":
    case "splitter":
    case "combiner":
    case "circulator":
    case "isolator":
    case "balun":
    case "duplexer":
    case "diplexer":
      return `rounded=1;${base}`;

    // Detector
    case "detector":
      return `rounded=1;${base}`;

    // Custom / default
    default:
      return `rounded=0;${base}`;
  }
}
