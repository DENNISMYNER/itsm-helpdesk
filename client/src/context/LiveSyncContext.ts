import { createContext, useContext } from 'react';

/** Ids of tickets that just changed (via Socket.io); the ticket table highlights them briefly. */
export const LiveSyncContext = createContext<ReadonlySet<string>>(new Set());

export function useRecentlyChanged(): ReadonlySet<string> {
  return useContext(LiveSyncContext);
}
