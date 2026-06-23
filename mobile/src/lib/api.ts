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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = (data as { error?: string }).error ?? 'Request failed';
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export const api = {
  health: () =>
    request<{ app: string; tagline: string; domain: string }>('/health'),

  login: (username: string, password: string) =>
    request<{ access_token: string; user: import('../types').User }>('/auth/login', {
      method: 'POST',
      body: { username, password },
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
    },
  ) =>
    request<import('../types').League>('/leagues', {
      method: 'POST',
      token,
      body: payload,
    }),

  getSportStats: (sportId: number, token?: string | null, minGames = 1) =>
    request<import('../types').SportStats>(
      `/sports/${sportId}/stats?min_games=${minGames}`,
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
      winner_score: number;
      loser_score: number;
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
