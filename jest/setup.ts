/// <reference types="node" />

// jest-expo mocks expo-crypto's native module, so randomUUID() returns undefined in tests.
// Use Node's implementation so code that creates rows gets real UUIDs.
jest.mock('expo-crypto', () => ({
  ...jest.requireActual('expo-crypto'),
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));
