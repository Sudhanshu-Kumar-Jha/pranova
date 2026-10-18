import * as SplashScreen from 'expo-splash-screen';

/**
 * Native splash handoff.
 *
 * Without this the native splash disappears the moment the JS bundle is
 * handed control, which is *before* the first screen can paint — that gap is
 * the blank white screen users see when they open the app from the launcher.
 * Holding the native splash until the branded splash screen has actually laid
 * out makes the transition seamless: the same mark, on the same background,
 * from launcher tap to first frame.
 */
let held = false;

/** Called at module scope in the root layout, before anything renders. */
export function holdNativeSplash(): void {
  if (held) return;
  held = true;
  // Both calls are best-effort: a failure here must never stop the app from
  // starting, and neither is available when running in a browser.
  SplashScreen.preventAutoHideAsync().catch(() => {});
  try {
    SplashScreen.setOptions({ duration: 250, fade: true });
  } catch {
    /* older runtimes have no options API */
  }
}

/**
 * Releases the native splash. Safe to call repeatedly and from several places:
 * the branded splash calls it once it has painted, and the root layout calls it
 * on a timer so a deep link that bypasses the splash route can never leave the
 * app stuck behind it.
 */
export async function releaseNativeSplash(): Promise<void> {
  try {
    await SplashScreen.hideAsync();
  } catch {
    /* already hidden, or unsupported on this platform */
  }
}
