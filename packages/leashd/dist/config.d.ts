import { type KeyObject } from "node:crypto";
export interface LeashConfig {
    controlPlaneUrl: string;
    workspaceId: string;
    agentId: string;
    agentToken: string;
    /** ed25519 public key of the control plane, base64 (SPKI DER). Optional offline. */
    controlPlanePubKey?: string;
    /** NWC connection string for the Lightning rail. Secret. */
    nwcUrl?: string;
    dbPath: string;
    /** leashd's own ed25519 signing identity. */
    signingPrivateKey: KeyObject;
    signingPublicKeyB64: string;
}
export declare function loadConfig(): LeashConfig;
//# sourceMappingURL=config.d.ts.map