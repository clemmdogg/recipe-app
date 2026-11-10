/// <reference types="node" />

// Pin the time zone so date tests behave the same on every machine. Copenhagen has daylight
// saving time, which date tests rely on to catch "add 24 hours" bugs.
process.env.TZ = 'Europe/Copenhagen';

// jest-expo mocks expo-crypto's native module, so randomUUID() and digest() return nothing in
// tests. Use Node's implementations so code that creates ids gets real values.
jest.mock('expo-crypto', () => {
  const nodeCrypto = jest.requireActual<typeof import('node:crypto')>('node:crypto');
  const nodeAlgorithms: Record<string, string> = {
    'SHA-1': 'sha1',
    'SHA-256': 'sha256',
    'SHA-384': 'sha384',
    'SHA-512': 'sha512',
  };
  return {
    ...jest.requireActual('expo-crypto'),
    randomUUID: () => nodeCrypto.randomUUID(),
    digest: async (algorithm: string, data: ArrayBufferView) => {
      const hash = nodeCrypto
        .createHash(nodeAlgorithms[algorithm])
        .update(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
        .digest();
      return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
    },
  };
});
