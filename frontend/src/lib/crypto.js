// AES-GCM encryption of the recovery phrase behind the user's PIN (Web Crypto API).
function b64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
function ub64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function deriveKey(pin, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPhrase(phrase, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(phrase),
  );
  return { salt: b64(salt), iv: b64(iv), data: b64(ct) };
}

export async function decryptPhrase(enc, pin) {
  const key = await deriveKey(pin, ub64(enc.salt));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ub64(enc.iv) },
    key,
    ub64(enc.data),
  );
  return new TextDecoder().decode(pt);
}
