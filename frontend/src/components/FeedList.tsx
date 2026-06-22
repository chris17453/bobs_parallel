import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import FeedCard from './FeedCard';
import type { FeedItem } from '../api/types';

interface Props {
  items: FeedItem[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  emptyMessage?: string;
}

/**
 * Full-screen vertical scroll-snap container. An IntersectionObserver sentinel
 * near the end calls fetchNextPage; an active-card observer tracks which card is
 * in view so only it plays audio (SPEC-frontend).
 */
export default function FeedList({
  items,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  emptyMessage = 'Nothing here yet.',
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  // Lazy-load: trigger next page when the sentinel approaches the viewport.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = containerRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }
      },
      { root, rootMargin: '600px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Track the most-visible card to drive single-card audio playback.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: { id: number; ratio: number } | null = null;
        for (const entry of entries) {
          const idAttr = (entry.target as HTMLElement).dataset.itemId;
          if (!idAttr) continue;
          const id = Number(idAttr);
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.ratio)) {
            best = { id, ratio: entry.intersectionRatio };
          }
        }
        if (best) setActiveId(best.id);
      },
      { root, threshold: [0.5, 0.75] },
    );

    const cards = root.querySelectorAll<HTMLElement>('[data-item-id]');
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [items]);

  // Default the first card active so audio can start without a scroll.
  useEffect(() => {
    if (activeId === null && items.length > 0) setActiveId(items[0].id);
  }, [items, activeId]);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollSnapType: prefersReducedMotion ? 'none' : 'y mandatory',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {items.length === 0 && !isFetchingNextPage ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography color="text.secondary">{emptyMessage}</Typography>
        </Box>
      ) : (
        items.map((item) => (
          <Box
            key={item.id}
            data-item-id={item.id}
            sx={{ flex: '0 0 100%', height: '100%', minHeight: 0 }}
          >
            <FeedCard item={item} active={item.id === activeId} />
          </Box>
        ))
      )}

      {/* Sentinel for infinite loading */}
      <Box ref={sentinelRef} sx={{ height: 1, flex: '0 0 auto' }} aria-hidden />

      {isFetchingNextPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3, flex: '0 0 auto' }}>
          <CircularProgress size={28} />
        </Box>
      )}
    </Box>
  );
}
