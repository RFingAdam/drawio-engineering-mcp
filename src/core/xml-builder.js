/**
 * XML builder utility for constructing draw.io mxGraphModel diagrams.
 *
 * Provides a programmatic API for creating cells (vertices) and edges,
 * then rendering them into a complete mxGraphModel XML string.
 *
 * IDs 0 and 1 are reserved by mxGraph for the root and default parent layer.
 */

let nextId = 2;

/**
 * Reset the internal ID counter to 2 (0 and 1 are reserved by mxGraph).
 */
export function resetIdCounter() {
  nextId = 2;
}

/**
 * Escape special XML characters in a string.
 */
function escapeXml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Render a single cell object to an XML string.
 */
function cellToXml(c) {
  const attrs = [];
  attrs.push(`id="${escapeXml(c.id)}"`);

  if (c.value != null) attrs.push(`value="${escapeXml(c.value)}"`);
  if (c.style != null) attrs.push(`style="${escapeXml(c.style)}"`);
  if (c.parent != null) attrs.push(`parent="${escapeXml(c.parent)}"`);
  if (c.vertex) attrs.push(`vertex="1"`);
  if (c.edge) attrs.push(`edge="1"`);
  if (c.source != null) attrs.push(`source="${escapeXml(c.source)}"`);
  if (c.target != null) attrs.push(`target="${escapeXml(c.target)}"`);
  if (c.connectable != null) attrs.push(`connectable="${c.connectable}"`);

  const hasGeometry = c.x != null || c.y != null || c.w != null || c.h != null;
  const hasPoints = c.points && c.points.length > 0;

  if (hasGeometry || hasPoints) {
    let xml = `      <mxCell ${attrs.join(" ")}>\n`;

    if (hasGeometry) {
      const geoAttrs = [];
      if (c.x != null) geoAttrs.push(`x="${c.x}"`);
      if (c.y != null) geoAttrs.push(`y="${c.y}"`);
      if (c.w != null) geoAttrs.push(`width="${c.w}"`);
      if (c.h != null) geoAttrs.push(`height="${c.h}"`);
      if (c.relative) geoAttrs.push(`relative="1"`);
      if (c.edge) geoAttrs.push(`as="geometry"`);
      else geoAttrs.push(`as="geometry"`);

      if (hasPoints) {
        xml += `        <mxGeometry ${geoAttrs.join(" ")}>\n`;
        xml += `          <Array as="points">\n`;
        for (const pt of c.points) {
          xml += `            <mxPoint x="${pt.x}" y="${pt.y}" />\n`;
        }
        xml += `          </Array>\n`;
        xml += `        </mxGeometry>\n`;
      } else {
        xml += `        <mxGeometry ${geoAttrs.join(" ")} />\n`;
      }
    } else if (hasPoints) {
      xml += `        <mxGeometry relative="1" as="geometry">\n`;
      xml += `          <Array as="points">\n`;
      for (const pt of c.points) {
        xml += `            <mxPoint x="${pt.x}" y="${pt.y}" />\n`;
      }
      xml += `          </Array>\n`;
      xml += `        </mxGeometry>\n`;
    }

    xml += `      </mxCell>\n`;
    return xml;
  }

  return `      <mxCell ${attrs.join(" ")} />\n`;
}

/**
 * Create a vertex cell object.
 *
 * @param {object} opts
 * @param {string} [opts.value] - Display label
 * @param {string} [opts.style] - mxGraph style string
 * @param {number} [opts.x] - X position
 * @param {number} [opts.y] - Y position
 * @param {number} [opts.w] - Width
 * @param {number} [opts.h] - Height
 * @param {boolean} [opts.vertex] - Mark as vertex (default true)
 * @param {string} [opts.parent] - Parent cell ID (default "1")
 * @param {string|number} [opts.id] - Cell ID (auto-assigned if omitted)
 * @param {number} [opts.connectable] - Connectable flag
 * @returns {object} Cell object with a cellId property for referencing
 */
export function cell({
  value,
  style,
  x,
  y,
  w,
  h,
  vertex = true,
  parent = "1",
  id,
  connectable,
} = {}) {
  const cellId = id != null ? String(id) : String(nextId++);
  return {
    id: cellId,
    cellId,
    value,
    style,
    x,
    y,
    w,
    h,
    vertex,
    parent,
    connectable,
  };
}

/**
 * Create an edge cell object.
 *
 * @param {object} opts
 * @param {string} [opts.value] - Edge label
 * @param {string} [opts.style] - mxGraph style string
 * @param {string} [opts.source] - Source cell ID
 * @param {string} [opts.target] - Target cell ID
 * @param {string} [opts.parent] - Parent cell ID (default "1")
 * @param {string|number} [opts.id] - Cell ID (auto-assigned if omitted)
 * @param {Array<{x: number, y: number}>} [opts.points] - Waypoints
 * @returns {object} Cell object
 */
export function edge({
  value,
  style,
  source,
  target,
  parent = "1",
  id,
  points,
} = {}) {
  const cellId = id != null ? String(id) : String(nextId++);
  return {
    id: cellId,
    cellId,
    value,
    style,
    source,
    target,
    edge: true,
    parent,
    points,
  };
}

/**
 * Create a complete mxGraphModel XML string from an array of cell objects.
 *
 * @param {object} opts
 * @param {Array} opts.cells - Array of cell objects from cell() and edge()
 * @returns {string} Complete mxGraphModel XML
 */
export function createDiagram({ cells }) {
  let xml = `<mxGraphModel>\n`;
  xml += `  <root>\n`;
  // Root cell (id=0) and default parent layer (id=1)
  xml += `      <mxCell id="0" />\n`;
  xml += `      <mxCell id="1" parent="0" />\n`;

  for (const c of cells) {
    xml += cellToXml(c);
  }

  xml += `  </root>\n`;
  xml += `</mxGraphModel>`;

  return xml;
}
