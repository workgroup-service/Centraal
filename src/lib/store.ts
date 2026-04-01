/**
 * @author Cursor
 *
 * Tauri Store plugin wrapper for persisting settings and timer state.
 * Falls back to in-memory storage when running outside Tauri (e.g. browser dev).
 */

import { load, type Store } from "@tauri-apps/plugin-store";
import type { IssueTimerState } from "@/types/gitlab";

const STORE_FILE = "settings.json";

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await load(STORE_FILE, {
      defaults: {},
      autoSave: true,
    });
  }
  return storeInstance;
}

function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const memoryStore = new Map<string, unknown>();

export async function getSettingValue(key: string): Promise<string | null> {
  if (!isTauriEnv()) {
    const v = memoryStore.get(key);
    return typeof v === "string" ? v : null;
  }
  const store = await getStore();
  const value = await store.get<string>(key);
  return value ?? null;
}

export async function setSettingValue(
  key: string,
  value: string
): Promise<void> {
  if (!isTauriEnv()) {
    memoryStore.set(key, value);
    return;
  }
  const store = await getStore();
  await store.set(key, value);
}

export const SETTINGS_KEYS = {
  GITLAB_TOKEN: "gitlab_token",
  GITLAB_URL: "gitlab_url",
  TIMER_STATES: "timer_states",
  ATTENDANCE_STATUS: "attendance_status",
  LAST_ACTIVE_ISSUE_ID: "last_active_issue_id",
  LAST_ALIVE_AT: "last_alive_at",
} as const;

interface SerializedTimerState {
  issueId: number;
  startTime: number | null;
  accumulatedMs: number;
  isRunning: boolean;
}

export async function saveTimerStates(
  states: Map<number, IssueTimerState>
): Promise<void> {
  const arr: SerializedTimerState[] = Array.from(states.values()).filter(
    (s) => s.isRunning || s.accumulatedMs > 0
  );

  if (!isTauriEnv()) {
    memoryStore.set(SETTINGS_KEYS.TIMER_STATES, arr);
    return;
  }
  const store = await getStore();
  await store.set(SETTINGS_KEYS.TIMER_STATES, arr);
}

export async function loadTimerStates(): Promise<Map<number, IssueTimerState>> {
  const map = new Map<number, IssueTimerState>();

  let arr: unknown;
  if (!isTauriEnv()) {
    arr = memoryStore.get(SETTINGS_KEYS.TIMER_STATES) ?? null;
  } else {
    const store = await getStore();
    arr = await store.get<SerializedTimerState[]>(SETTINGS_KEYS.TIMER_STATES);
  }

  if (!Array.isArray(arr)) return map;

  for (const raw of arr) {
    const obj = raw as Record<string, unknown>;
    const state: IssueTimerState = {
      issueId: Number(obj.issueId),
      startTime: obj.startTime != null ? Number(obj.startTime) : null,
      accumulatedMs: Number(obj.accumulatedMs ?? 0),
      isRunning: Boolean(obj.isRunning),
    };
    map.set(state.issueId, state);
  }

  return map;
}
