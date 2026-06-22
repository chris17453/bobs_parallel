import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Link,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import QRCode from '../components/QRCode';

const API_BASE: string = import.meta.env.VITE_API_BASE ?? '';

type Mode = 'login' | 'signup' | 'reset';

function errMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'invalid_credentials':
        return 'Wrong username or password.';
      case 'username_taken':
        return 'That username is taken.';
      case 'user_not_found':
        return 'No account with that username.';
      default:
        return err.code.replace(/_/g, ' ');
    }
  }
  return 'Something went wrong. Try again.';
}

/**
 * Hosts all three auth flows: Spotify login, local login/signup, and forgot-password
 * (which renders the returned reset_url as a QR). Identity is cached via AuthContext.
 */
export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const { setUser } = useAuth();
  const navigate = useNavigate();

  const spotifyLogin = () => {
    window.location.href = `${API_BASE}/auth/login`;
  };

  const devLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      const { user } = await api.devLogin();
      setUser(user);
      navigate('/');
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetUrl(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        const { user } = await api.loginLocal({ username, password, remember: true });
        setUser(user);
        navigate('/');
      } else if (mode === 'signup') {
        const { user } = await api.signup({
          username,
          display_name: displayName || username,
          password,
        });
        setUser(user);
        navigate('/');
      } else {
        const { reset_url } = await api.resetRequest(username);
        setResetUrl(reset_url);
      }
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', py: 4 }}>
      <Box sx={{ width: '100%' }}>
        <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h3" fontWeight={700} color="primary">
            Parallel
          </Typography>
          <Typography color="text.secondary">Music, in an endless scroll.</Typography>
        </Stack>

        <Button fullWidth variant="contained" size="large" onClick={spotifyLogin} sx={{ mb: 1 }}>
          Continue with Spotify
        </Button>
        <Button fullWidth variant="text" size="small" onClick={devLogin} disabled={busy}>
          Use demo account
        </Button>

        <Divider sx={{ my: 2 }}>or</Divider>

        <Tabs
          value={mode === 'reset' ? 'login' : mode}
          onChange={(_e, v: Mode) => {
            setMode(v);
            setError(null);
            setResetUrl(null);
          }}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab label="Log in" value="login" />
          <Tab label="Sign up" value="signup" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {resetUrl ? (
          <Stack spacing={2} alignItems="center">
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Scan this QR code or open the link to reset your password.
            </Typography>
            <QRCode value={resetUrl} />
            <Link href={resetUrl} sx={{ wordBreak: 'break-all', textAlign: 'center' }}>
              {resetUrl}
            </Link>
            <Button onClick={() => setMode('login')}>Back to login</Button>
          </Stack>
        ) : (
          <Box component="form" onSubmit={submit}>
            <Stack spacing={2}>
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                inputProps={{ 'aria-label': 'Username' }}
              />

              {mode === 'signup' && (
                <TextField
                  label="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  inputProps={{ 'aria-label': 'Display name' }}
                />
              )}

              {mode !== 'reset' && (
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  inputProps={{ 'aria-label': 'Password' }}
                />
              )}

              <Button type="submit" variant="contained" size="large" disabled={busy}>
                {mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Get reset link'}
              </Button>

              {mode !== 'reset' && (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setMode('reset');
                    setError(null);
                  }}
                >
                  Forgot password?
                </Button>
              )}
              {mode === 'reset' && (
                <Button variant="text" size="small" onClick={() => setMode('login')}>
                  Back to login
                </Button>
              )}
            </Stack>
          </Box>
        )}
      </Box>
    </Container>
  );
}
