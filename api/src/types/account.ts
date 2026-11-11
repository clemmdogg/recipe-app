/** A user as other parts of the API see them. Never includes the password hash. */
export type User = {
  id: string;
  email: string;
  name: string;
  householdId: string;
};

export type HouseholdSummary = {
  id: string;
  name: string;
};

/** Who is making a request, set by the authenticate hook after checking the access token. */
export type AuthenticatedUser = {
  id: string;
  householdId: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};
