import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { api } from '../api/client';
import type { FeedItem, FeedPage } from '../api/types';

/** Apply a like-state change to any cached object that holds this item. */
function patchItem(item: FeedItem, liked: boolean): FeedItem {
  if (item.liked === liked) return item;
  const delta = liked ? 1 : -1;
  return { ...item, liked, like_count: Math.max(0, item.like_count + delta) };
}

/**
 * Optimistic like/unlike with rollback (SPEC-frontend). Patches every cached
 * feed page that contains the item, then reconciles from the server response.
 */
export function useLike() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, liked }: { itemId: number; liked: boolean }) =>
      liked ? api.like(itemId) : api.unlike(itemId),

    onMutate: async ({ itemId, liked }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      const previous = qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: ['feed'] });

      qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ['feed'] }, (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((it) => (it.id === itemId ? patchItem(it, liked) : it)),
          })),
        };
      });

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      // Roll back to the snapshot taken in onMutate.
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },

    onSuccess: ({ item }) => {
      // Reconcile with the authoritative resource the server returned.
      qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ['feed'] }, (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((it) => (it.id === item.id ? { ...it, ...item } : it)),
          })),
        };
      });
    },
  });
}
