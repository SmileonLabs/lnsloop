import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useCallback,
} from "react";
import { Platform, AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getLocales } from "expo-localization";
import { copy, type Language, type CopyKey } from "./i18n";
import {
  deletePrivate,
  nativeHealth,
  readPrivate,
  writePrivate,
  health,
} from "./health";
import type { SubmissionInput } from "@loop/contracts";
const API = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const Context = createContext<any>(null);
let webToken: string | null = null;
export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [user, setUser] = useState<any>(null),
    [lang, setLang] = useState<Language>(
      getLocales()[0]?.languageCode === "ko" ? "ko" : "en",
    );
  const request = useCallback(
    async (path: string, method = "GET", body?: unknown, override?: string) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      try {
        const r = await fetch(API + path, {
          method,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...((override ?? token)
              ? { Authorization: "Bearer " + (override ?? token) }
              : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await r.json();
        if (!r.ok) {
          if (r.status === 401 && token) {
            if (nativeHealth) await nativeHealth.cancelAutomatic();
            if (Platform.OS !== "web")
              await SecureStore.deleteItemAsync("loop-session");
            webToken = null;
            setToken(null);
            setUser(null);
          }
          throw new ApiError(r.status, data.error ?? "Request failed");
        }
        return data;
      } finally {
        clearTimeout(timer);
      }
    },
    [token],
  );
  useEffect(() => {
    (async () => {
      try {
        const saved =
          Platform.OS === "web"
            ? webToken
            : await SecureStore.getItemAsync("loop-session");
        if (saved) {
          const me = await request("/me", "GET", undefined, saved);
          setToken(saved);
          setUser(me);
          setLang(me.language);
        }
      } catch {
      } finally {
        setReady(true);
      }
    })();
  }, []);
  useEffect(() => {
    if (!token || !user || !nativeHealth) return;
    let running = false;
    const flush = async () => {
      if (running) return;
      running = true;
      try {
        const key = "queue-" + user.id;
        let queue: SubmissionInput[] = (await readPrivate(key)) ?? [];
        for (const payload of [...queue]) {
          const enrolled = await request("/enrollments");
          const current = enrolled.find(
            (e: any) =>
              e.study_id === payload.studyId &&
              !e.withdrawn_at &&
              e.version === payload.version,
          );
          const permitted =
            payload.activity === "survey" ||
            (
              await health.permissions([
                ...new Set(payload.records.map((r) => r.type)),
              ])
            ).length === new Set(payload.records.map((r) => r.type)).size;
          if (current && permitted) {
            try {
              await request("/submissions", "POST", payload);
            } catch (e) {
              if (
                !(e instanceof ApiError) ||
                e.status === 401 ||
                e.status >= 500
              )
                throw e;
            }
          }
          queue = queue.filter((p) => p !== payload);
          await writePrivate(key, queue);
        }
      } catch {
      } finally {
        running = false;
      }
    };
    void flush();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void flush();
    }, 30000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void flush();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [token, user?.id, request]);
  async function login(path: string, body: unknown) {
    const result = await request(path, "POST", body);
    if (Platform.OS === "web") webToken = result.token;
    else await SecureStore.setItemAsync("loop-session", result.token);
    setToken(result.token);
    setUser(result.user);
    setLang(result.user.language);
  }
  async function clear() {
    if (nativeHealth) await nativeHealth.cancelAutomatic();
    if (user) await deletePrivate("queue-" + user.id);
    if (Platform.OS === "web") webToken = null;
    else await SecureStore.deleteItemAsync("loop-session");
    setToken(null);
    setUser(null);
  }
  async function logout() {
    try {
      await request("/auth/logout", "POST");
    } finally {
      await clear();
    }
  }
  const t = (key: CopyKey) => copy[lang][key];
  return (
    <Context.Provider
      value={{
        token,
        ready,
        user,
        setUser,
        lang,
        setLang,
        t,
        request,
        login,
        logout,
        clear,
        apiUrl: API,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  return useContext(Context) as {
    token: string | null;
    ready: boolean;
    user: any;
    setUser: (u: any) => void;
    lang: Language;
    setLang: (l: Language) => void;
    t: (k: CopyKey) => string;
    request: (path: string, method?: string, body?: unknown) => Promise<any>;
    login: (path: string, body: unknown) => Promise<void>;
    logout: () => Promise<void>;
    clear: () => Promise<void>;
    apiUrl: string;
  };
}
