import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ColorModeProvider } from '../theme/ColorModeContext';
import { AuthProvider } from '../auth/AuthContext';
import { PlayerProvider } from '../player/PlayerContext';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  client?: QueryClient;
}

/** Render with all app providers and a memory router. */
export function renderWithProviders(ui: ReactElement, opts: Options = {}) {
  const { route = '/', client = makeQueryClient(), ...rest } = opts;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ColorModeProvider>
          <AuthProvider>
            <PlayerProvider>
              <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
            </PlayerProvider>
          </AuthProvider>
        </ColorModeProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...rest });
}
