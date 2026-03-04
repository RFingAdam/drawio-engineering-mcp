#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { generateDrawioUrl } from "./core/compression.js";
import { openBrowser } from "./core/browser.js";

import { openXmlTool } from "./tools/open-xml.js";
import { openCsvTool } from "./tools/open-csv.js";
import { openMermaidTool } from "./tools/open-mermaid.js";
import { openEngineeringTool } from "./tools/open-engineering.js";
import { createRfBlockDiagramTool } from "./tools/create-rf-block-diagram.js";

// All registered tools
const allTools = [openXmlTool, openCsvTool, openMermaidTool, openEngineeringTool, createRfBlockDiagramTool];

// Build a lookup map: tool name -> tool definition
const toolMap = new Map(allTools.map((t) => [t.name, t]));

// Create the MCP server
const server = new Server(
  {
    name: "drawio-engineering-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    })),
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const tool = toolMap.get(name);

    if (!tool) {
      return {
        content: [{ type: "text", text: `Error: Unknown tool "${name}"` }],
        isError: true,
      };
    }

    // Generator tools: produce XML from structured input
    if (tool.isGenerator) {
      const xmlContent = tool.generate(args);

      // If auto_open is explicitly false, return XML without opening browser
      if (args?.auto_open === false) {
        return {
          content: [{ type: "text", text: `Generated diagram XML:\n\n${xmlContent}` }],
        };
      }

      const lightbox = args?.lightbox === true;
      const darkArg = args?.dark;
      const dark = darkArg === "true" ? true : darkArg === "false" ? false : "auto";
      const extraParams = tool.getExtraParams ? tool.getExtraParams(args) : {};

      const url = generateDrawioUrl(xmlContent, tool.type, {
        lightbox,
        dark,
        extraParams,
      });

      openBrowser(url);

      let responseText = `Draw.io Editor URL:\n${url}\n\nThe diagram has been opened in your default browser.`;
      responseText += `\n\nGenerated XML:\n${xmlContent}`;

      return {
        content: [{ type: "text", text: responseText }],
      };
    }

    // Passthrough tools: require content parameter
    const inputContent = args?.content;

    if (!inputContent) {
      return {
        content: [{ type: "text", text: "Error: content parameter is required" }],
        isError: true,
      };
    }

    const lightbox = args?.lightbox === true;
    const darkArg = args?.dark;
    const dark = darkArg === "true" ? true : darkArg === "false" ? false : "auto";

    // Get extra URL params from tool (e.g., engineering stencil clibs)
    const extraParams = tool.getExtraParams ? tool.getExtraParams(args) : {};

    const url = generateDrawioUrl(inputContent, tool.type, {
      lightbox,
      dark,
      extraParams,
    });

    openBrowser(url);

    let responseText = `Draw.io Editor URL:\n${url}\n\nThe diagram has been opened in your default browser.`;

    if (name === "open_drawio_engineering" && extraParams.clibs) {
      responseText += "\n\nEngineering stencil libraries have been loaded in the sidebar.";
    }

    return {
      content: [{ type: "text", text: responseText }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("drawio-engineering-mcp server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
