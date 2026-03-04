export const openMermaidTool = {
  name: "open_drawio_mermaid",
  description:
    "Opens the draw.io editor with a diagram generated from Mermaid.js syntax. " +
    "Supports flowcharts, sequence diagrams, class diagrams, state diagrams, " +
    "entity relationship diagrams, and more using Mermaid.js syntax.",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description:
          "The Mermaid.js diagram definition. " +
          "Example: 'graph TD; A-->B; B-->C;'",
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
  type: "mermaid",
};
