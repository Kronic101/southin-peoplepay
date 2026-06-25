import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'southin_mobile_session';

export type MobileSession = {
  token?: string | null;
  userId?: string | null;
  employeeNo?: string | null;
  driverId?: string | null;
  name?: string | null;
  role?: string | null;
  expiresAt?: string | null;
  [key: string]: any;
};

let memorySession: string | null = null;

function getWebStorage() {
  if (typeof globalThis === 'undefined') return null;
  return (globalThis as any).localStorage || null;
}

function parseSession(raw: string | null): MobileSession | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as MobileSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<MobileSession | null> {
  try {
    if (Platform.OS === 'web') {
      const storage = getWebStorage();
      const raw = storage?.getItem(SESSION_KEY) || memorySession;
      return parseSession(raw);
    }

    const available = await SecureStore.isAvailableAsync().catch(() => false);

    if (!available) {
      return parseSession(memorySession);
    }

    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return parseSession(raw);
  } catch {
    return parseSession(memorySession);
  }
}

export async function saveSession(session: MobileSession): Promise<void> {
  const raw = JSON.stringify(session);
  memorySession = raw;

  try {
    if (Platform.OS === 'web') {
      const storage = getWebStorage();
      storage?.setItem(SESSION_KEY, raw);
      return;
    }

    const available = await SecureStore.isAvailableAsync().catch(() => false);

    if (available) {
      await SecureStore.setItemAsync(SESSION_KEY, raw);
    }
  } catch {
    memorySession = raw;
  }
}

export async function setSession(session: MobileSession): Promise<void> {
  return saveSession(session);
}

export async function clearSession(): Promise<void> {
  memorySession = null;

  try {
    if (Platform.OS === 'web') {
      const storage = getWebStorage();
      storage?.removeItem(SESSION_KEY);
      return;
    }

    const available = await SecureStore.isAvailableAsync().catch(() => false);

    if (available) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  } catch {
    memorySession = null;
  }
}