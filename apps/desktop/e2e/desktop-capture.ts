import { execFileSync } from "node:child_process";

/**
 * 擷取整個桌面（含視窗標題列與系統外框），用來檢查 Windows 上的實際外觀。
 * Playwright 的 `page.screenshot` 只拍網頁內容。目前只實作 Windows（以 PowerShell 的
 * System.Drawing）；其他平台回傳 false。失敗不會讓測試失敗，只回傳 false。
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
