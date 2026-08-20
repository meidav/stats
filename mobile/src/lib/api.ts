import { API_BASE_URL } from '../constants/config';

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach PlayTracker. Check your connection.', 0);
  }

  const data = await response.json().catch(() => ({}));

    if (!response.ok) {
    const payload = data as { error?: string; msg?: string; message?: string };
    const raw = payload.error || payload.msg || payload.message || '';
    let message = raw || `Request failed (${response.status})`;
    if (response.status === 401 && options.token) {
      message = 'Your session expired. Sign out and sign in again.';
    } else if (response.status === 401) {
      message = 'Could not sign in. Check your email and password.';
    }
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export const api = {
  health: () =>
    request<{ app: string; tagline: string; domain: string }>('/health'),

  login: (email: string, password: string) =>
    request<{ access_token: string; user: import('../types').User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  register: (email: string, password: string) =>
    request<{ access_token: string; user: import('../types').User }>('/auth/register', {
      method: 'POST',
      body: { email, password },
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),

  resetPassword: (token: string, password: string) =>
    request<{ access_token: string; user: import('../types').User }>('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    }),

  loginWithGoogle: (idToken: string) =>
    request<{ access_token: string; user: import('../types').User }>('/auth/google', {
      method: 'POST',
      body: { id_token: idToken },
    }),

  getTemplates: () =>
    request<{ templates: import('../types').SportTemplate[] }>('/sports/templates'),

  getMyLeagues: (token: string) =>
    request<{ leagues: import('../types').League[] }>('/leagues/mine', { token }),

  getLeague: (slug: string, token?: string | null) =>
    request<import('../types').League>(`/leagues/${slug}`, { token }),

  createLeague: (
    token: string,
    payload: {
      name: string;
      visibility: string;
      sport_template_id?: string;
      description?: string;
      focus?: 'sports' | 'table' | 'mixed';
    },
  ) =>
    request<import('../types').League>('/leagues', {
      method: 'POST',
      token,
      body: payload,
    }),

  getLeagueIconUsage: () =>
    request<{
      sports_leagues: number;
      games_leagues: number;
      icon_counts: Record<string, number>;
    }>('/league-icons'),

  updateLeague: (
    token: string,
    slug: string,
    payload: { name?: string; icon?: string | null; visibility?: string },
  ) =>
    request<import('../types').League>(`/leagues/${slug}`, {
      method: 'PUT',
      token,
      body: payload,
    }),

  deleteLeague: (token: string, slug: string) =>
    request<{ ok: boolean; slug: string }>(`/leagues/${slug}`, {
      method: 'DELETE',
      token,
    }),

  getSportStats: (
    sportId: number,
    token?: string | null,
    options?: { minGames?: number; today?: string; year?: string | null },
  ) => {
    const params = new URLSearchParams();
    if (options?.minGames != null) {
      params.set('min_games', String(options.minGames));
    }
    if (options?.today) {
      params.set('today', options.today);
    }
    if (options?.year) {
      params.set('year', options.year);
    }
    const query = params.toString();
    return request<import('../types').SportStats>(
      `/sports/${sportId}/stats${query ? `?${query}` : ''}`,
      { token },
    );
  },

  getPlayerStats: (
    sportId: number,
    playerName: string,
    token?: string | null,
    options?: { year?: string | null },
  ) => {
    const params = new URLSearchParams();
    if (options?.year) {
      params.set('year', options.year);
    }
    const query = params.toString();
    return request<import('../types').PlayerProfile>(
      `/sports/${sportId}/players/${encodeURIComponent(playerName)}${query ? `?${query}` : ''}`,
      { token },
    );
  },

  updatePlayer: (
    token: string,
    sportId: number,
    playerName: string,
    payload: { name?: string; photo?: string | null },
  ) =>
    request<import('../types').PlayerProfile>(
      `/sports/${sportId}/players/${encodeURIComponent(playerName)}`,
      {
        method: 'PATCH',
        token,
        body: payload,
      },
    ),

  getMyPlayers: (token: string) =>
    request<{ players: string[] }>('/players', { token }),

  getScoreHints: (sportId: number, token?: string | null) =>
    request<{ winner_score: number | null; loser_scores: number[]; score_mode: string }>(
      `/sports/${sportId}/score-hints`,
      { token },
    ),

  getSportGames: (
    sportId: number,
    token?: string | null,
    options?: { year?: string | null; limit?: number; offset?: number },
  ) => {
    const params = new URLSearchParams();
    if (options?.year) {
      params.set('year', options.year);
    }
    if (options?.limit != null) {
      params.set('limit', String(options.limit));
    }
    if (options?.offset != null) {
      params.set('offset', String(options.offset));
    }
    const query = params.toString();
    return request<import('../types').SportGamesPage>(
      `/sports/${sportId}/games${query ? `?${query}` : ''}`,
      { token },
    );
  },

  addGame: (
    token: string,
    sportId: number,
    payload: {
      winners: string[];
      losers: string[];
      winner_score?: number;
      loser_score?: number;
      game_date?: string;
      metadata?: Record<string, unknown>;
    },
  ) =>
    request<import('../types').Game>(`/sports/${sportId}/games`, {
      method: 'POST',
      token,
      body: payload,
    }),

  updateGame: (
    token: string,
    gameId: number,
    payload: {
      winners: string[];
      losers: string[];
      winner_score?: number;
      loser_score?: number;
      game_date?: string;
      metadata?: Record<string, unknown>;
    },
  ) =>
    request<import('../types').Game>(`/games/${gameId}`, {
      method: 'PUT',
      token,
      body: payload,
    }),

  deleteGame: (token: string, gameId: number) =>
    request<{ success: boolean }>(`/games/${gameId}`, {
      method: 'DELETE',
      token,
    }),

  discoverLeagues: (query?: string) =>
    request<{
      leagues: Array<
        Pick<import('../types').League, 'id' | 'name' | 'slug' | 'description' | 'share_url'> & {
          sport_count?: number;
        }
      >;
    }>(`/discover${query ? `?q=${encodeURIComponent(query)}` : ''}`),
};
