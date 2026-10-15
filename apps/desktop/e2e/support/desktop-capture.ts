import { execFileSync } from "node:child_process";

/**
 * Captures the whole desktop including the title bar and window frame.
 * Playwright page.screenshot only captures the page. Implemented for Windows only, using PowerShell
 * and System.Drawing. Other platforms return false, and a failure returns false instead of failing the test.
 */
export function captureDesktop(file: string): boolean {
  if (process.platform !== "win32") return false;
  const path = file.replace(/'/g, "''");
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms,System.Drawing",
    "$b = [System.Windows.Forms.SystemInformation]::VirtualScreen",
    "$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height",
    "$g = [System.Drawing.Graphics]::FromImage($bmp)",
    "$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)",
    `$bmp.Save('${path}', [System.Drawing.Imaging.ImageFormat]::Png)`,
  ].join("; ");
  try {
    execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], { timeout: 30_000 });
    return true;
  } catch (error) {
    console.warn("desktop capture failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
