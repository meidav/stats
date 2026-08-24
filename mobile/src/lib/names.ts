import type { User } from '../types';

/** Optional social profile fields once Apple/Google sign-in stores them. */
export type NameSuggestionUser = Pick<User, 'email' | 'username'> & {
  display_name?: string | null;
  first_name?: string | null;
};

function isApplePrivateRelayEmail(email: string) {
  return email.trim().toLowerCase().endsWith('@privaterelay.appleid.com');
}

/** Random Hide My Email / opaque ids are useless as a friendly name. */
function looksLikeOpaqueId(value: string) {
  const cleaned = value.replace(/[^a-z0-9]/gi, '');
  if (cleaned.length < 10) return false;
  const vowels = (cleaned.match(/[aeiou]/gi) || []).length;
  return vowels / cleaned.length < 0.18;
}

function titleCaseLocal(local: string) {
  return local
    .split(/[._+\-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function firstNameToken(value: string) {
  return value.trim().split(/\s+/).filter(Boolean)[0] || '';
}

function possessive(name: string) {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

/**
 * Friendly first-name style label for league name suggestions.
 * Prefers first_name / display_name (Apple/Google later), then email local-part,
 * then username. Skips Apple private relay and opaque tokens.
 */
export function ownerLabelForSuggestion(user: NameSuggestionUser | null | undefined) {
  if (!user) return null;

  const social = (user.first_name || user.display_name || '').trim();
  if (social && !looksLikeOpaqueId(social)) {
    return firstNameToken(titleCaseLocal(social));
  }

  const email = (user.email || '').trim().toLowerCase();
  if (email.includes('@') && !isApplePrivateRelayEmail(email)) {
    const local = email.split('@')[0] || '';
    if (local && !looksLikeOpaqueId(local)) {
      return firstNameToken(titleCaseLocal(local));
    }
  }

  const username = (user.username || '').trim();
  if (username && !looksLikeOpaqueId(username)) {
    return firstNameToken(titleCaseLocal(username));
  }

  return null;
}

export function suggestLeagueName(
  user: NameSuggestionUser | null | undefined,
  templateName: string | null | undefined,
) {
  const sport = (templateName || '').trim() || 'League';
  const owner = ownerLabelForSuggestion(user);
  if (owner) return `${possessive(owner)} ${sport}`;
  return `My ${sport}`;
}

export function autoCapWords(value: string) {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    const prev = i === 0 ? ' ' : value[i - 1];
    if (/[a-z]/.test(ch) && /[\s'-]/.test(prev)) {
      out += ch.toUpperCase();
    } else {
      out += ch;
    }
  }
  return out;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatPlusMinus(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function winPctColor(pct: number, colors: { win: string; loss: string; neutral: string }) {
  if (pct >= 0.6) return colors.win;
  if (pct <= 0.4) return colors.loss;
  return colors.neutral;
}

export function firstResultCopy(sportName: string, templateId?: string) {
  const name = sportName.trim();
  if (!name) return 'Add your first game to start the standings.';
  if (/\b(games?|matches?|hands?)\b/i.test(name)) {
    return `Add your first ${name} to start the standings.`;
  }
  const noun = templateId?.startsWith('tennis') ? 'match' : 'game';
  return `Add your first ${name} ${noun} to start the standings.`;
}
