import { randomInt } from 'node:crypto';

/** 32 characters without look-alikes (no 0/O, 1/I), so a code is easy to read and type. */
const Alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CodeLength = 8;

export const InviteLifetimeDays = 7;

/**
 * 8 random characters, stored without the dash: 32^8 (about a trillion) possible codes, so
 * guessing one is hopeless, especially with rate limiting.
 */
export function generateInviteCode(): string {
  return Array.from({ length: CodeLength }, () => Alphabet[randomInt(Alphabet.length)]).join('');
}

/** Accepts what a person types: any letter case, with or without the dash or spaces. */
export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** How a code is shown to people: "K7MQ-2XPA". */
export function formatInviteCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
