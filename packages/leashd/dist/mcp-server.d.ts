import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Governor } from "./governor";
import type { Store } from "./store";
import type { LeashConfig } from "./config";
export declare function createMcpServer(deps: {
    governor: Governor;
    store: Store;
    config: LeashConfig;
}): McpServer;
export declare function startMcpServer(server: McpServer): Promise<void>;
//# sourceMappingURL=mcp-server.d.ts.map