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

export type HouseholdMember = {
  id: string;
  name: string;
  /** ISO 8601 UTC timestamp. */
  joinedAt: string;
  isCreator: boolean;
};

/** A household with its members, as `GET /v1/household` returns it. No emails. */
export type Household = HouseholdSummary & {
  createdBy: string;
  members: HouseholdMember[];
};

export type Invite = {
  /** Formatted for people, e.g. "K7MQ-2XPA". */
  code: string;
  url: string;
  expiresAt: string;
};

export type InvitePreview = {
  householdName: string;
  memberCount: number;
  expiresAt: string;
  /** The user is alone in a household that has data, which joining would delete. */
  joiningDeletesData: boolean;
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
