import { useState } from 'react';

import { describeAuthError } from '@/view-models/auth-errors';
import { useSession } from '@/view-models/session';

/** Same limits as the API, so most mistakes are caught before sending anything. */
export const MinPasswordLength = 8;
const EmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = 'signIn' | 'signUp';

/**
 * Form state for the sign-in and sign-up screens: the fields, a message to show, and submit.
 * The screen switches to the tabs by itself once signing in works (the root layout's guard).
 */
export function useAuthForm(mode: Mode) {
  const session = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(): Promise<void> {
    if (isSubmitting) {
      return;
    }
    const problem = checkFields(mode, { name, email, password });
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const credentials = { email: email.trim(), password };
      if (mode === 'signUp') {
        await session.signUp({ ...credentials, name: name.trim() });
      } else {
        await session.signIn(credentials);
      }
    } catch (caught) {
      setError(describeAuthError(caught));
      setIsSubmitting(false);
    }
  }

  return { name, setName, email, setEmail, password, setPassword, error, isSubmitting, submit };
}

/** The first problem with the fields, or null if they look fine. */
export function checkFields(
  mode: Mode,
  fields: { name: string; email: string; password: string }
): string | null {
  if (mode === 'signUp' && fields.name.trim() === '') {
    return 'Enter your name, so your family can see who you are.';
  }
  if (!EmailPattern.test(fields.email.trim())) {
    return 'Enter a valid email address.';
  }
  if (mode === 'signUp' && fields.password.length < MinPasswordLength) {
    return `Choose a password with at least ${MinPasswordLength} characters.`;
  }
  if (fields.password === '') {
    return 'Enter your password.';
  }
  return null;
}
