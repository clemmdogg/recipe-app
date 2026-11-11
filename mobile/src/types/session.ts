/** The signed-in user and their household, as the API returns them at sign-in. */
export type Session = {
  user: {
    id: string;
    email: string;
    name: string;
  };
  household: {
    id: string;
    name: string;
  };
};

export type TokenPair = {
  /** Sent with every request. Lasts 15 minutes. */
  accessToken: string;
  /** Swapped for a new pair when the access token expires. Lasts 30 days. */
  refreshToken: string;
};
