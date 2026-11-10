import { CryptoDigestAlgorithm, digest } from 'expo-crypto';

/**
 * Namespaces for name-based ids. Each kind of row gets its own, so the same name gives
 * different ids in different tables. Never change a released value: ids would stop matching.
 */
export const IdNamespaces = {
  pantryItem: '3f0c8a52-6d1e-4b7a-9c35-2a8e41f7d0b6',
} as const;

/**
 * A deterministic UUID (version 5, RFC 9562) for `name` within `namespace`. Rows with a natural
 * key use this instead of a random UUID, so the same row created on two devices gets the same
 * id and merges on sync. Pass an already-normalized name (e.g. lowercased).
 */
export async function nameBasedUuid(namespace: string, name: string): Promise<string> {
  const namespaceBytes = uuidToBytes(namespace);
  const nameBytes = new TextEncoder().encode(name);
  const input = new Uint8Array(namespaceBytes.length + nameBytes.length);
  input.set(namespaceBytes);
  input.set(nameBytes, namespaceBytes.length);

  const hash = new Uint8Array(await digest(CryptoDigestAlgorithm.SHA1, input));
  const bytes = hash.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC variant
  return bytesToUuid(bytes);
}

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/i.test(hex)) {
    throw new Error(`Invalid UUID: ${uuid}`);
  }
  return Uint8Array.from({ length: 16 }, (_, index) => parseInt(hex.slice(index * 2, index * 2 + 2), 16));
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
