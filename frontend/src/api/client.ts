// Typed fetch wrapper. Relative paths so the dev proxy and prod same-origin both work.
// VITE_API_BASE is an optional prefix (default empty string).
import type {
  AddCommentResponse,
  CommentsResponse,
  DeleteCommentResponse,
  FeedPage,
  MarkReadResponse,
  MeResponse,
  NotificationsResponse,
  Profile,
  ResetRequestResponse,
  SearchResults,
  ShareResponse,
  UnreadCountResponse,
  UpdateMeRequest,
  UpdateMeResponse,
  User,
} from './types';

const API_BASE: string = import.meta.env.VITE_API_BASE ?? '';

/** Thrown on non-2xx responses; `code` is the machine-readable `error` field (SPEC-api). */
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = opts;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    signal,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let code = `http_${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data && typeof data.error === 'string') code = data.error;
    } catch {
      // non-JSON error body; keep the http_<status> fallback
    }
    throw new ApiError(res.status, code);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export const api = {
  // ---- session / identity ----
  me: (signal?: AbortSignal) => request<MeResponse>('/api/me', { signal }),
  updateMe: (body: UpdateMeRequest) =>
    request<UpdateMeResponse>('/api/me', { method: 'PATCH', body }),

  // ---- auth ----
  signup: (body: { username: string; display_name: string; password: string }) =>
    request<{ user: User }>('/auth/signup', { method: 'POST', body }),
  loginLocal: (body: { username: string; password: string; remember?: boolean }) =>
    request<{ user: User }>('/auth/login-local', { method: 'POST', body }),
  devLogin: () => request<{ user: User }>('/auth/dev-login', { method: 'POST' }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  resetRequest: (username: string) =>
    request<ResetRequestResponse>('/auth/reset/request', {
      method: 'POST',
      body: { username },
    }),
  reset: (token: string, newPassword: string) =>
    request<{ ok: true }>('/auth/reset', {
      method: 'POST',
      body: { token, new_password: newPassword },
    }),

  // ---- feed ----
  feed: (cursor: number | undefined, limit: number, signal?: AbortSignal) =>
    request<FeedPage>(`/api/feed${qs({ cursor, limit })}`, { signal }),
  followingFeed: (cursor: number | undefined, limit: number, signal?: AbortSignal) =>
    request<FeedPage>(`/api/feed/following${qs({ cursor, limit })}`, { signal }),

  // ---- likes ----
  like: (itemId: number) =>
    request<{ item: import('./types').FeedItem }>(`/api/items/${itemId}/like`, {
      method: 'POST',
    }),
  unlike: (itemId: number) =>
    request<{ item: import('./types').FeedItem }>(`/api/items/${itemId}/like`, {
      method: 'DELETE',
    }),

  // ---- comments ----
  comments: (itemId: number, signal?: AbortSignal) =>
    request<CommentsResponse>(`/api/items/${itemId}/comments`, { signal }),
  addComment: (itemId: number, body: string) =>
    request<AddCommentResponse>(`/api/items/${itemId}/comments`, {
      method: 'POST',
      body: { body },
    }),
  deleteComment: (commentId: number) =>
    request<DeleteCommentResponse>(`/api/comments/${commentId}`, {
      method: 'DELETE',
    }),

  // ---- shares ----
  share: (itemId: number) =>
    request<ShareResponse>(`/api/items/${itemId}/share`, { method: 'POST' }),

  // ---- search ----
  search: (q: string, signal?: AbortSignal) =>
    request<SearchResults>(`/api/search${qs({ q })}`, { signal }),

  // ---- social ----
  users: (signal?: AbortSignal) => request<{ users: User[] }>('/api/users', { signal }),
  user: (id: string, signal?: AbortSignal) =>
    request<Profile>(`/api/users/${encodeURIComponent(id)}`, { signal }),
  follow: (id: string) =>
    request<{ user: User }>(`/api/users/${encodeURIComponent(id)}/follow`, {
      method: 'POST',
    }),
  unfollow: (id: string) =>
    request<{ user: User }>(`/api/users/${encodeURIComponent(id)}/follow`, {
      method: 'DELETE',
    }),

  // ---- notifications ----
  notifications: (signal?: AbortSignal) =>
    request<NotificationsResponse>('/api/notifications', { signal }),
  notificationsUnreadCount: (signal?: AbortSignal) =>
    request<UnreadCountResponse>('/api/notifications/unread-count', { signal }),
  markNotificationsRead: () =>
    request<MarkReadResponse>('/api/notifications/read', { method: 'POST' }),
};
