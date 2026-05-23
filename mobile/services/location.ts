import * as Location from 'expo-location';

/**
 * Robust location fetcher with timeout + fallback to last known position.
 *
 * `getCurrentPositionAsync` can hang indefinitely on many devices when
 * the GPS hasn't warmed up or the user is indoors. This helper:
 *  1. Tries `getLastKnownPositionAsync` first (instant, ~0ms).
 *  2. Races `getCurrentPositionAsync` against a configurable timeout.
 *  3. If both fail, tries once more with low accuracy.
 *
 * The "last known first" strategy means we almost always return in <100ms
 * for users who have used their phone's GPS recently.
 */
export async function getLocationSafe(
  opts: {
    accuracy?: Location.Accuracy;
    timeoutMs?: number;
  } = {},
): Promise<Location.LocationObject> {
  const { accuracy = Location.Accuracy.Balanced, timeoutMs = 10000 } = opts;

  // 1. Try last known position FIRST — this is instant and almost always available
  try {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: 300_000,         // accept fixes up to 5 min old (was 60s)
      requiredAccuracy: 200,   // within 200m is fine for initial display
    });
    if (lastKnown) {
      // Fire a fresh GPS fix in the background so the next call is accurate,
      // but don't block on it.
      Location.getCurrentPositionAsync({ accuracy }).catch(() => {});
      return lastKnown;
    }
  } catch (e) {
    console.warn('[getLocationSafe] getLastKnownPositionAsync failed:', e);
  }

  // 2. No cached fix — get a fresh one with timeout
  try {
    const loc = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Location request timed out')), timeoutMs),
      ),
    ]);
    return loc;
  } catch {
    // Fall through to low-accuracy attempt
  }

  // 3. One final attempt with lower accuracy (cell tower / WiFi — very fast)
  try {
    const loc = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Location request timed out (low accuracy)')), 6000),
      ),
    ]);
    return loc;
  } catch {
    throw new Error(
      'Unable to determine your location. Please ensure GPS/Location Services are enabled and try again outdoors.',
    );
  }
}

/**
 * Request foreground location permission and verify services are enabled.
 * Returns true if ready to use location, false otherwise.
 */
export async function ensureLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return false;
  }

  // Note: Location.hasServicesEnabledAsync() can return false on simulators
  // even when location services are active/simulated. We log the status but
  // do not let it block location features if permissions are granted.
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      console.warn('[ensureLocationPermission] hasServicesEnabledAsync returned false, proceeding anyway.');
    }
  } catch (e) {
    console.warn('[ensureLocationPermission] failed to check location services status:', e);
  }

  return true;
}
