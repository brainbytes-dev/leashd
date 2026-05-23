/** Stub: x402 / USDC (ERC-4337 session keys) is post-MVP. */
export function createX402Adapter() {
    return {
        rail: "x402",
        async pay() {
            return { ok: false, error: "rail not implemented in MVP" };
        },
    };
}
