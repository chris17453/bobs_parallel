import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Profile, User } from '../api/types';

/**
 * Optimistic follow/unfollow with rollback. Patches the users directory list
 * and any cached profile for the target user.
 */
export function useFollow() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, follow }: { userId: string; follow: boolean }) =>
      follow ? api.follow(userId) : api.unfollow(userId),

    onMutate: async ({ userId, follow }) => {
      await qc.cancelQueries({ queryKey: ['users'] });
      await qc.cancelQueries({ queryKey: ['user', userId] });

      const prevUsers = qc.getQueryData<{ users: User[] }>(['users']);
      const prevProfile = qc.getQueryData<Profile>(['user', userId]);

      qc.setQueryData<{ users: User[] }>(['users'], (data) =>
        data
          ? {
              users: data.users.map((u) =>
                u.id === userId ? { ...u, is_following: follow } : u,
              ),
            }
          : data,
      );

      qc.setQueryData<Profile>(['user', userId], (data) =>
        data
          ? {
              ...data,
              is_following: follow,
              follower_count: Math.max(0, data.follower_count + (follow ? 1 : -1)),
            }
          : data,
      );

      return { prevUsers, prevProfile, userId };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prevUsers) qc.setQueryData(['users'], ctx.prevUsers);
      if (ctx && ctx.prevProfile) qc.setQueryData(['user', ctx.userId], ctx.prevProfile);
    },

    onSuccess: ({ user }) => {
      qc.setQueryData<{ users: User[] }>(['users'], (data) =>
        data
          ? { users: data.users.map((u) => (u.id === user.id ? { ...u, ...user } : u)) }
          : data,
      );
      // Following feed may now differ.
      void qc.invalidateQueries({ queryKey: ['feed', 'following'] });
    },
  });
}
