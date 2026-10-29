import { useWindowDimensions } from 'react-native';

/** Treat as tablet / large layout when width clears phone landscape. */
export const TABLET_MIN_WIDTH = 700;

/** Comfortable form width for auth / welcome on tablet. */
export const CONTENT_MAX_WIDTH = 440;

export function useIsTablet() {
  const { width } = useWindowDimensions();
  return width >= TABLET_MIN_WIDTH;
}

/**
 * Optional cap for single-column forms (login, welcome).
 * List screens should stay full-bleed with horizontal padding instead.
 */
export function useContentMaxWidth(max = CONTENT_MAX_WIDTH) {
  const { width } = useWindowDimensions();
  if (width < TABLET_MIN_WIDTH) return undefined;
  return Math.min(Math.round(width * 0.5), max);
}
