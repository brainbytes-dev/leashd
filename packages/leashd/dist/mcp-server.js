import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MoneyUnit, Rail } from "@repo/leash-core";
import { loadAgentPolicy } from "./policy";
/**
 * MCP server exposing the policy-gated payment toolset over stdio.
 *
 * SECURITY — anti tool-description-poisoning: the amount the governor acts on
 * comes ONLY from the structured `amount` tool argument (or, for an L402/x402
 * flow, the server-committed invoice), NEVER from `reason` or any free-text
 * field. We never parse a number out of prose.
 */
// Raw zod shape (SDK v1 inputSchema form).
const amountShape = z.object({
    unit: MoneyUnit,
    value: z.number().int().nonnegative(),
});
const payShape = {
    rail: Rail,
    amount: amountShape,
    endpoint: z.string().optional(),
    lightningAddress: z.string().optional(),
    mint: z.string().optional(),
    domain: z.string().optional(),
    reason: z.string().optional(),
    intentRef: z.string().optional(),
};
const budgetShape = {};
function toRequest(args, agentId) {
    return {
        agentId,
        rail: args.rail,
        amount: args.amount,
        endpoint: args.endpoint,
        domain: args.domain,
        lightningAddress: args.lightningAddress,
        mint: args.mint,
        reason: args.reason,
        intentRef: args.intentRef,
        ts: Date.now(),
    };
}
function jsonContent(value) {
    return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}
export function createMcpServer(deps) {
    const { governor, store, config } = deps;
    const agentId = config.agentId;
    const server = new McpServer({ name: "leashd", version: "0.1.0" });
    server.registerTool("pay", {
        description: "Settle a payment on the configured rail, gated by the local Leash policy " +
            "(budgets, per-tx max, allow/deny, rate, kill switch). Returns the policy " +
            "decision and settlement result. The amount is taken from the structured " +
            "`amount` argument only.",
        inputSchema: payShape,
    }, async (args) => {
        const result = await governor.requestPayment(toRequest(args, agentId));
        return jsonContent(result);
    });
    server.registerTool("check_policy", {
        description: "Dry-run: evaluate a hypothetical payment against the current policy WITHOUT " +
            "settling. Returns the decision and matched control.",
        inputSchema: payShape,
    }, async (args) => {
        const result = governor.checkPolicy(toRequest(args, agentId));
        return jsonContent(result);
    });
    server.registerTool("get_budget", {
        description: "Return remaining spend headroom per budget window (task/hour/day/month) " +
            "for the configured agent, per the current policy.",
        inputSchema: budgetShape,
    }, async () => {
        const spec = loadAgentPolicy(store, config, agentId);
        if (!spec) {
            return jsonContent({ error: "no verified policy available" });
        }
        const now = Date.now();
        const rateWindow = spec.rateLimit?.windowSeconds ?? 60;
        const budgets = spec.budgets.map((b) => {
            const state = store.computeEvalState(agentId, b.cap.unit, now, rateWindow);
            const spent = state.spend[b.window];
            return {
                window: b.window,
                unit: b.cap.unit,
                cap: b.cap.value,
                spent,
                remaining: Math.max(0, b.cap.value - spent),
            };
        });
        return jsonContent({
            policyVersion: spec.version,
            killSwitch: spec.killSwitch,
            gradedState: spec.gradedState,
            perTxMax: spec.perTxMax,
            budgets,
        });
    });
    return server;
}
export async function startMcpServer(server) {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
