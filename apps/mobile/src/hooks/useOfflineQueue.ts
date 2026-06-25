import { useCallback, useState } from 'react';

import { apiRequest } from '../api/client';
import {
  getOfflineQueue,
  queueOfflineRequest,
  removeOfflineQueueItem,
} from '../storage/offlineQueue';

export function useOfflineQueue() {
  const [flushing, setFlushing] = useState(false);

  async function queueRequest(method: 'POST' | 'PATCH', path: string, payload: any) {
    return queueOfflineRequest({
      method,
      path,
      payload,
    });
  }

  const flushQueue = useCallback(async () => {
    setFlushing(true);

    try {
      const items = await getOfflineQueue();

      for (const item of items) {
        await apiRequest(item.path, {
          method: item.method,
          body: JSON.stringify(item.payload),
        });

        await removeOfflineQueueItem(item.id);
      }
    } finally {
      setFlushing(false);
    }
  }, []);

  return {
    flushing,
    queueRequest,
    flushQueue,
  };
}