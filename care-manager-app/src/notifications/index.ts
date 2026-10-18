import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';

/**
 * Local (on-device) alerting only.
 *
 * Remote push would need the backend to store a device token, and no such
 * endpoint exists on the `/cm/*` surface — inventing one is not allowed.
 *
 * **Why `expo-notifications` is loaded lazily, and never in Expo Go.**
 * Its entry point is a barrel that eagerly pulls in the push modules, and one
 * of them calls `requireNativeModule('ExpoTopicSubscriptionModule')` at import
 * time. Expo Go has shipped no push native code since SDK 53, so merely
 * importing the package there floods the log with that missing-module error
 * plus an "not fully supported in Expo Go" warning — once per screen that
 * touches it and again on every reload. Nothing in this app needs the module in
 * Expo Go: the emergency dialog and the vibration carry the alert. So in Expo
 * Go the module is never loaded, and in a development or production build it is
 * required on first use.
 */
function inExpoGo(): boolean {
  try {
    if (isRunningInExpoGo()) return true;
  } catch {
    /* older/newer runtime without the helper — fall through to Constants */
  }
  return Constants.executionEnvironment === 'storeClient';
}

type NotificationsModule = typeof import('expo-notifications');

// `undefined` = not tried yet, `null` = unavailable in this runtime.
let cached: NotificationsModule | null | undefined;

function load(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (inExpoGo()) {
    cached = null;
    return null;
  }
  try {
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

/** True when a local notification can actually be posted on this device. */
export function notificationsAvailable(): boolean {
  return load() !== null;
}

let configured = false;

export function configureNotifications(): void {
  if (configured) return;
  configured = true;

  const Notifications = load();
  if (!Notifications) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    /* unsupported in this runtime — the in-app alert still fires */
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = load();
  if (!Notifications) return false;

  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** Fires immediately. Silently does nothing when notifications are unavailable. */
export async function notifyNow(title: string, body: string): Promise<void> {
  const Notifications = load();
  if (!Notifications) return;

  try {
    configureNotifications();
    const allowed = await ensureNotificationPermission();
    if (!allowed) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  } catch {
    /* ignored on purpose — the in-app dialog is the primary alert */
  }
}
