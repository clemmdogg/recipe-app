export type Migration = {
  /** Sequential schema version, starting at 1. Never change or reuse a released version. */
  version: number;
  name: string;
  /** Trusted, static SQL. Never put data into it. */
  sql: string;
};
