import { ApiRequestError, NetworkError } from '@/services/api-client';
import { describeHouseholdError, InputError, NotUploadedError } from '@/view-models/household-errors';

describe('describeHouseholdError', () => {
  it('explains the API errors people can act on', () => {
    expect(describeHouseholdError(new ApiRequestError(410, 'invite_expired', ''))).toMatch(/expired/);
    expect(describeHouseholdError(new ApiRequestError(404, 'invite_not_found', ''))).toMatch(/no invite/);
    expect(describeHouseholdError(new ApiRequestError(403, 'wrong_password', ''))).toBe('The password is wrong.');
  });

  it('tells the user to go online when changes are not uploaded or the server is out of reach', () => {
    expect(describeHouseholdError(new NotUploadedError())).toMatch(/haven't been uploaded/);
    expect(describeHouseholdError(new NetworkError())).toMatch(/internet connection/);
  });

  it('shows input errors as they are, and a general message for anything else', () => {
    expect(describeHouseholdError(new InputError('Enter a name.'))).toBe('Enter a name.');
    expect(describeHouseholdError(new ApiRequestError(500, 'internal_error', ''))).toBe(
      'Something went wrong. Please try again.'
    );
  });
});
