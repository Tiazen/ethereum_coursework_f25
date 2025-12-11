import { ab2base64, signMessage } from "./crypto";

interface JWTHeader {
  alg: string;
  typ: string;
}

interface JWTPayload {
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  [key: string]: any;
}

function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlEncodeArrayBuffer(buffer: ArrayBuffer): string {
  return ab2base64(buffer)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlEncodeUint8Array(arr: Uint8Array): string {
  return base64urlEncodeArrayBuffer(arr.buffer as ArrayBuffer);
}

export async function generateJWT(
  privateKey: Uint8Array,
  payload: {
    website: string;
    username: string;
    walletAddress: string;
    expiresIn?: number; // in seconds, default 1 hour
  }
): Promise<string> {
  const header: JWTHeader = {
    alg: "EdDSA",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.expiresIn || 3600; // 1 hour default

  const jwtPayload: JWTPayload = {
    sub: payload.username,
    iss: payload.walletAddress,
    aud: payload.website,
    exp: now + expiresIn,
    iat: now,
    website: payload.website,
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(jwtPayload));

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToSign);
  console.log("data", data);
  const signature = await signMessage(data, privateKey);
  console.log("signature", signature);
  const encodedSignature = base64urlEncodeUint8Array(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export function parseJWT(
  token: string
): { header: JWTHeader; payload: JWTPayload } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const header = JSON.parse(
      atob(parts[0].replace(/-/g, "+").replace(/_/g, "/"))
    );
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    return { header, payload };
  } catch (error) {
    console.error("Error parsing JWT:", error);
    return null;
  }
}

export function isJWTExpired(token: string): boolean {
  const parsed = parseJWT(token);
  if (!parsed) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return parsed.payload.exp < now;
}
