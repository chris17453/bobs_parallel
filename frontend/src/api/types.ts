// Shared API types — mirrors the backend contract (SPEC-api / SPEC-data-model).

export type FeedKind = 'track' | 'album' | 'artist';

export interface User {
  id: string;
  username?: string | null;
  display_name: string;
  avatar_url?: string | null;
  /** Present when authed and viewing another user. */
  is_following?: boolean;
  follower_count?: number;
  following_count?: number;
  like_count?: number;
}

export interface FeedItem {
  id: number;
  spotify_id: string;
  kind: FeedKind;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  preview_url?: string | null;
  spotify_url?: string | null;
  popularity?: number;
  like_count: number;
  /** Present when authed. */
  liked?: boolean;
}

/** Cursor-paginated page (SPEC-data-model: cursor = last seen FeedItem.id, descending). */
export interface FeedPage {
  items: FeedItem[];
  next_cursor: number | null;
  has_more: boolean;
}

export interface SearchResults {
  items: FeedItem[];
  users: User[];
}

/** Full profile payload from GET /api/users/<id>. */
export interface Profile extends User {
  follower_count: number;
  following_count: number;
  like_count: number;
  likes: FeedItem[];
}

export interface MeResponse {
  user: User | null;
}

export interface ResetRequestResponse {
  reset_url: string;
}

/** Non-sensitive identity snapshot cached in localStorage (SPEC-auth). */
export interface IdentitySnapshot {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface ApiErrorBody {
  error: string;
}
