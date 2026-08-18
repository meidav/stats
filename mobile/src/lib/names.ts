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
