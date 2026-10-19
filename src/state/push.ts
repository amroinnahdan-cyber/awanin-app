import { useSyncExternalStore } from 'react';

export type PushStatus = 'idle' | 'syncing' | 'connected' | 'unsupported' | 'error';

export type PushState = {
  status: PushStatus;
  message: string;
  token: string | null;
  deviceId: string | null;
  lastSyncedAt: string | null;
};

let state: PushState = {
  status: 'idle',
  message: 'Belum tersambung ke backend',
  token: null,
  deviceId: null,
  lastSyncedAt: null,
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PushState {
  return state;
}

export function usePushState(): PushState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getPushState(): PushState {
  return state;
}

export function setPushState(patch: Partial<PushState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}
