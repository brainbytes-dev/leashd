import { PolicySpec } from "@repo/leash-core";
import { verifyPolicySignature } from "./sign";
/**
 * Resolves the current PolicySpec for an agent from the local signed cache.
 * The control plane signs every policy; leashd verifies the signature before
 * applying. A policy that fails verification is rejected (fail-closed): callers
 * get `undefined` and the governor denies.
 */
export function loadAgentPolicy(store, config, agentId) {
    const cached = store.getPolicy(agentId);
    if (!cached)
        return undefined;
    // No control-plane key configured -> cannot verify -> fail-closed.
    if (!config.controlPlanePubKey)
        return undefined;
    let spec;
    try {
        spec = PolicySpec.parse(JSON.parse(cached.specJson));
    }
    catch {
        return undefined;
    }
    if (!verifyPolicySignature(spec, cached.signature, config.controlPlanePubKey)) {
        return undefined;
    }
    return spec;
}
/**
 * Persist a freshly pulled signed policy after verifying it. Returns true if it
 * was accepted (verified and not a downgrade), false otherwise.
 */
export function applySignedPolicy(store, config, agentId, specJson, signature) {
    if (!config.controlPlanePubKey)
        return false;
    let spec;
    try {
        spec = PolicySpec.parse(JSON.parse(specJson));
    }
    catch {
        return false;
    }
    if (!verifyPolicySignature(spec, signature, config.controlPlanePubKey)) {
        return false;
    }
    // Apply only monotonic version bumps (no silent downgrade attacks).
    const existing = store.getPolicy(agentId);
    if (existing && existing.version > spec.version)
        return false;
    store.putPolicy(agentId, { version: spec.version, specJson, signature });
    return true;
}
