import { useState, type FormEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Badge,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  IconButton,
  InputBase,
  Paper,
  Toolbar,
  alpha,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NavDrawer from './NavDrawer';
import NotificationsSheet from './NotificationsSheet';
import { useAuth } from '../auth/AuthContext';
import { useMarkNotificationsRead, useUnreadCount } from '../hooks/useNotifications';

const TABS = [
  { label: 'Feed', value: '/', icon: <HomeIcon /> },
  { label: 'Search', value: '/search', icon: <SearchIcon /> },
  { label: 'Friends', value: '/friends', icon: <PeopleIcon /> },
  { label: 'Profile', value: '/profile', icon: <PersonIcon /> },
];

function activeTab(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/feed')) return '/';
  if (pathname.startsWith('/search')) return '/search';
  if (pathname.startsWith('/friends')) return '/friends';
  if (pathname.startsWith('/profile') || pathname.startsWith('/users')) return '/profile';
  return '/';
}

/**
 * App chrome: top AppBar (search + hamburger) + bottom nav + drawer.
 * The bottom nav is hidden on routes that should be full-bleed (auth/reset).
 */
export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { data: unread } = useUnreadCount();
  const markRead = useMarkNotificationsRead();
  const unreadCount = unread?.unread_count ?? 0;

  const openNotifications = () => {
    setNotifOpen(true);
    markRead.mutate();
  };

  const chromeless =
    location.pathname.startsWith('/login') || location.pathname.startsWith('/reset');

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  if (chromeless) {
    return <Outlet />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <AppBar position="static" color="default" elevation={0} enableColorOnDark>
        <Toolbar sx={{ gap: 1, minHeight: 56 }}>
          <IconButton
            edge="start"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <MenuIcon />
          </IconButton>

          <Paper
            component="form"
            onSubmit={submitSearch}
            elevation={0}
            sx={(t) => ({
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              px: 1.5,
              py: 0.25,
              borderRadius: 999,
              bgcolor: alpha(t.palette.text.primary, 0.06),
            })}
          >
            <SearchIcon fontSize="small" sx={{ mr: 1, opacity: 0.6 }} />
            <InputBase
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tracks & people"
              fullWidth
              inputProps={{ 'aria-label': 'Search' }}
            />
          </Paper>

          {isAuthenticated && (
            <IconButton
              edge="end"
              aria-label="Notifications"
              onClick={openNotifications}
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              <Badge badgeContent={unreadCount} color="error" invisible={unreadCount === 0}>
                <NotificationsIcon />
              </Badge>
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Outlet />
      </Box>

      <Paper elevation={3} square sx={{ flex: '0 0 auto' }}>
        <BottomNavigation
          showLabels
          value={activeTab(location.pathname)}
          onChange={(_e, value) => navigate(value)}
        >
          {TABS.map((tab) => (
            <BottomNavigationAction
              key={tab.value}
              label={tab.label}
              value={tab.value}
              icon={tab.icon}
            />
          ))}
        </BottomNavigation>
      </Paper>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} />
    </Box>
  );
}
