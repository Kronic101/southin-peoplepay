import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  OfflineQueueItem,
  getOfflineQueue,
  syncOfflineQueue,
} from '../storage/offlineQueue';

export function useOfflineQueue(options?: {
  autoSync?: boolean;
  intervalMs?: number;
}) {
  const autoSync = options?.autoSync ?? false;
  const intervalMs = options?.intervalMs ?? 30000;

  const mountedRef = useRef(true);
  const queueSnapshotRef = useRef('');

  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState('');
  const [lastSyncError, setLastSyncError] = useState('');

  const refreshQueue = useCallback(async () => {
    const items = await getOfflineQueue();
    const snapshot = JSON.stringify(items);

    if (!mountedRef.current) {
      return items;
    }

    if (snapshot !== queueSnapshotRef.current) {
      queueSnapshotRef.current = snapshot;
      setQueue(items);
    }

    return items;
  }, []);

  const syncQueue = useCallback(async () => {
    if (syncing) {
      return {
        synced: [],
        failed: [],
        remaining: queue,
      };
    }

    setSyncing(true);
    setLastSyncMessage('');
    setLastSyncError('');

    try {
      const result = await syncOfflineQueue();
      await refreshQueue();

      if (!mountedRef.current) {
        return result;
      }

      if (result.synced.length > 0) {
        setLastSyncMessage(`${result.synced.length} queued record(s) synced successfully.`);
      } else if (result.remaining.length > 0) {
        setLastSyncError(`${result.remaining.length} queued record(s) still pending sync.`);
      } else {
        setLastSyncMessage('No offline records pending sync.');
      }

      return result;
    } catch (error: any) {
      const currentQueue = await refreshQueue();

      if (mountedRef.current) {
        setLastSyncError(error?.message || 'Offline queue sync failed.');
      }

      return {
        synced: [],
        failed: [],
        remaining: currentQueue,
      };
    } finally {
      if (mountedRef.current) {
        setSyncing(false);
      }
    }
  }, [queue, refreshQueue, syncing]);

  useEffect(() => {
    mountedRef.current = true;

    refreshQueue();

    if (!autoSync) {
      return () => {
        mountedRef.current = false;
      };
    }

    const timer = setInterval(() => {
      syncQueue();
    }, intervalMs);

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [autoSync, intervalMs, refreshQueue, syncQueue]);

  const stats = useMemo(() => {
    return {
      total: queue.length,
      inspections: queue.filter((item) => item.type === 'FLEET_INSPECTION').length,
      defects: queue.filter((item) => item.type === 'FLEET_DEFECT').length,
      trips: queue.filter((item) => item.type === 'FLEET_TRIP').length,
      fuel: queue.filter((item) => item.type === 'FLEET_FUEL').length,
      assets: queue.filter((item) => item.type.startsWith('ASSET_')).length,
    };
  }, [queue]);

  return {
    queue,
    stats,
    syncing,
    lastSyncMessage,
    lastSyncError,
    refreshQueue,
    syncQueue,
  };
}