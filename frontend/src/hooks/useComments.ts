import {
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  AddCommentResponse,
  CommentsResponse,
  DeleteCommentResponse,
  FeedPage,
} from '../api/types';

/** Set the comment_count for one item across every cached feed page. */
function patchCommentCount(qc: ReturnType<typeof useQueryClient>, itemId: number, count: number) {
  qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ['feed'] }, (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((it) =>
          it.id === itemId ? { ...it, comment_count: count } : it,
        ),
      })),
    };
  });
}

/** Comments for an item. Disabled until `enabled` (i.e. the sheet is open). */
export function useComments(itemId: number, enabled: boolean) {
  return useQuery<CommentsResponse>({
    queryKey: ['comments', itemId],
    queryFn: ({ signal }) => api.comments(itemId, signal),
    enabled,
  });
}

/**
 * Post a comment. Appends to the comments query and patches the item's
 * comment_count in every feed cache from the authoritative server response.
 */
export function useAddComment(itemId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => api.addComment(itemId, body),

    onSuccess: ({ comment, comment_count }: AddCommentResponse) => {
      qc.setQueryData<CommentsResponse>(['comments', itemId], (data) =>
        data
          ? { comments: [...data.comments, comment], comment_count }
          : { comments: [comment], comment_count },
      );
      patchCommentCount(qc, itemId, comment_count);
    },
  });
}

/**
 * Delete a comment. Removes it from the comments query and reconciles the
 * item's comment_count across feed caches from the server response.
 */
export function useDeleteComment(itemId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (commentId: number) => api.deleteComment(commentId),

    onSuccess: ({ comment_count }: DeleteCommentResponse, commentId: number) => {
      qc.setQueryData<CommentsResponse>(['comments', itemId], (data) =>
        data
          ? {
              comments: data.comments.filter((c) => c.id !== commentId),
              comment_count,
            }
          : data,
      );
      patchCommentCount(qc, itemId, comment_count);
    },
  });
}
