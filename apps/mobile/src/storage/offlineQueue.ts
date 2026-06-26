import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../api/client';

const OFFLINE_QUEUE_KEY = 'southin_mobile_offline_queue_v1';

export type OfflineQueueMethod = 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type OfflineQueueItem = {
  id: string;
  type: string;
  path: string;
  method: OfflineQueueMethod;
  payload: any;
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
};

function createQueueId() {
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function errorMessage(error: any) {
  return error?.message || 'Sync failed.';
}

async function saveOfflineQueue(queue: OfflineQueueItem[]) {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function clearOfflineQueue() {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export async function removeOfflineQueueItem(id: string) {
  const queue = await getOfflineQueue();
  await saveOfflineQueue(queue.filter((item) => item.id !== id));
}

export async function enqueueOfflineRequest(input: {
  type: string;
  path: string;
  method: OfflineQueueMethod;
  payload: any;
}) {
  const queue = await getOfflineQueue();

  const item: OfflineQueueItem = {
    id: createQueueId(),
    type: input.type,
    path: input.path,
    method: input.method,
    payload: input.payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  await saveOfflineQueue([...queue, item]);

  return item;
}

export async function enqueueFleetInspection(payload: any) {
  return enqueueOfflineRequest({
    type: 'FLEET_INSPECTION',
    path: '/fleet/inspections',
    method: 'POST',
    payload,
  });
}

export async function syncOfflineQueue() {
  const queue = await getOfflineQueue();

  if (!queue.length) {
    return {
      synced: [],
      failed: [],
      remaining: [],
    };
  }

  const synced: OfflineQueueItem[] = [];
  const failed: OfflineQueueItem[] = [];
  const remaining: OfflineQueueItem[] = [];

  for (const item of queue) {
    try {
      await apiRequest(item.path, {
        method: item.method,
        body: JSON.stringify(item.payload),
      });

      synced.push(item);
    } catch (error: any) {
      const updatedItem: OfflineQueueItem = {
        ...item,
        attempts: item.attempts + 1,
        lastAttemptAt: new Date().toISOString(),
        lastError: errorMessage(error),
      };

      failed.push(updatedItem);
      remaining.push(updatedItem);
    }
  }

  await saveOfflineQueue(remaining);

  return {
    synced,
    failed,
    remaining,
  };
}