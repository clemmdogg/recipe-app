/// <reference types="node" />

// Pin the time zone so date tests behave the same on every machine. Copenhagen has daylight
// saving time, which date tests rely on to catch "add 24 hours" bugs.
process.env.TZ = 'Europe/Copenhagen';

// jest-expo mocks expo-crypto's native module, so randomUUID() returns undefined in tests.
// Use Node's implementation so code that creates rows gets real UUIDs.
jest.mock('expo-crypto', () => ({
  ...jest.requireActual('expo-crypto'),
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}));
