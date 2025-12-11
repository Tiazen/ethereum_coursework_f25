import * as ed25519 from "@noble/ed25519";

export function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

export function ab2str(buf: ArrayBuffer): string {
  return String.fromCharCode(...new Uint8Array(buf));
}

export function ab2hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hex2ab(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

export function ab2base64(buffer: ArrayBuffer): string {
  return btoa(ab2str(buffer));
}

export function base642ab(base64: string): ArrayBuffer {
  return str2ab(atob(base64));
}

export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = 100000
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    enc.encode(data)
  );

  return {
    encrypted: ab2base64(encrypted),
    iv: ab2base64(iv.buffer),
  };
}

export async function decrypt(
  encryptedData: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const dec = new TextDecoder();
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base642ab(iv),
    },
    key,
    base642ab(encryptedData)
  );

  return dec.decode(decrypted);
}

export async function generateSigningKeyPair(): Promise<{
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}> {
  const privateKey = ed25519.utils.randomSecretKey();
  const publicKey = await ed25519.getPublicKeyAsync(privateKey);

  return {
    privateKey,
    publicKey,
  };
}

function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}


export function keyToHex(key: Uint8Array): string {
  return uint8ArrayToHex(key);
}


export function importPrivateKey(hexKey: string): Uint8Array {
  return hexToUint8Array(hexKey);
}


export function importPublicKey(hexKey: string): Uint8Array {
  return new Uint8Array(hex2ab(hexKey));
}


export async function signMessage(
  message: Uint8Array,
  privateKey: Uint8Array
): Promise<Uint8Array> {
  return await ed25519.signAsync(message, privateKey);
}


export async function verifySignature(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> {
  return await ed25519.verifyAsync(signature, message, publicKey);
}


export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}


export async function hashPassword(
  password: string,
  salt: Uint8Array
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return ab2base64(hash);
}
