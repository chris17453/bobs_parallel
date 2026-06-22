import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Profile, UpdateMeRequest } from '../api/types';

/**
 * Update the current user's profile (PATCH /api/me). On success, refreshes the
 * AuthContext current user (and its `parallel.auth` localStorage snapshot via
 * setUser) and patches any cached `['user', id]` profile so the view reflects
 * the new name/avatar immediately.
 */
export function useUpdateProfile() {
  const qc = useQueryClient();
  const { setUser } = useAuth();

  return useMutation({
    mutationFn: (body: UpdateMeRequest) => api.updateMe(body),

    onSuccess: ({ user }) => {
      // Updates AuthContext state AND the parallel.auth localStorage snapshot.
      setUser(user);

      qc.setQueryData<Profile>(['user', user.id], (data) =>
        data ? { ...data, ...user } : data,
      );
      void qc.invalidateQueries({ queryKey: ['user', user.id] });
    },
  });
}
