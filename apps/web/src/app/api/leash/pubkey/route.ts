import { NextResponse } from "next/server";
import { getPublicKeyPem } from "@/lib/leash/signing";

/**
 * Public ed25519 key leashd uses to verify policy signatures. Unauthenticated —
 * the public key is not a secret. Returns 404 when signing is disabled (dev).
 */
export async function GET() {
  const publicKey = getPublicKeyPem();
  if (!publicKey)
    return NextResponse.json(
      { error: "Policy signing not configured" },
      { status: 404 }
    );

  return NextResponse.json({ algorithm: "ed25519", publicKey });
}
