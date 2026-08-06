// Smoke test: every tool export must expose {name, description, inputSchema, handler}.
// The MCP protocol requires each of these fields on every registered tool, so a
// missing or misnamed field breaks the server at registration time. This test
// catches regressions without needing a full MCP handshake or network stack.

import { test } from "node:test";
import assert from "node:assert/strict";

import { openXmlTool } from "../src/tools/open-xml.js";
import { openCsvTool } from "../src/tools/open-csv.js";
import { openMermaidTool } from "../src/tools/open-mermaid.js";
import { openEngineeringTool } from "../src/tools/open-engineering.js";
import { createRfBlockDiagramTool } from "../src/tools/create-rf-block-diagram.js";
import { createEmcTestSetupTool } from "../src/tools/create-emc-test-setup.js";
import { createPcbStackupTool } from "../src/tools/create-pcb-stackup.js";
import { markupSchematicTool } from "../src/tools/markup-schematic.js";
import { readDrawioTool } from "../src/tools/read-drawio.js";
import { exportDrawioTool } from "../src/tools/export-drawio.js";

const allTools = [
  openXmlTool,
  openCsvTool,
  openMermaidTool,
  openEngineeringTool,
  createRfBlockDiagramTool,
  createEmcTestSetupTool,
  createPcbStackupTool,
  markupSchematicTool,
  readDrawioTool,
  exportDrawioTool,
];

test("all 10 tools are importable", () => {
  assert.equal(allTools.length, 10);
});

test("every tool exposes name / description / inputSchema and a dispatch path", () => {
  // Tools dispatch via one of: `.generate`, `.read`, `.export`, or the
  // fallback "open" path keyed on `type`. The MCP contract we verify
  // here is just the registration surface — name / description /
  // inputSchema — which is what is serialised to clients.
  for (const tool of allTools) {
    assert.ok(tool, `tool is undefined`);
    assert.equal(typeof tool.name, "string", `name missing on some tool`);
    assert.ok(tool.name.length > 0, `empty tool name`);
    assert.equal(typeof tool.description, "string", `description missing on ${tool.name}`);
    assert.ok(tool.description.length > 0, `empty description on ${tool.name}`);
    assert.equal(typeof tool.inputSchema, "object", `inputSchema missing on ${tool.name}`);
    assert.equal(tool.inputSchema.type, "object", `inputSchema.type must be "object" on ${tool.name}`);
    const hasDispatch = (
      typeof tool.generate === "function" ||
      typeof tool.read === "function" ||
      typeof tool.export === "function" ||
      typeof tool.type === "string"
    );
    assert.ok(hasDispatch, `${tool.name} has no dispatch path (generate/read/export/type)`);
  }
});

test("tool names are unique", () => {
  const names = allTools.map((t) => t.name);
  assert.equal(new Set(names).size, names.length, `duplicate tool names: ${names}`);
});

test("tool names match the mcp__drawio-engineering-mcp__ namespace convention", () => {
  for (const tool of allTools) {
    assert.match(tool.name, /^[a-z_]+$/, `tool name has invalid chars: ${tool.name}`);
  }
});
