import { vi } from 'vitest';

type Handler = (url: string, init?: RequestInit) => unknown;

/**
 * Install a deterministic fetch stub. Routes are matched by `method url` prefix;
 * unmatched routes default to `{ user: null }` style empties so the shell renders.
 */
export function installFetchMock(routes: Record<string, Handler | unknown> = {}) {
  const stub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method ?? 'GET').toUpperCase();

    // exact "METHOD path" then "path" lookups
    const keys = [`${method} ${url}`, url];
    for (const key of keys) {
      if (key in routes) {
        const r = routes[key];
        const body = typeof r === 'function' ? (r as Handler)(url, init) : r;
        return jsonResponse(body);
      }
    }

    // sensible defaults
    if (url.includes('/api/me')) return jsonResponse({ user: null });
    if (url.includes('/api/feed')) return jsonResponse({ items: [], next_cursor: null, has_more: false });
    if (url.includes('/api/users')) return jsonResponse({ users: [] });
    if (url.includes('/api/search')) return jsonResponse({ items: [], users: [] });
    return jsonResponse({});
  });

  vi.stubGlobal('fetch', stub);
  return stub;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
