import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { api } from '../api/client';
import type { FeedItem, FeedPage, ShareResponse } from '../api/types';

/** Apply share state to any cached item. */
function patchShared(item: FeedItem, shared: boolean, count?: number): FeedItem {
  const share_count =
    count ?? Math.max(0, item.share_count + (shared && !item.shared ? 1 : 0));
  return { ...item, shared, share_count };
}

/**
 * Share an item (idempotent on the server). Optimistically bumps share_count +
 * shared across feed caches with rollback, then reconciles from the response.
 * Mirrors useLike.
 */
export function useShare() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId }: { itemId: number }) => api.share(itemId),

    onMutate: async ({ itemId }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      const previous = qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: ['feed'] });

      qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ['feed'] }, (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((it) =>
              it.id === itemId && !it.shared ? patchShared(it, true) : it,
            ),
          })),
        };
      });

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },

    onSuccess: ({ item_id, shared, share_count }: ShareResponse) => {
      qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ['feed'] }, (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((it) =>
              it.id === item_id ? { ...it, shared, share_count } : it,
            ),
          })),
        };
      });
    },
  });
}
