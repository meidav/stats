/**
 * PostHog analytics — shared "All Projects" PostHog project.
 * Every event is tagged with app/platform/surface so all of Arbel's products
 * can be compared side by side in one dashboard.
 *
 * Pure JS: posthog-react-native only uses native modules this app already ships
 * (all its native deps are optional), so this is safe to deliver via OTA update.
 * Disabled in development builds so local testing doesn't pollute the stats.
 */
import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';

const POSTHOG_KEY = 'phc_BhbTt7C4aSQmfmiPnPNGWkbUi8zAKQp7SoKCiggp92Y2'; // public, write-only
const POSTHOG_HOST = 'https://us.i.posthog.com';

export const posthog = new PostHog(POSTHOG_KEY, {
  host: POSTHOG_HOST,
  disabled: __DEV__,
  captureAppLifecycleEvents: true,
  personProfiles: 'identified_only',
});

void Promise.resolve(
  posthog.register({ app: 'playtracker', platform: Platform.OS, surface: 'playtracker-app' }),
).catch(() => {});

type Props = Record<string, string | number | boolean | null | undefined>;

/** Record a product event. Never throws. */
export function trackEvent(name: string, properties?: Props): void {
  try {
    posthog.capture(name, properties as any);
  } catch {}
}

let lastScreen: string | null = null;

/** Record a screen view (consecutive repeats of the same screen are ignored). Never throws. */
export function trackScreen(name: string, properties?: Props): void {
  if (!name || name === lastScreen) return;
  lastScreen = name;
  try {
    void Promise.resolve(posthog.screen(name, properties as any)).catch(() => {});
  } catch {}
}

/** Tie this device's events to a signed-in user id (internal id, not email). */
export function identifyUser(userId: string | number | null | undefined): void {
  // Never use an email address as the PostHog id.
  if (userId == null || userId === '' || String(userId).includes('@')) return;
  try {
    posthog.identify(String(userId));
  } catch {}
}

/** Call on logout so the next person on this device isn't merged with the last. */
export function resetAnalyticsUser(): void {
  try {
    posthog.reset();
  } catch {}
}
