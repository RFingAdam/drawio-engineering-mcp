export const openXmlTool = {
  name: "open_drawio_xml",
  description:
    "Opens the draw.io editor with a diagram from XML content. " +
    "Use this to view, edit, or create diagrams in draw.io format. " +
    "The XML should be valid draw.io/mxGraph XML format. " +
    "IMPORTANT: Do NOT use double hyphens (--) inside XML comments, as this is invalid XML and will break the parser. Use single hyphens or rephrase instead.",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The draw.io XML content in mxGraphModel format.",
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
};
