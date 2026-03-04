import { readFileSync } from "fs";
import { extname } from "path";
import { createDiagram, cell, edge, resetIdCounter } from "../core/xml-builder.js";

export const markupSchematicTool = {
  name: "markup_schematic",
  description:
    "Opens a schematic screenshot in draw.io with engineering annotations overlaid. " +
    "The original image becomes a locked background layer. Annotations (redline circles, " +
    "revision clouds, delta callouts, arrows, text notes) are placed on a foreground layer. " +
    "Use this to mark up existing schematics with proposed changes, issues, or review comments. " +
    "Claude can analyze a screenshot with vision first, then call this tool with coordinates " +
    "and descriptions for each annotation.",
  inputSchema: {
    type: "object",
    properties: {
      image_path: {
        type: "string",
        description: "Absolute path to the schematic image file (PNG, JPG, etc.)",
      },
      annotations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "redline_circle",
                "revision_cloud",
                "delta_callout",
                "arrow",
                "text_note",
              ],
              description: "Annotation type",
            },
            x: {
              type: "number",
              description: "X position (pixels from left of image)",
            },
            y: {
              type: "number",
              description: "Y position (pixels from top of image)",
            },
            w: {
              type: "number",
              description: "Width (for circles/clouds/callouts). Default: 60-150 depending on type",
            },
            h: {
              type: "number",
              description: "Height (for circles/clouds/callouts). Default: auto",
            },
            text: {
              type: "string",
              description: "Annotation text/comment",
            },
            target_x: {
              type: "number",
              description: "Arrow endpoint X (for arrow type only)",
            },
            target_y: {
              type: "number",
              description: "Arrow endpoint Y (for arrow type only)",
            },
            color: {
              type: "string",
              description: "Annotation color hex. Default: #FF0000 (red)",
            },
          },
          required: ["type", "x", "y"],
        },
        description: "Array of annotations to overlay on the schematic",
      },
      title: {
        type: "string",
        description: "Optional title for the markup diagram",
      },
      image_width: {
        type: "number",
        description: "Display width of the image in pixels. Default: 800",
      },
      image_height: {
        type: "number",
        description: "Display height of the image in pixels. Default: 600",
      },
    },
    required: ["image_path", "annotations"],
  },
  type: "xml",
  isGenerator: true,
  generate(args) {
    const {
      image_path,
      annotations,
      title,
      image_width = 800,
      image_height = 600,
    } = args;

    resetIdCounter();

    // Read and base64-encode the image
    const imageData = readFileSync(image_path);
    const ext = extname(image_path).slice(1).toLowerCase();
    const mimeMap = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", bmp: "image/bmp", webp: "image/webp" };
    const mimeType = mimeMap[ext] || `image/${ext}`;
    const base64 = imageData.toString("base64");
    const dataUri = `data:${mimeType};base64,${base64}`;

    const cells = [];
    const titleH = title ? 35 : 0;

    // Title
    if (title) {
      cells.push(
        cell({
          value: title,
          style: "text;html=1;fontSize=14;fontStyle=1;align=left;verticalAlign=middle;",
          x: 0,
          y: 0,
          w: 500,
          h: 30,
        })
      );
    }

    // Background image (locked)
    cells.push(
      cell({
        value: "",
        style: `shape=image;image=${dataUri};imageAspect=0;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;movable=0;resizable=0;deletable=0;editable=0;connectable=0;`,
        x: 0,
        y: titleH,
        w: image_width,
        h: image_height,
        connectable: 0,
      })
    );

    // Render annotations
    for (const ann of annotations) {
      const color = ann.color || "#FF0000";
      const x = ann.x;
      const y = ann.y + titleH;

      switch (ann.type) {
        case "redline_circle":
          cells.push(
            cell({
              value: ann.text || "",
              style: `ellipse;whiteSpace=wrap;fillColor=none;strokeColor=${color};strokeWidth=3;fontColor=${color};fontSize=10;fontStyle=1;`,
              x,
              y,
              w: ann.w || 60,
              h: ann.h || 60,
            })
          );
          break;

        case "revision_cloud":
          cells.push(
            cell({
              value: ann.text || "",
              style: `shape=mxgraph.basic.cloud_callout;fillColor=none;strokeColor=${color};strokeWidth=2;fontColor=${color};fontSize=10;fontStyle=1;`,
              x,
              y,
              w: ann.w || 120,
              h: ann.h || 80,
            })
          );
          break;

        case "delta_callout":
          cells.push(
            cell({
              value: `\u0394 ${ann.text || ""}`,
              style: `shape=callout;whiteSpace=wrap;fillColor=#FFF2CC;strokeColor=${color};strokeWidth=2;fontColor=#333333;fontSize=10;fontStyle=1;perimeter=calloutPerimeter;size=10;position=0.5;position2=1;base=20;`,
              x,
              y,
              w: ann.w || 140,
              h: ann.h || 60,
            })
          );
          break;

        case "arrow": {
          const tx = ann.target_x ?? x + 100;
          const ty = (ann.target_y ?? ann.y) + titleH;
          cells.push(
            edge({
              value: ann.text || "",
              style: `endArrow=open;strokeColor=${color};strokeWidth=3;fontColor=${color};fontSize=10;fontStyle=1;exitX=0;exitY=0;entryX=0;entryY=0;`,
              points: [
                { x, y },
                { x: tx, y: ty },
              ],
            })
          );
          break;
        }

        case "text_note":
          cells.push(
            cell({
              value: ann.text || "",
              style: `text;html=1;fillColor=#FFF2CC;strokeColor=${color};strokeWidth=1;fontColor=#333333;fontSize=10;rounded=1;arcSize=10;spacingLeft=4;spacingRight=4;`,
              x,
              y,
              w: ann.w || 150,
              h: ann.h || 40,
            })
          );
          break;
      }
    }

    return createDiagram({ cells });
  },
};
