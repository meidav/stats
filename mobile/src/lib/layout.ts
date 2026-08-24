import { useWindowDimensions } from 'react-native';

/** Treat as tablet / large layout when the shorter dimension clears phone width. */
export const TABLET_MIN_WIDTH = 700;

/** Comfortable phone-card width; half an iPad portrait is roughly this size. */
export const CONTENT_MAX_WIDTH = 440;

export function useIsTablet() {
  const { width } = useWindowDimensions();
  return width >= TABLET_MIN_WIDTH;
}

/**
 * Max width for hero cards, auth forms, and empty states.
 * Phones stay full-bleed (parent padding handles margins). Tablets cap near half width.
 */
export function useContentMaxWidth(max = CONTENT_MAX_WIDTH) {
  const { width } = useWindowDimensions();
  if (width < TABLET_MIN_WIDTH) return undefined;
  return Math.min(Math.round(width * 0.5), max);
}
