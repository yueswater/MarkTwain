import "@mui/material/styles";

/** Material 3 的「容器」色與 tertiary 角色；MUI 預設沒有這些欄位。 */
interface ContainerColor {
  container: string;
  onContainer: string;
}

declare module "@mui/material/styles" {
  interface Palette {
    tertiary: PaletteColor & ContainerColor;
  }
  interface PaletteOptions {
    tertiary?: PaletteColorOptions & ContainerColor;
  }
  interface PaletteColor {
    container?: string;
    onContainer?: string;
  }
  interface SimplePaletteColorOptions {
    container?: string;
    onContainer?: string;
  }
}
