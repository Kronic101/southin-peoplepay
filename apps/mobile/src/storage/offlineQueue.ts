import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_QUEUE_KEY = 'southin_mobile_offline_queue';

export type OfflineQueueItem = {
  id: string;
  module: 'FLEET' | 'ASSETS';
  type: string;
  endpoint: string;
  method: 'POST' | 'PATCH';
  payload: any;
  createdAt: string;
};

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addOfflineQueueItem(
  item: Omit<OfflineQueueItem, 'id' | 'createdAt'>,
) {
  const queue = await getOfflineQueue();

  const record: OfflineQueueItem = {
    ...item,
    id: `OFF-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([record, ...queue]));

  return record;
}

export async function removeOfflineQueueItem(id: string) {
  const queue = await getOfflineQueue();
  const next = queue.filter((item) => item.id !== id);

  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));

  return next;
}

export async function clearOfflineQueue() {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
}