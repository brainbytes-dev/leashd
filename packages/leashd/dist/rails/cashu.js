/** Stub: Cashu (CDK / Minibits) is post-MVP. Wired so multi-rail dispatch exists. */
export function createCashuAdapter() {
    return {
        rail: "cashu",
        async pay() {
            return { ok: false, error: "rail not implemented in MVP" };
        },
    };
}
