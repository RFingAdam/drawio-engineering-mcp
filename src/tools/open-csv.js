export const openCsvTool = {
  name: "open_drawio_csv",
  description:
    "Opens the draw.io editor with a diagram generated from CSV data. " +
    "The CSV format should follow draw.io's CSV import specification which allows " +
    "creating org charts, flowcharts, and other diagrams from tabular data.",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The CSV content following draw.io's CSV import format.",
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
  type: "csv",
};
