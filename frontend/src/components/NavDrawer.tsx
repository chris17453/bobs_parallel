import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LoginIcon from '@mui/icons-material/Login';
import { useColorMode } from '../theme/ColorModeContext';
import { useAuth } from '../auth/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Hamburger drawer: profile shortcut + theme settings + auth action (SPEC). */
export default function NavDrawer({ open, onClose }: Props) {
  const { mode, toggle } = useColorMode();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/auth');
  };

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: 280 }} role="presentation">
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar src={user?.avatar_url ?? undefined}>
            {user?.display_name?.[0]?.toUpperCase() ?? '?'}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={700} noWrap>
              {user?.display_name ?? 'Guest'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isAuthenticated ? 'Signed in' : 'Not signed in'}
            </Typography>
          </Box>
        </Box>
        <Divider />
        <List>
          {isAuthenticated && (
            <ListItemButton onClick={() => go('/profile')}>
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary="Profile" />
            </ListItemButton>
          )}

          <ListItemButton onClick={toggle}>
            <ListItemIcon>{mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}</ListItemIcon>
            <ListItemText primary="Dark mode" />
            <Switch edge="end" checked={mode === 'dark'} inputProps={{ 'aria-label': 'Toggle dark mode' }} />
          </ListItemButton>

          <Divider sx={{ my: 1 }} />

          {isAuthenticated ? (
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Log out" />
            </ListItemButton>
          ) : (
            <ListItemButton onClick={() => go('/auth')}>
              <ListItemIcon>
                <LoginIcon />
              </ListItemIcon>
              <ListItemText primary="Sign in" />
            </ListItemButton>
          )}
        </List>
      </Box>
    </Drawer>
  );
}
