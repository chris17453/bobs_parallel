import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { User } from '../api/types';

export type FollowListKind = 'followers' | 'following';

/**
 * Followers/following list for a user. Disabled until `enabled` (i.e. the
 * sheet is open). Mirrors useComments — keyed per user + kind.
 */
export function useFollowList(userId: string, kind: FollowListKind, enabled: boolean) {
  return useQuery<{ users: User[] }>({
    queryKey: ['followList', userId, kind],
    queryFn: ({ signal }) =>
      kind === 'followers' ? api.followers(userId, signal) : api.following(userId, signal),
    enabled,
  });
}
