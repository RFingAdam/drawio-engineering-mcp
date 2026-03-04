import { spawn } from "child_process";

/**
 * Opens a URL in the default browser (cross-platform).
 */
export function openBrowser(url) {
  let child;

  if (process.platform === "win32") {
    child = spawn("cmd", ["/c", "start", "", url], { shell: false, stdio: "ignore" });
  } else if (process.platform === "darwin") {
    child = spawn("open", [url], { shell: false, stdio: "ignore" });
  } else {
    child = spawn("xdg-open", [url], { shell: false, stdio: "ignore" });
  }

  child.on("error", function (error) {
    console.error(`Failed to open browser: ${error.message}`);
  });

  child.unref();
}
