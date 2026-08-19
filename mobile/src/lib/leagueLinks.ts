import { Platform, Share } from 'react-native';

import { APP_NAME, APP_URL } from '../constants/brand';
import type { League } from '../types';

export function leagueWebUrl(slug: string) {
  return `${APP_URL}/l/${encodeURIComponent(slug)}`;
}

export function parseLeagueSlugFromUrl(url: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const withHost = /^playtracker:\/\//i.test(trimmed)
    ? trimmed.replace(/^playtracker:\/\//i, 'https://playtracker.org/')
    : trimmed;
  try {
    const parsed = new URL(withHost);
    const match = parsed.pathname.match(/(?:^|\/)l\/([^/]+)\/?$/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    const match = trimmed.match(/(?:^|\/)l\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
}

export async function shareLeague(
  league: Pick<League, 'name' | 'slug' | 'visibility' | 'share_url' | 'invite_code'>,
) {
  const url =
    league.share_url ||
    (league.visibility === 'private' ? null : leagueWebUrl(league.slug));

  if (url) {
    const title = `${league.name} standings on ${APP_NAME}`;
    if (Platform.OS === 'ios') {
      await Share.share({ title, message: title, url });
      return;
    }
    await Share.share({ title, message: `${title}\n${url}` });
    return;
  }

  if (league.invite_code) {
    const message = `Join ${league.name} on ${APP_NAME}. Invite code: ${league.invite_code}`;
    await Share.share({ title: league.name, message });
  }
}
