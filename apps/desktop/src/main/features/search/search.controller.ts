import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { handle } from "../../core/ipc";
import type { SearchService } from "./search.service";

export function registerSearchController(service: SearchService): void {
  handle(IpcChannel.SearchQuery, ({ text, caseSensitive }) => service.search(text, caseSensitive));
}
