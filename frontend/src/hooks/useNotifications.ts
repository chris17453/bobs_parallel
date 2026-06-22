import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  MarkReadResponse,
  NotificationsResponse,
  UnreadCountResponse,
} from '../api/types';
import { useAuth } from '../auth/AuthContext';

/**
 * The unread-count badge query. Only runs while authed; polls modestly and
 * refetches on window focus so the badge stays fresh.
 */
export function useUnreadCount() {
  const { isAuthenticated } = useAuth();

  return useQuery<UnreadCountResponse>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: ({ signal }) => api.notificationsUnreadCount(signal),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** The notifications list. Disabled until `enabled` (i.e. the panel is open). */
export function useNotifications(enabled: boolean) {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', 'list'],
    queryFn: ({ signal }) => api.notifications(signal),
    enabled,
  });
}

/** Mark all notifications read; zeroes the unread_count in the badge cache. */
export function useMarkNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => api.markNotificationsRead(),

    onSuccess: ({ unread_count }: MarkReadResponse) => {
      qc.setQueryData<UnreadCountResponse>(['notifications', 'unread-count'], {
        unread_count,
      });
      qc.setQueryData<NotificationsResponse>(['notifications', 'list'], (data) =>
        data
          ? {
              ...data,
              unread_count,
              notifications: data.notifications.map((n) => ({ ...n, read: true })),
            }
          : data,
      );
    },
  });
}
