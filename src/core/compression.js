import pako from "pako";

const DRAWIO_BASE_URL = "https://app.diagrams.net/";

/**
 * Compresses data using pako deflateRaw and encodes as base64.
 * Matches the compression used by draw.io tools.
 */
export function compressData(data) {
  if (!data || data.length === 0) {
    return data;
  }
  const encoded = encodeURIComponent(data);
  const compressed = pako.deflateRaw(encoded);
  return Buffer.from(compressed).toString("base64");
}

/**
 * Generates a draw.io URL with the #create hash parameter.
 */
export function generateDrawioUrl(data, type, options = {}) {
  const {
    lightbox = false,
    border = 10,
    dark = false,
    edit = "_blank",
    extraParams = {},
  } = options;

  const compressedData = compressData(data);

  const createObj = {
    type: type,
    compressed: true,
    data: compressedData,
  };

  const params = new URLSearchParams();

  if (lightbox) {
    params.set("lightbox", "1");
    params.set("edit", "_blank");
    params.set("border", "10");
  } else {
    params.set("grid", "0");
    params.set("pv", "0");
  }

  if (dark === true) {
    params.set("dark", "1");
  }

  params.set("border", border.toString());
  params.set("edit", edit);

  for (const [key, value] of Object.entries(extraParams)) {
    params.set(key, value);
  }

  const createHash = "#create=" + encodeURIComponent(JSON.stringify(createObj));
  const paramsStr = params.toString();

  return DRAWIO_BASE_URL + (paramsStr ? "?" + paramsStr : "") + createHash;
}
