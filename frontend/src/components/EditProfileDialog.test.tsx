import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditProfileDialog from './EditProfileDialog';
import { renderWithProviders } from '../test/utils';
import { installFetchMock } from '../test/fetchMock';

const ME = { id: 'u1', display_name: 'Me', avatar_url: null };

/** Seed an authenticated session: cache + /api/me confirmation. */
function authedRoutes(extra: Record<string, unknown> = {}) {
  localStorage.setItem('parallel.auth', JSON.stringify(ME));
  return installFetchMock({
    'GET /api/me': { user: ME },
    ...extra,
  });
}

function renderDialog() {
  return renderWithProviders(
    <EditProfileDialog
      open
      onClose={() => {}}
      userId="u1"
      displayName="Me"
      avatarUrl={null}
    />,
  );
}

describe('EditProfileDialog', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders the display name prefilled', () => {
    authedRoutes();
    renderDialog();
    expect(screen.getByLabelText('Display name')).toHaveValue('Me');
  });

  it('edits the name and Save calls PATCH /api/me with the new value', async () => {
    const fetchStub = authedRoutes({
      'PATCH /api/me': () => ({
        user: { ...ME, display_name: 'Renamed', avatar_url: null, is_seed: false },
      }),
    });
    const user = userEvent.setup();
    renderDialog();

    const input = screen.getByLabelText('Display name');
    await user.clear(input);
    await user.type(input, 'Renamed');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      const call = fetchStub.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith('/api/me') &&
          (init?.method ?? 'GET').toUpperCase() === 'PATCH',
      );
      expect(call).toBeTruthy();
      const body = JSON.parse(String(call![1]!.body));
      expect(body.display_name).toBe('Renamed');
    });

    // Reflects the returned user in the AuthContext snapshot.
    await waitFor(() => {
      const snap = JSON.parse(localStorage.getItem('parallel.auth') ?? '{}');
      expect(snap.display_name).toBe('Renamed');
    });
  });

  it('shows a validation error for an empty name and does not submit', async () => {
    const fetchStub = authedRoutes({
      'PATCH /api/me': () => ({ user: ME }),
    });
    const user = userEvent.setup();
    renderDialog();

    const input = screen.getByLabelText('Display name');
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(
      fetchStub.mock.calls.some(
        ([url, init]) =>
          String(url).endsWith('/api/me') &&
          (init?.method ?? 'GET').toUpperCase() === 'PATCH',
      ),
    ).toBe(false);
  });
});
