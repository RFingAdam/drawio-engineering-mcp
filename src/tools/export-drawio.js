import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { generateDrawioUrl } from "../core/compression.js";

export const exportDrawioTool = {
  name: "export_drawio",
  description:
    "Exports a draw.io diagram XML to an SVG or PNG file. " +
    "For SVG export, the diagram is converted locally without requiring a browser. " +
    "For PNG export, a headless browser (puppeteer) is used if available. " +
    "Returns the file path of the exported image.",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The draw.io XML content (mxGraphModel format) to export",
      },
      format: {
        type: "string",
        enum: ["svg", "png"],
        description: "Export format. Default: svg",
      },
      output_path: {
        type: "string",
        description:
          "Output file path. If not specified, a temporary file is created.",
      },
      width: {
        type: "number",
        description: "Output width in pixels (PNG only). Default: 800",
      },
      height: {
        type: "number",
        description: "Output height in pixels (PNG only). Default: 600",
      },
    },
    required: ["content"],
  },
  isExporter: true,

  /**
   * Export diagram content to a file.
   * @param {object} args - Tool arguments
   * @returns {object} Result with file path
   */
  async export(args) {
    const {
      content,
      format = "svg",
      output_path,
      width = 800,
      height = 600,
    } = args;

    if (format === "svg") {
      return exportSvg(content, output_path);
    } else if (format === "png") {
      return exportPng(content, output_path, width, height);
    } else {
      throw new Error(`Unsupported format: "${format}". Use "svg" or "png".`);
    }
  },
};

/**
 * Generate a basic SVG from mxGraphModel XML.
 * This produces a simplified SVG representation without requiring a browser.
 */
function exportSvg(xmlContent, outputPath) {
  const outFile =
    outputPath || join(tmpdir(), `drawio-export-${Date.now()}.svg`);

  // Wrap the mxGraphModel XML in an SVG foreignObject for portability
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     version="1.1" width="800" height="600" viewBox="0 0 800 600">
  <defs/>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">
      <!-- draw.io diagram embedded as XML data -->
      <pre style="display:none">${escapeHtml(xmlContent)}</pre>
      <p style="font-family:sans-serif;color:#666;text-align:center;padding-top:280px;">
        draw.io diagram (open in draw.io for full rendering)
      </p>
    </div>
  </foreignObject>
  <!-- Raw XML stored for re-import -->
  <desc>${escapeHtml(xmlContent)}</desc>
</svg>`;

  writeFileSync(outFile, svg, "utf-8");

  return {
    file_path: outFile,
    format: "svg",
    note:
      "SVG export embeds the diagram XML. For full visual rendering, " +
      "open the original XML in draw.io or use PNG export with puppeteer.",
  };
}

/**
 * Export to PNG using puppeteer-core (optional dependency).
 */
async function exportPng(xmlContent, outputPath, width, height) {
  const outFile =
    outputPath || join(tmpdir(), `drawio-export-${Date.now()}.png`);

  let puppeteer;
  try {
    puppeteer = await import("puppeteer-core");
  } catch {
    throw new Error(
      "PNG export requires puppeteer-core. Install with: npm install puppeteer-core\n" +
        "Also ensure a Chromium browser is installed (e.g., npx puppeteer browsers install chrome)."
    );
  }

  const url = generateDrawioUrl(xmlContent, "xml", {
    lightbox: true,
    dark: false,
    extraParams: {},
  });

  const browser = await puppeteer.default.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    // Wait for draw.io to render
    await page.waitForTimeout(2000);

    await page.screenshot({ path: outFile, fullPage: false });
  } finally {
    await browser.close();
  }

  return {
    file_path: outFile,
    format: "png",
    width,
    height,
  };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
