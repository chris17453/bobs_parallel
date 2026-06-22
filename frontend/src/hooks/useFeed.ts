import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { FeedItem, FeedPage } from '../api/types';

export type FeedType = 'main' | 'following';

const PAGE_LIMIT = 10; // server clamps; matches DEFAULT_LIMIT

/**
 * Infinite cursor-paginated feed. Keyed by feed type so 'main' and 'following'
 * are cached independently. `getNextPageParam` reads `next_cursor` (SPEC-frontend).
 */
export function useFeed(type: FeedType) {
  const query = useInfiniteQuery<FeedPage>({
    queryKey: ['feed', type],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) => {
      const cursor = pageParam as number | undefined;
      return type === 'following'
        ? api.followingFeed(cursor, PAGE_LIMIT, signal)
        : api.feed(cursor, PAGE_LIMIT, signal);
    },
    getNextPageParam: (lastPage) =>
      lastPage.has_more && lastPage.next_cursor != null ? lastPage.next_cursor : undefined,
  });

  const items: FeedItem[] = query.data?.pages.flatMap((p) => p.items) ?? [];

  return { ...query, items };
}

export { PAGE_LIMIT };
