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
    const lower = raw.toLowerCase();
    let message = raw || `Request failed (${response.status})`;
    if (response.status === 401 || lower.includes('expired') || lower.includes('token')) {
      message = 'Your session expired. Sign out and sign in again.';
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

  updateLeague: (
    token: string,
    slug: string,
    payload: { name?: string; icon?: string | null },
  ) =>
    request<import('../types').League>(`/leagues/${slug}`, {
      method: 'PUT',
      token,
      body: payload,
    }),

  getSportStats: (sportId: number, token?: string | null, minGames = 1) =>
    request<import('../types').SportStats>(
      `/sports/${sportId}/stats?min_games=${minGames}`,
      { token },
    ),

  getPlayerStats: (sportId: number, playerName: string, token?: string | null) =>
    request<import('../types').PlayerProfile>(
      `/sports/${sportId}/players/${encodeURIComponent(playerName)}`,
      { token },
    ),

  getMyPlayers: (token: string) =>
    request<{ players: string[] }>('/players', { token }),

  getScoreHints: (sportId: number, token?: string | null) =>
    request<{ winner_score: number | null; loser_scores: number[]; score_mode: string }>(
      `/sports/${sportId}/score-hints`,
      { token },
    ),

  getSportGames: (sportId: number, token?: string | null) =>
    request<{ games: import('../types').Game[] }>(`/sports/${sportId}/games`, { token }),

  addGame: (
    token: string,
    sportId: number,
    payload: {
      winners: string[];
      losers: string[];
      winner_score?: number;
      loser_score?: number;
    },
  ) =>
    request<import('../types').Game>(`/sports/${sportId}/games`, {
      method: 'POST',
      token,
      body: payload,
    }),

  discoverLeagues: (query?: string) =>
    request<{ leagues: Array<Pick<import('../types').League, 'id' | 'name' | 'slug' | 'description'>> }>(
      `/discover${query ? `?q=${encodeURIComponent(query)}` : ''}`,
    ),
};
