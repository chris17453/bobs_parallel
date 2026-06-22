import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ColorModeProvider } from './theme/ColorModeContext';
import { AuthProvider } from './auth/AuthContext';
import { PlayerProvider } from './player/PlayerContext';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ColorModeProvider>
        <AuthProvider>
          <PlayerProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </PlayerProvider>
        </AuthProvider>
      </ColorModeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
