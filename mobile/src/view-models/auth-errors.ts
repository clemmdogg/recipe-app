import { ApiRequestError, NetworkError } from '@/services/api-client';

/** A short message for the sign-in and sign-up screens, from whatever went wrong. */
export function describeAuthError(error: unknown): string {
  if (error instanceof NetworkError) {
    return "Can't reach the server. Check your internet connection and try again.";
  }
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'Wrong email or password.';
      case 'email_taken':
        return 'An account with this email already exists. Sign in instead.';
      case 'rate_limited':
        return 'Too many attempts. Wait a minute and try again.';
      case 'validation_failed':
        return 'Check your details and try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
