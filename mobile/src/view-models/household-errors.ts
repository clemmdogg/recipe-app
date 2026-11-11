import { ApiRequestError, NetworkError } from '@/services/api-client';

/** Thrown before switching household while this device still has changes it couldn't upload. */
export class NotUploadedError extends Error {
  constructor() {
    super('Some changes on this device are not uploaded yet');
    this.name = 'NotUploadedError';
  }
}

/** Something the user typed isn't valid; `message` says what to fix. */
export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputError';
  }
}

const Messages: Record<string, string> = {
  only_member: "You're the only member, so there is nothing to leave.",
  not_creator: 'Only the person who created the household can remove members.',
  cannot_remove_self: 'To leave the household, use "Leave household" instead.',
  member_not_found: 'This person is no longer in your household.',
  invite_not_found: 'There is no invite with this code. Check it and try again.',
  invite_expired: 'This invite has expired. Ask for a new one.',
  already_member: "You're already in this household.",
  wrong_password: 'The password is wrong.',
  rate_limited: 'Too many attempts. Wait a minute and try again.',
  validation_failed: 'Check what you entered and try again.',
};

/** A short message for the Household screens, from whatever went wrong. */
export function describeHouseholdError(error: unknown): string {
  if (error instanceof InputError) {
    return error.message;
  }
  if (error instanceof NotUploadedError) {
    return "Some of your changes haven't been uploaded yet. Connect to the internet and try again.";
  }
  if (error instanceof NetworkError) {
    return "Can't reach the server. Check your internet connection and try again.";
  }
  if (error instanceof ApiRequestError && Messages[error.code]) {
    return Messages[error.code]!;
  }
  return 'Something went wrong. Please try again.';
}
