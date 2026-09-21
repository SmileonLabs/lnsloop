import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import type { HealthDataProvider, HealthRecord } from "@loop/contracts";
export const nativeHealth =
  Platform.OS === "android" || Platform.OS === "ios"
    ? requireOptionalNativeModule("LoopHealth")
    : null;
export const health: HealthDataProvider = {
  changesToken: async (types) =>
    nativeHealth ? nativeHealth.getChangesToken(types) : null,
  changes: async (token) => {
    if (!nativeHealth) throw new Error("Health Connect unavailable");
    return nativeHealth.readChanges(token);
  },
  availability: async () =>
    nativeHealth
      ? nativeHealth.availability()
      : { available: false, reason: "Android Health Connect required" },
  permissions: async (types) =>
    nativeHealth ? nativeHealth.permissions(types) : [],
  requestPermissions: async (types) => {
    if (!nativeHealth) throw new Error("Health Connect unavailable");
    await nativeHealth.requestPermissions(types);
    return nativeHealth.permissions(types);
  },
  read: async (types, start, end) => {
    if (!nativeHealth) throw new Error("Health Connect unavailable");
    return ((await nativeHealth.read(types, start, end)) as HealthRecord[]).map(
      (r) => ({
        ...r,
        start: new Date(r.start).toISOString(),
        end: new Date(r.end).toISOString(),
      }),
    );
  },
  aggregate: async (types, start, end) =>
    nativeHealth ? nativeHealth.aggregate(types, start, end) : {},
  openSettings: async () => {
    if (nativeHealth) await nativeHealth.openSettings();
  },
};
// Large health payloads are encrypted in app-private Android storage, not AsyncStorage.
export async function readPrivate(key: string) {
  return nativeHealth
    ? JSON.parse((await nativeHealth.readPrivate(key)) || "null")
    : null;
}
export async function writePrivate(key: string, value: unknown) {
  if (!nativeHealth)
    throw new Error("Secure offline storage requires the mobile app");
  await nativeHealth.writePrivate(key, JSON.stringify(value));
}
export async function deletePrivate(key: string) {
  if (nativeHealth) await nativeHealth.deletePrivate(key);
}
