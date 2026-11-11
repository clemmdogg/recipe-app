/** Shapes from the API's household and invite endpoints. See "4.3 Household" in api/docs/api-design.md. */

export type HouseholdMember = {
  id: string;
  name: string;
  /** ISO 8601 UTC timestamp. */
  joinedAt: string;
  isCreator: boolean;
};

export type Household = {
  id: string;
  name: string;
  createdBy: string;
  /** Longest-standing first. */
  members: HouseholdMember[];
};

export type Invite = {
  /** e.g. "K7MQ-2XPA". */
  code: string;
  url: string;
  expiresAt: string;
};

export type InvitePreview = {
  householdName: string;
  memberCount: number;
  expiresAt: string;
  /** The user is alone in a household with data, which joining deletes. */
  joiningDeletesData: boolean;
};
