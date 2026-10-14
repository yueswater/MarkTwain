import type { MarkTwainApi } from "../../shared/ipc";

declare global {
  interface Window {
    marktwain: MarkTwainApi;
  }
}
