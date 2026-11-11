import type { ApiClient } from '@/services/api-client';
import type { Household, Invite, InvitePreview } from '@/types/household';
import type { Session } from '@/types/session';

/** The user and their household right now, from the server. */
export function getAccount(client: ApiClient): Promise<Session> {
  return client.request<Session>('/v1/me');
}

export function getHousehold(client: ApiClient): Promise<Household> {
  return client.request<Household>('/v1/household');
}

export function renameHousehold(client: ApiClient, name: string): Promise<Household> {
  return client.request<Household>('/v1/household', { method: 'PATCH', body: { name } });
}

export function createInvite(client: ApiClient): Promise<Invite> {
  return client.request<Invite>('/v1/household/invites', { method: 'POST' });
}

export function previewInvite(client: ApiClient, code: string): Promise<InvitePreview> {
  return client.request<InvitePreview>(`/v1/invites/${encodeURIComponent(code)}`);
}

export function acceptInvite(client: ApiClient, code: string, confirmDataLoss: boolean): Promise<Household> {
  return client.request<Household>(`/v1/invites/${encodeURIComponent(code)}/accept`, {
    method: 'POST',
    body: { confirmDataLoss },
  });
}

/** Moves the user to a new empty household, which is returned. */
export function leaveHousehold(client: ApiClient): Promise<Household> {
  return client.request<Household>('/v1/household/leave', { method: 'POST' });
}

export function removeMember(client: ApiClient, userId: string): Promise<void> {
  return client.request<void>(`/v1/household/members/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

/** Deletes the account for good. Needs the password again. */
export function deleteAccount(client: ApiClient, password: string): Promise<void> {
  return client.request<void>('/v1/me', { method: 'DELETE', body: { password } });
}
