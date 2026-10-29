export const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Public', hint: 'Listed for anyone to find.' },
  { id: 'unlisted', label: 'Unlisted', hint: 'Anyone with the link can view. Not listed in search.' },
  { id: 'private', label: 'Private', hint: 'Only members. Share an invite code to join.' },
] as const;

export type LeagueVisibility = (typeof VISIBILITY_OPTIONS)[number]['id'];

export function hintForVisibility(visibility: LeagueVisibility) {
  return VISIBILITY_OPTIONS.find((option) => option.id === visibility)?.hint ?? '';
}
